const updateParserState = (state, index, result) => ({ ...state, index, result });
const updateParserResult = (state, result) => ({ ...state, result });
const updateParserError = (state, errorMsg) => ({ ...state, isError: true, error: errorMsg });

class dParser {
  constructor(parserStateTransformerFunction) {
    this.parserStateTransformerFunction = parserStateTransformerFunction;
  }
  
  run = (targetString) => {
    const initialState = { targetString, index: 0, result: null, isError: false, error: null };
    return this.parserStateTransformerFunction(initialState);
  }

  map(fn) {
    return new dParser(parserState => {
      const nextState = this.parserStateTransformerFunction(parserState);
      if (nextState.isError) return nextState;
      return updateParserResult(nextState, fn(nextState.result));
    });
  }

  chain(fn) {
    return new dParser(parserState => {
      const nextState = this.parserStateTransformerFunction(parserState);
      if (nextState.isError) return nextState;
      const nextParser = fn(nextState.result);
      return nextParser.parserStateTransformerFunction(nextState);
    });
  }

  errorMap(fn) {
    return new dParser(parserState => {
      const nextState = this.parserStateTransformerFunction(parserState);
      if (!nextState.isError) return nextState;
      return updateParserError(nextState, fn(nextState.result, nextState.index));
    });
  }
}

const str = s => new dParser(parserState => {
  const { targetString, index, isError } = parserState;
  if (isError) return parserState;

  const slicedTarget = targetString.slice(index);
  if (slicedTarget.length === 0) {
    return updateParserError(parserState, `Unexpected end of input`);
  }
  if (slicedTarget.startsWith(s)) {
    return updateParserState(parserState, index + s.length, s);
  }
  return updateParserError(parserState, `Expected '${s}' at index ${index}`);
});

const regexParser = regex => new dParser(parserState => {
  const { targetString, index, isError } = parserState;
  if (isError) return parserState;

  const slicedTarget = targetString.slice(index);
  if (slicedTarget.length === 0) {
    return updateParserError(parserState, `Unexpected end of input`);
  }
  
  const match = slicedTarget.match(regex);
  if (match) {
    return updateParserState(parserState, index + match[0].length, match[0]);
  }
  return updateParserError(parserState, `Regex did not match at index ${index}`);
});

const sequenceOf = parsers => new dParser(parserState => {
  if (parserState.isError) return parserState;
  const results = [];
  let nextState = parserState;
  for (let p of parsers) {
    nextState = p.parserStateTransformerFunction(nextState);
    results.push(nextState.result);
    if (nextState.isError) return nextState; // Fail fast
  }
  return updateParserResult(nextState, results);
});

const choice = parsers => new dParser(parserState => {
  if (parserState.isError) return parserState;
  for (let p of parsers) {
    const nextState = p.parserStateTransformerFunction(parserState);
    if (!nextState.isError) return nextState;
  }
  return updateParserError(parserState, `Choice parser failed to match any options`);
});

const many = parser => new dParser(parserState => {
  if (parserState.isError) return parserState;
  const results = [];
  let nextState = parserState;
  let done = false;
  while (!done) {
    let testState = parser.parserStateTransformerFunction(nextState);
    if (!testState.isError) {
      results.push(testState.result);
      nextState = testState;
    } else {
      done = true;
    }
  }
  return updateParserResult(nextState, results);
});

const optional = parser => new dParser(parserState => {
  if (parserState.isError) return parserState;
  const nextState = parser.parserStateTransformerFunction(parserState);
  if (nextState.isError) {
    // If it fails, return the original state but with a null result
    return updateParserResult(parserState, null);
  }
  return nextState;
});

// --- Aventura Syntax Parsers ---
const leftTag = str('<');
const rightTag = str('>');
const hashTag = str('#');

// 1. Tag names can now include dots (e.g., hero.name)
const tagName = regexParser(/^[a-zA-Z0-9_.]+/); 

const transformList = regexParser(/^[a-zA-Z,]+/); 
const transformsParser = sequenceOf([hashTag, transformList, hashTag]).map(res => res[1].split(','));

const nonTerminalParser = sequenceOf([leftTag, tagName, optional(transformsParser), rightTag]).map(res => ({
  type: 'non-terminal',
  value: res[1],
  transforms: res[2] || [] 
}));

// 2. NEW: Dynamic Rule Parser ($hero$[name:animal,-trait:adjective])
const dollarTag = str('$');
const leftBracket = str('[');
const rightBracket = str(']');
const assignmentInner = regexParser(/^[^\]]+/); // Grabs everything inside [ ]

const dynamicRuleParser = sequenceOf([
  dollarTag,
  regexParser(/^[a-zA-Z0-9_]+/), // variable name (no dots here)
  dollarTag,
  leftBracket,
  assignmentInner,
  rightBracket
]).map(res => {
  // Parse the key:value pairs
  const pairs = res[4].split(',').map(pair => {
    const [k, v] = pair.split(':');
    const cleanKey = k.trim();
    return { 
      key: cleanKey.startsWith('-') ? cleanKey.substring(1) : cleanKey, // Remove the minus for the memory key
      rule: v.trim(),
      isDestructive: cleanKey.startsWith('-')
    };
  });
  
  return {
    type: 'dynamic-rule',
    variableName: res[1],
    assignments: pairs
  };
});

// 3. Terminals: Grab text until we hit a '<' or a '$'
const textChunkParser = regexParser(/^[^<$]+/);
// But also allow literal '$' if they aren't part of a dynamic rule (like "costs $5")
const literalDollar = str('$'); 
const literalLeftAngle = str('<');

const terminalParser = choice([textChunkParser, literalDollar, literalLeftAngle]).map(res => ({
  type: 'terminal',
  value: res
}));

// Add dynamicRuleParser to the choice list! Order matters here.
const aventuraRuleParser = many(choice([dynamicRuleParser, nonTerminalParser, terminalParser]));

function parseAventuraRule(ruleString) {
  return aventuraRuleParser.run(ruleString);
}

async function loadJSON(path) {
  const response = await fetch(path);
  return await response.json();
}

function getRandomPick(arr) {
  // Fallback if no valid probabilities
  if (!arr.prob || !Array.isArray(arr.prob) || arr.prob.length !== arr.length) {
    const index = Math.floor(Math.random() * arr.length);
    return { element: arr[index], index };
  }

  const totalWeight = arr.prob.reduce((sum, weight) => sum + weight, 0);
  const randomThreshold = Math.random() * totalWeight;

  let weightAccumulator = 0;
  for (let i = 0; i < arr.length; i++) {
    weightAccumulator += arr.prob[i];
    if (randomThreshold <= weightAccumulator) {
      return { element: arr[i], index: i };
    }
  }

  return { element: arr[arr.length - 1], index: arr.length - 1 };
}

function applyTransforms(text, transforms) {
  let result = text;
  
  for (const t of transforms) {
    if (t === 'ALLCAPS') {
      result = result.toUpperCase();
    } else if (t === 'CAPITALIZE') {
      // Capitalizes the first letter of the string
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
  }
  
  return result;
}

function buildMarkovModel(text, ngram = 1, separator = " ") {
  // Clean the text
  let cleanedText = text.replace(/([,:.;])/g, " $1").replace(/[()\¿¡!?”“—-]/g, "").toLowerCase();
  
  const words = cleanedText.split(separator);
  const fragments = {};

  // Build the frequency map
  for (let i = 0; i < words.length - ngram; i++) {
    let f = "";
    for (let j = 0; j < ngram; j++) {
      f += j === 0 ? words[i + j] : " " + words[i + j];
    }

    if (fragments[f] === undefined) { fragments[f] = {}; }
    const nextWord = words[i + ngram];

    if (fragments[f][nextWord] === undefined) {
      fragments[f][nextWord] = 1;
    } else {
      fragments[f][nextWord]++;
    }
  }

  // Calculate normalized probabilities
  const mProbs = {};
  for (let f of Object.keys(fragments)) {
    const keys = Object.keys(fragments[f]);
    mProbs[f] = { probs: [], grams: keys };

    let sum = 0;
    for (let i = 0; i < keys.length; i++) {
      sum += fragments[f][keys[i]];
    }
    for (let i = 0; i < keys.length; i++) {
      mProbs[f].probs[i] = fragments[f][keys[i]] / sum;
    }
  }

  return mProbs;
}

// src/StoryEngine.js

class StoryEngine {
  constructor(grammarEngine) {
    this.grammar = grammarEngine;
    this.scenes = {};
    this.currentScene = null;
    this.onSceneChange = null; // The event hook for the UI

    this.storyContext = {};
  }

  resetContext() {
    this.storyContext = {};
  }

  // --- DATA NORMALIZATION BOUNDARY ---
  // Converts all possible Spanish keys into strict English internal keys
  _normalizeScenes(rawScenes) {
    const normalized = {};
    for (const [key, scene] of Object.entries(rawScenes)) {
      normalized[key] = {
        key: key,
        text: scene.text !== undefined ? scene.text : scene.texto,
        scene: scene.scene !== undefined ? scene.scene : scene.escena,
        image: scene.image !== undefined ? scene.image : scene.imagen,
        deadEnd: scene.deadEnd !== undefined ? scene.deadEnd : scene.sinSalida,
        plop: scene.plop,
        title: scene.title !== undefined ? scene.title : scene.titulo,
        
        // Normalize areas
        areas: scene.areas ? scene.areas.map(a => ({
          x: a.x, y: a.y, w: a.w, h: a.h,
          btn: a.btn,
          text: a.text !== undefined ? a.text : a.texto,
          scene: a.scene !== undefined ? a.scene : a.escena,
          tooltip: a.tooltip
        })) : undefined,
        
        // Normalize options
        options: (scene.options || scene.opciones) ? (scene.options || scene.opciones).map(o => ({
          btn: o.btn,
          text: o.text !== undefined ? o.text : o.texto,
          scene: o.scene !== undefined ? o.scene : o.escena,
          image: o.image !== undefined ? o.image : o.imagen
        })) : undefined
      };

      // Clean up undefined properties to keep the memory footprint small
      Object.keys(normalized[key]).forEach(k => normalized[key][k] === undefined && delete normalized[key][k]);
    }
    return normalized;
  }

  setScenes(scenes) {
    // Normalize at the gate! The rest of the engine only sees English keys now.
    this.scenes = this._normalizeScenes(scenes);
    return this;
  }

  goToScene(sceneId) {
    const scene = this.scenes[sceneId];
    if (!scene) {
      console.error(`Aventura Engine: Scene "${sceneId}" not found.`);
      return;
    }
    this._dispatchScene(sceneId, scene);
  }

  playDynamicScene(option) {
    // Creates a temporary scene on the fly for buttons that have their own text
    const tempScene = {
      text: option.text,
      scene: option.scene,
      image: option.image
    };
    this._dispatchScene(`temp_${Math.random().toString(36).substr(2, 5)}`, tempScene);
  }

  _dispatchScene(sceneId, scene) {
    this.currentScene = sceneId;

    // Process the generative text using the grammar engine (if attached)
    const parsedText = this.grammar ? this.grammar.expandText(scene.text || '', this.storyContext) : (scene.text || '');

    // Package the strict, normalized state for the UI layer
    const sceneState = {
      id: sceneId,
      rawScene: scene,
      parsedText: parsedText,
      options: scene.options, 
      image: scene.image,     
      areas: scene.areas,
      deadEnd: scene.deadEnd
    };

    // Announce the change to the outside world
    if (this.onSceneChange) {
      this.onSceneChange(sceneState);
    }
  }

  testScenes() {
    if (!this.scenes || Object.keys(this.scenes).length === 0) {
      console.error("Aventura Engine: There are no scenes to test.");
      return this;
    }

    const deadEnds = [];
    
    // Because of normalization, we only have to check English keys here!
    for (const [key, scene] of Object.entries(this.scenes)) {
      if (scene.options) {
        for (const opt of scene.options) {
          if (!this.scenes[opt.scene]) {
            deadEnds.push(`${key} => [${opt.btn}] => ${opt.scene}`);
          }
        }
      } else if (!scene.deadEnd) {
        if (scene.scene && !this.scenes[scene.scene]) {
          deadEnds.push(`${key} => ${scene.scene}`);
        }
      }
    }

    if (deadEnds.length > 0) {
      console.error(`Aventura Engine: The following scenes are dead ends:\n  - ${deadEnds.join("\n  - ")}`);
    } else {
      console.log("Aventura Engine: Scene test passed! No dead ends found.");
    }
    return this;
  }
}

// src/StoryUI.js

class StoryUI {
  constructor(lang, options, storyEngine) {
    this.lang = lang;
    this.options = options;
    this.engine = storyEngine; 
    this.container = null;
    this.storyPreload = {};
  }

  init() {
    if (this.options.defaultCSS) this._injectThemeCSS();

    const parent = this.options.adventureContainer ? document.getElementById(this.options.adventureContainer) : document.body;
    this.container = document.getElementById("storygeneraldiv");
    
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "storygeneraldiv";
      this.container.className = "storygeneraldiv"; 
      parent.appendChild(this.container);
    }
  }

  preloadImages(scenes) {
    for (const key of Object.keys(scenes)) {
      const im = scenes[key].image || scenes[key].imagen;
      if (im && !this.storyPreload[im]) {
        this.storyPreload[im] = new Image();
        this.storyPreload[im].src = im;
      }
    }
  }

  render(sceneState) {
    if (!this.container) return;

    // Handle scrolling vs replacing
    if (!this.options.adventureScroll || sceneState.rawScene.plop) {
      this.container.innerHTML = ''; 
    } else {
      // Remove interactive elements from previous scenes entirely
      const prevButtons = this.container.querySelectorAll('.storybutton-container');
      prevButtons.forEach(el => el.remove());
      
      const prevAreas = this.container.querySelectorAll('.storyimage-area');
      prevAreas.forEach(el => el.remove());
    }

    const storydiv = document.createElement("div");
    storydiv.className = "storydiv";
    this.container.appendChild(storydiv);  

    this._renderImageAndAreas(sceneState, storydiv);
    this._renderText(sceneState, storydiv);
  }

  _renderImageAndAreas(sceneState, storydiv) {
    const imgSrc = sceneState.image;
    if (!imgSrc) return;

    const imgContainer = document.createElement("div");
    imgContainer.className = "storyimage-container";
    storydiv.appendChild(imgContainer);

    const image = this.storyPreload[imgSrc] ? this.storyPreload[imgSrc].cloneNode() : new Image();
    image.src = imgSrc;
    image.className = "storyimage";
    imgContainer.appendChild(image);

    if (sceneState.areas && sceneState.areas.length > 0) {
      image.onload = () => {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", `0 0 ${image.naturalWidth} ${image.naturalHeight}`);
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("class", "story-svg-overlay"); 

        for (const a of sceneState.areas) {
          const group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "storyimage-area"); 
          
          const rect = document.createElementNS(svgNS, "rect");
          rect.setAttribute("x", a.x - (a.w / 2));
          rect.setAttribute("y", a.y - (a.h / 2));
          rect.setAttribute("width", a.w);
          rect.setAttribute("height", a.h);
          group.appendChild(rect);

          if (a.btn) {
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", a.x);
            text.setAttribute("y", a.y);
            text.setAttribute("font-size", image.naturalHeight * 0.05); 
            text.textContent = a.btn;
            group.appendChild(text);
          }

          if (a.tooltip) {
            const title = document.createElementNS(svgNS, "title");
            title.textContent = a.tooltip;
            group.appendChild(title);
          }

          group.onclick = () => {
            const target = a.scene || a.escena;
            this.engine.goToScene(target);
          };

          svg.appendChild(group);
        }
        imgContainer.appendChild(svg);
      };
    }
  }

  async _renderText(sceneState, storydiv) {
    const paragraph = document.createElement("p");
    paragraph.className = "storyp";
    storydiv.appendChild(paragraph);

    if (this.options.adventureSlide) {
      this.container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    
    if (this.options.typewriterSpeed > 0) {
      let i = 0;
      let lastTime = 0;
      
      await new Promise(resolve => {
        const typeFrame = (time) => {
          if (!lastTime) lastTime = time;
          if (time - lastTime >= this.options.typewriterSpeed) {
            i++;
            
            const currentText = sceneState.parsedText.substring(0, i);
            
            // SECURITY: Safely inject text or allow HTML based on evalTags
            if (this.options.evalTags) {
              paragraph.innerHTML = currentText.replace(/\n/g, '<br>');
            } else {
              paragraph.textContent = currentText; 
            }
            
            lastTime = time;
          }
          if (i >= sceneState.parsedText.length) resolve();
          else requestAnimationFrame(typeFrame);
        };
        requestAnimationFrame(typeFrame);
      });
    } else {
      // Instant display
      if (this.options.evalTags) {
        paragraph.innerHTML = sceneState.parsedText.replace(/\n/g, '<br>');
      } else {
        paragraph.textContent = sceneState.parsedText;
      }
    }

    this._renderButtons(sceneState, storydiv);
  }

  _renderButtons(sceneState, storydiv) {
    const btns_container = document.createElement("div");
    btns_container.className = "storybutton-container";
    storydiv.appendChild(btns_container);

    if (sceneState.options) {
      for (const opt of sceneState.options) {
        const btn = document.createElement("button");
        btn.className = "storybutton";
        btn.textContent = opt.btn;
        btns_container.appendChild(btn);
        
        btn.addEventListener("click", () => {
          const intermediateText = opt.text || opt.texto;
          if (!intermediateText) {
            const target = opt.scene || opt.escena;
            this.engine.goToScene(target);
          } else {
            this.engine.playDynamicScene(opt);
          }
        });
      }
    } else if (!sceneState.deadEnd) {
      const target = sceneState.rawScene.scene || sceneState.rawScene.escena;
      const btn = document.createElement("button");
      btn.className = "storybutton";
      btn.textContent = this.lang === 'en' ? "Continue" : "Continuar";
      btns_container.appendChild(btn);
      
      btn.addEventListener("click", () => this.engine.goToScene(target));
    }

    if (this.options.adventureSlide) {
      this.container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  _injectThemeCSS() {
    if (document.getElementById('aventura-theme-styles')) return;

    const t = this.options.theme;
    const style = document.createElement('style');
    style.id = 'aventura-theme-styles';
    style.innerHTML = `
      :root {
        --av-bg: ${t.background}; --av-text: ${t.text}; --av-font: ${t.fontFamily};
        --av-accent-bg: ${t.accentBackground}; --av-accent-text: ${t.accentText};
        --av-btn-border: ${t.buttonBorder}; --av-radius: ${t.borderRadius};
        --av-container-border: ${t.containerBorder};
      }
      .storygeneraldiv { box-sizing: border-box; margin: auto; max-width: 600px; font-family: var(--av-font); background: var(--av-bg); color: var(--av-text); }
      .storydiv { box-sizing: border-box; width: 100%; display: flex; padding: 1em; flex-direction: column; border: var(--av-container-border); }
      .storyp { font-size: 1.1em; line-height: 1.5; min-height: 1.5em; white-space: pre-wrap; }
      .storybutton { background: var(--av-bg); color: var(--av-text); border: var(--av-btn-border); border-radius: var(--av-radius); margin: 0px 1em 1em 0px; padding: 0.5em 1em; font-size: 1em; font-family: var(--av-font); cursor: pointer; transition: all 0.2s ease; }
      .storybutton:hover { background: var(--av-accent-bg); color: var(--av-accent-text); }
      .storyimage-container { position: relative; width: 100%; margin: 1em auto; }
      .storyimage { width: 100%; display: block; border-radius: var(--av-radius); }
      .story-svg-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
      .storyimage-area rect { fill: rgba(255,255,255,0.8); stroke: var(--av-text); stroke-width: 2; cursor: pointer; transition: fill 0.2s ease; }
      .storyimage-area:hover rect { fill: var(--av-accent-bg); }
      .storyimage-area text { font-family: var(--av-font); fill: var(--av-text); text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
      .storyimage-area:hover text { fill: var(--av-accent-text); }
    `;
    document.head.appendChild(style);
  }
}

class Aventura {
  constructor(lang = 'es', options = {}) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : 'en';
    // Default options including the new theme system
    this.options = Object.assign({
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined,
      adventureScroll: false,
      adventureSlide: true,
      evalTags: false,
      theme: {
        background: '#ffffff',
        containerBorder: "solid 1px black",
        text: '#000000',
        fontFamily: '"Courier New", Courier, monospace',
        accentBackground: '#000000',
        accentText: '#ffffff',
        buttonBorder: 'solid 1px black',
        borderRadius: '0px' // Keep it sharp by default
      }
    }, options);

    // Core State
    this.grammar = {};
    this.markov = {};
    this.markovSeparator = " ";
    this.scenes = {};
    this.storyEngine = new StoryEngine(this);
    
    // Bilingual API Wrappers - Grammar
    this.fijarGramatica = this.setGrammar.bind(this);
    this.expandirGramatica = this.expandGrammar.bind(this);
    this.probarGramatica = this.testGrammar.bind(this);
    
    // Bilingual API Wrappers - Markov
    this.fijarMarkov = this.setMarkov.bind(this);
    this.cadenaMarkov = this.markovChain.bind(this);
    this.probarDistribucion = this.testDistribution.bind(this);

    // Bilingual API Wrappers - Interactive Story
    this.fijarEscenas = this.setScenes.bind(this);
    this.iniciarAventura = this.startAdventure.bind(this);
    this.probarEscenas = this.testScenes.bind(this);

    // Export Utilities for the user
    this.loadJSON = loadJSON;
  }

  /* CONTEXT FREE GRAMMAR */

  setGrammar(grammarObj) {
    this.grammar = JSON.parse(JSON.stringify(grammarObj));
    return this
  }

  testGrammar() {
    if (!this.grammar || Object.keys(this.grammar).length === 0) {
      console.error("There is no grammar to test.");
      return this;
    }

    this.grammarError = false;
    let errorCount = 0;
    
    // 1. Build an adjacency map of dependencies
    const dependencyGraph = {};

    for (const [key, rules] of Object.entries(this.grammar)) {
      if (!Array.isArray(rules)) continue; 
      dependencyGraph[key] = new Set(); // Using a Set to avoid duplicate checks

      for (const ruleString of rules) {
        const parsedState = parseAventuraRule(ruleString);
        if (parsedState.isError) {
          this.grammarError = true;
          errorCount++;
          console.error(`Syntax error in rule "${key}":`, parsedState.error);
          continue;
        }

        const deadEnds = [];
        for (const token of parsedState.result) {
          if (token.type === 'non-terminal' && !token.value.includes('.')) {
            if (!this.grammar[token.value]) deadEnds.push(token.value);
            else dependencyGraph[key].add(token.value); // Add valid dependency to graph
          } else if (token.type === 'dynamic-rule') {
            for (const assign of token.assignments) {
              if (assign.rule.includes('.')) continue;
              if (!this.grammar[assign.rule]) deadEnds.push(assign.rule);
              else dependencyGraph[key].add(assign.rule); // Add valid dependency to graph
            }
          }
        }

        if (deadEnds.length > 0) {
          this.grammarError = true;
          errorCount++;
          console.error(`The following rules, referenced in "${key}", do not exist: ${deadEnds.join(", ")}`);
        }
      }
    }

    // 2. Cycle Detection using Depth-First Search
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const detectCycle = (node) => {
      visited.add(node);
      recursionStack.add(node);

      if (dependencyGraph[node]) {
        for (const neighbor of dependencyGraph[node]) {
          if (!visited.has(neighbor)) {
            detectCycle(neighbor);
          } else if (recursionStack.has(neighbor)) {
            // We hit a node that is currently in our stack! That's a cycle.
            cycles.push(`${node} -> ${neighbor}`);
          }
        }
      }
      recursionStack.delete(node); // Remove from stack when we finish exploring its branches
    };

    // Run the cycle detector on every key in the graph
    for (const key of Object.keys(dependencyGraph)) {
      if (!visited.has(key)) {
        detectCycle(key);
      }
    }

    if (cycles.length > 0) {
      this.grammarError = true;
      errorCount += cycles.length;
      console.warn(`Warning: Circular dependencies detected! This may cause infinite loops during generation:`);
      cycles.forEach(cycle => console.warn(`  - ${cycle}`));
    }

    if (!this.grammarError) {
      console.log("Grammar test passed! No missing references or circular dependencies found.");
    } else {
      console.warn(`Grammar test finished with ${errorCount} error(s)/warning(s).`);
    }

    return this; 
  }

  expandText(rawText, context = this.storyContext, depth = 0) {
    // If no grammar is loaded, just return the plain text
    if (!this.grammar || Object.keys(this.grammar).length === 0) return rawText;

    const parsedState = parseAventuraRule(rawText);
    if (parsedState.isError) return rawText;

    let finalOutput = '';
    
    for (const token of parsedState.result) {
      if (token.type === 'terminal') {
        
        finalOutput += token.value;
      
      } else if (token.type === 'dynamic-rule') {
        
        context[token.variableName] = context[token.variableName] || {};
        for (const assign of token.assignments) {
          // Resolve the assignment and lock it into memory
          context[token.variableName][assign.key] = this.expandGrammar(assign.rule, context, assign.isDestructive, depth + 1);
        }

      } else if (token.type === 'non-terminal') {
        
        // Pass the tag back to expandGrammar!
        let expanded = this.expandGrammar(token.value, context, false, depth + 1);
        if (token.transforms.length > 0) {
          expanded = applyTransforms(expanded, token.transforms);
        }
        finalOutput += expanded;

      }
    }
    return finalOutput;
  }

  expandGrammar(startSymbol, context = this.storyContext, isDestructive = false, depth = 0) {
    if (depth > 100) {
      console.warn(`Aventura: Maximum recursion depth exceeded at <${startSymbol}>.`);
      return `[MAX_DEPTH_EXCEEDED: ${startSymbol}]`;
    }

    // Memory Lookup (e.g., squirrel.attribute)
    if (startSymbol.includes('.')) {
      const [varName, keyName] = startSymbol.split('.');
      if (context[varName] && context[varName][keyName]) {
        return context[varName][keyName]; // Return the locked-in word
      }
    }

    const rules = this.grammar[startSymbol];
    if (!rules || rules.length === 0) return `<${startSymbol}>`; 

    // Dictionary Lookup & Probability Rolling
    const pick = getRandomPick(rules);
    const randomRule = pick.element;
    
    if (isDestructive) {
      rules.splice(pick.index, 1); 
      if (rules.prob) rules.prob.splice(pick.index, 1); 
    }

    // ELEGANCE: Instead of duplicating the parsing loop here, 
    // we simply pass the chosen string back to expandText!
    return this.expandText(randomRule, context, depth);
  }

  /* MARKOV */

  async markovModel(filename, ngram = 1, save = false) {
    const text = await (await fetch(filename)).text();
    const model = buildMarkovModel(text, ngram, this.markovSeparator);
    
    if (save) {
      const filenameParts = filename.split('/');
      const cleanName = filenameParts[filenameParts.length - 1].split('.')[0];
      saveJSON(model, `${cleanName}_markovModel_${ngram}N.json`);
    }
    
    return model;
  }

  setMarkov(model) {
    this.markov = model;
    return this; // Chainable!
  }

  testDistribution() {
    if (!this.markov || Object.keys(this.markov).length === 0) {
      console.error("No Markov model loaded to test.");
      return this;
    }

    const distributions = {};
    const values = Object.values(this.markov);

    // Count the frequency of each probability value (rounded to nearest 0.05)
    for (const v of values) {
      for (const p of v.probs) {
        const aprox = (Math.round(p / 0.05) * 0.05).toFixed(2);
        
        if (distributions[aprox] === undefined) {
          distributions[aprox] = 1;
        } else {
          distributions[aprox]++;
        }
      }
    }

    console.log("------------------------------------ DIST ------------------------------------");
    const max = Math.max(...Object.values(distributions));
    
    // Sort by the probability bucket (0.00, 0.05, 0.10, etc.)
    const sorted = Object.entries(distributions).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    
    for (const [aprox, count] of sorted) {
      // Create the ASCII bar chart based on the maximum frequency
      const bar = "|".repeat(Math.ceil((count * 100) / max));
      console.log(`${aprox}... ${bar}`);
    }
    console.log("------------------------------------ DIST ------------------------------------");

    return this; // Chainable
  }

  markovChain(chainLength, seed, newLineProbability = 0.1) {
    if (!this.markov || Object.keys(this.markov).length === 0) return "";

    let result = (seed === undefined || this.markov[seed] === undefined) ? this._randomMarkovWord() : seed;
    let currentGram = result;
  
    for (let chain = 0; chain < chainLength - 1; chain++) {
      let nextWord = this._getNextMarkov(this.markov[currentGram]);
      
      if (nextWord === undefined) {
        // If we hit a dead end, pick a random word to keep the chain alive
        nextWord = this._getNextMarkov(this.markov[this._randomMarkovWord()]);
      }
      
      let tempList = currentGram.split(this.markovSeparator);
      tempList.push(nextWord);
      tempList = tempList.slice(1).join(this.markovSeparator);
      currentGram = tempList;
      
      result += `${this.markovSeparator}${nextWord}`;
    }
  
    return this._formatMarkov(result, newLineProbability);
  }

  // --- INTERNAL MARKOV UTILITIES ---

  _randomMarkovWord() {
    const keys = Object.keys(this.markov);
    const choice = Math.floor(Math.random() * keys.length);
    return keys[choice];
  }

  _getNextMarkov(data) {
    if (data === undefined) return undefined;
    const rnd = Math.random();
    let count = 0;
    for (let i = 0; i < data.probs.length; i++) {
      if (count <= rnd && rnd < count + data.probs[i]) {
        return data.grams[i];
      }
      count += data.probs[i];
    }
    return data.grams[data.grams.length - 1]; // Fallback
  }

  _formatMarkov(str, newLineProbability = 0.1) {
    let formatted = str.replace(/ ([,:.;])/g, "$1");
    formatted = formatted.replaceAll(/([.]) ([\wáéíóú])/ig, (match, c1, c2) => {
      const rnd = Math.random();
      if (rnd < newLineProbability) {
        return `.\n${c2.toUpperCase()}`;
      } else {
        return `. ${c2.toUpperCase()}`;
      }
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  setScenes(scenes) {
    this.storyEngine.setScenes(scenes);
    return this; 
  }

  testScenes() {
    this.storyEngine.testScenes();
    return this;
  }

  startAdventure(startSymbol) {
    // 1. Create the default UI (Batteries Included)
    const defaultUI = new StoryUI(this.lang, this.options, this.storyEngine);
    
    // 2. Preload images based on the normalized data
    defaultUI.preloadImages(this.storyEngine.scenes);
    defaultUI.init();

    // 3. Connect the Engine to the UI
    this.storyEngine.onSceneChange = (sceneState) => {
      defaultUI.render(sceneState);
    };

    // 4. Kick off the story
    this.storyEngine.goToScene(startSymbol);
    
    return this;
  }
}

export { Aventura as default };
