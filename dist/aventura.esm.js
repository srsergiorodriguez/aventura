async function loadJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Aventura couldn't load the file. Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Aventura Error: Failed to load JSON from "${url}".\n`, error);
    return null;
  }
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

/**
 * GrammarEngine
 * Handles the parsing and expansion of Context-Free Grammars. 
 * Supports recursive tag expansion, dynamic variable assignment, and transformation rules.
 */
class GrammarEngine {
  constructor() {
    this.grammar = {};
  }

  /**
   * Loads a parsed JSON grammar object into the engine.
   * @param {Object} grammarObj - The grammar dictionary.
   */
  setGrammar(grammarObj) {
    this.grammar = JSON.parse(JSON.stringify(grammarObj));
    return this;
  }

  /**
   * Validates the loaded grammar. Checks for missing non-terminal references
   * and uses a Depth-First Search (DFS) to detect infinite circular dependencies.
   */
  testGrammar() {
    this.grammarReport = { errors: [], warnings: [], passed: true };

    if (!this.grammar || Object.keys(this.grammar).length === 0) {
      this.grammarReport.errors.push({ code: "NO_GRAMMAR" });
      this.grammarReport.passed = false;
      return this;
    }

    // EDGE CASE: The root is an array instead of an object mapping
    if (Array.isArray(this.grammar) || typeof this.grammar !== 'object') {
      this.grammarReport.errors.push({ code: "INVALID_ROOT" });
      this.grammarReport.passed = false;
      return this;
    }

    let grammarError = false;
    let errorCount = 0;
    const dependencyGraph = {};

    for (const [key, rules] of Object.entries(this.grammar)) {
      // EDGE CASE: The rule is a string, number, or object instead of an Array
      if (!Array.isArray(rules)) {
        grammarError = true;
        errorCount++;
        this.grammarReport.errors.push({ code: "INVALID_RULE_TYPE", rule: key });
        continue;
      }
      
      // EDGE CASE: The array is perfectly formatted, but completely empty
      if (rules.length === 0) {
        errorCount++;
        this.grammarReport.warnings.push({ code: "EMPTY_RULE", rule: key });
        continue;
      }

      dependencyGraph[key] = new Set(); 

      for (const ruleString of rules) {
        const parsedState = parseAventuraRule(ruleString);
        if (parsedState.isError) {
          grammarError = true;
          errorCount++;
          
          this.grammarReport.errors.push({ 
            code: "SYNTAX_ERROR", 
            rule: key, 
            details: parsedState.error 
          });
          console.error(`Syntax error in rule "${key}": ${parsedState.error}`);
          continue;
        }

        const deadEnds = [];
        for (const token of parsedState.result) {
          if (token.type === 'non-terminal' && !token.value.includes('.')) {
            if (!this.grammar[token.value]) deadEnds.push(token.value);
            else dependencyGraph[key].add(token.value); 
          } else if (token.type === 'dynamic-rule') {
            for (const assign of token.assignments) {
              if (assign.rule.includes('.')) continue;
              if (!this.grammar[assign.rule]) deadEnds.push(assign.rule);
              else dependencyGraph[key].add(assign.rule); 
            }
          }
        }

        if (deadEnds.length > 0) {
          grammarError = true;
          errorCount++;
          
          this.grammarReport.errors.push({ 
            code: "MISSING_REF", 
            rule: key, 
            missing: deadEnds 
          });
          console.error(`The following rules, referenced in "${key}", do not exist: ${deadEnds.join(", ")}`);
        }
      }
    }

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
            cycles.push(`${node} -> ${neighbor}`);
          }
        }
      }
      recursionStack.delete(node); 
    };

    for (const key of Object.keys(dependencyGraph)) {
      if (!visited.has(key)) detectCycle(key);
    }

    if (cycles.length > 0) {
      grammarError = true;
      errorCount += cycles.length;
      console.warn(`Warning: Circular dependencies detected! This may cause infinite loops:`);
      cycles.forEach(cycle => {
        this.grammarReport.warnings.push({ code: "CIRCULAR_DEP", cycle: cycle });
        console.warn(`  - ${cycle}`);
      });
    }

    if (!grammarError) {
      console.log("Grammar test passed! No missing references or circular dependencies found.");
    } else {
      this.grammarReport.passed = false;
      console.warn(`Grammar test finished with ${errorCount} error(s)/warning(s).`);
    }

    return this;
  }

  /**
   * Parses raw text, evaluates embedded grammar tags, and resolves variable assignments.
   * @param {string} rawText - The text string containing Aventura syntax.
   * @param {Object} context - The memory object for storing/retrieving dynamic variables.
   * @param {number} depth - Current recursion depth to prevent infinite loops.
   */
  expandText(rawText, context = {}, depth = 0) {
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
          context[token.variableName][assign.key] = this.expandGrammar(assign.rule, context, assign.isDestructive, depth + 1);
        }
      } else if (token.type === 'non-terminal') {
        let expanded = this.expandGrammar(token.value, context, false, depth + 1);
        if (token.transforms.length > 0) {
          expanded = applyTransforms(expanded, token.transforms);
        }
        finalOutput += expanded;
      }
    }
    return finalOutput;
  }

  /**
   * Resolves a specific grammar symbol by randomly selecting a valid rule.
   * @param {string} startSymbol - The key to look up in the grammar dictionary.
   * @param {Object} context - The memory object for dynamic variables.
   * @param {boolean} isDestructive - If true, removes the selected rule from the grammar.
   * @param {number} depth - Current recursion depth.
   */
  expandGrammar(startSymbol, context = {}, isDestructive = false, depth = 0) {
    if (depth > 100) {
      console.warn(`Aventura: Maximum recursion depth exceeded at <${startSymbol}>.`);
      return `[MAX_DEPTH_EXCEEDED: ${startSymbol}]`;
    }

    // Attempt to retrieve a saved variable from memory context
    if (startSymbol.includes('.')) {
      const [varName, keyName] = startSymbol.split('.');
      if (context[varName] && context[varName][keyName]) {
        return context[varName][keyName]; 
      }
    }

    const rules = this.grammar[startSymbol];
    if (!rules || rules.length === 0) return `<${startSymbol}>`; 

    const pick = getRandomPick(rules);
    const randomRule = pick.element;
    
    if (isDestructive) {
      rules.splice(pick.index, 1); 
      if (rules.prob) rules.prob.splice(pick.index, 1); 
    }

    return this.expandText(randomRule, context, depth);
  }
}

/**
 * MarkovEngine
 * Handles the generation, storage, and traversal of n-gram Markov Chains 
 * for procedural text generation.
 */
class MarkovEngine {
  constructor() {
    this.markov = {};
    this.markovSeparator = " ";
  }

  /**
   * Fetches a text file and builds a new Markov model.
   * @param {string} filename - The URL path to the source text file.
   * @param {number} ngram - The n-gram depth for the chain (default: 1).
   * @param {Function} saveJSONCallback - Optional callback to save the generated model.
   */
  async buildModel(filename, ngram = 1, saveJSONCallback = null) {
    const response = await fetch(filename);
    const text = await response.text();
    const model = this._buildMarkovModel(text, ngram, this.markovSeparator);
    
    if (saveJSONCallback) {
      const filenameParts = filename.split('/');
      const cleanName = filenameParts[filenameParts.length - 1].split('.')[0];
      saveJSONCallback(model, `${cleanName}_markovModel_${ngram}N.json`);
    }
    
    return model;
  }

  /**
   * Internal parser that calculates token frequencies and normalizes probabilities.
   */
  _buildMarkovModel(text, ngram = 1, separator = " ") {
    // Clean and normalize the source text
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

  /**
   * Loads a pre-compiled JSON Markov model into the engine.
   */
  setModel(model) {
    this.markov = model;
    return this;
  }

  /**
   * Generates a console-based ASCII bar chart mapping the distribution 
   * of probabilities within the currently loaded model.
   */
  testDistribution() {
    if (!this.markov || Object.keys(this.markov).length === 0) {
      console.error("No Markov model loaded to test.");
      return this;
    }

    const distributions = {};
    const values = Object.values(this.markov);

    for (const v of values) {
      for (const p of v.probs) {
        const aprox = (Math.round(p / 0.05) * 0.05).toFixed(2);
        if (distributions[aprox] === undefined) distributions[aprox] = 1;
        else distributions[aprox]++;
      }
    }

    console.log("------------------------------------ DIST ------------------------------------");
    const max = Math.max(...Object.values(distributions));
    const sorted = Object.entries(distributions).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    
    for (const [aprox, count] of sorted) {
      const bar = "|".repeat(Math.ceil((count * 100) / max));
      console.log(`${aprox}... ${bar}`);
    }
    console.log("------------------------------------ DIST ------------------------------------");

    return this;
  }

  /**
   * Traverses the Markov model to generate a procedural text chain.
   * @param {number} chainLength - The total number of words to generate.
   * @param {string} seed - The starting n-gram.
   * @param {number} newLineProbability - Chance (0-1) to inject a line break after a period.
   */
  generateChain(chainLength, seed, newLineProbability = 0.1) {
    if (!this.markov || Object.keys(this.markov).length === 0) return "";

    let result = (seed === undefined || this.markov[seed] === undefined) ? this._randomMarkovWord() : seed;
    let currentGram = result;
  
    for (let chain = 0; chain < chainLength - 1; chain++) {
      let nextWord = this._getNextMarkov(this.markov[currentGram]);
      
      if (nextWord === undefined) {
        // Fallback: Pick a random node if the chain hits a dead end
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
    return data.grams[data.grams.length - 1]; 
  }

  _formatMarkov(str, newLineProbability) {
    let formatted = str.replace(/ ([,:.;])/g, "$1");
    formatted = formatted.replaceAll(/([.]) ([\wáéíóú])/ig, (match, c1, c2) => {
      if (Math.random() < newLineProbability) return `.\n${c2.toUpperCase()}`;
      return `. ${c2.toUpperCase()}`;
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}

/**
 * StoryEngine
 * A headless state machine that manages scene transitions, memory context,
 * and data normalization for interactive narratives. It broadcasts state 
 * changes to the UI layer without interacting with the DOM.
 */
class StoryEngine {
  constructor(grammarEngine) {
    this.grammar = grammarEngine;
    this.scenes = {};
    this.currentScene = null;
    this.previousScene = null;
    this.onSceneChange = null;

    // Navigation Context
    this.history = [];
    this.startSceneId = null;

    // Persists generative text variables across the lifespan of a single playthrough
    this.storyContext = {};
  }

  /**
   * Wipes the generative memory clean for a new playthrough.
   */
  resetContext() {
    this.storyContext = {};
  }

  /**
   * Schema Sanitization Gate.
   */
  _normalizeScenes(rawScenes) {
    const normalized = {};
    for (const [key, scene] of Object.entries(rawScenes)) {
      normalized[key] = {
        key: key,
        text: scene.text,
        scene: scene.scene,
        image: scene.image,
        deadEnd: scene.deadEnd,
        plop: scene.plop,
        title: scene.title,
        
        igrama: scene.igrama,
        viz: scene.viz,             
        dataScene: scene.dataScene, 
        meta: scene.meta,           

        areas: scene.areas ? scene.areas.map(a => ({
          x: a.x, y: a.y, w: a.w, h: a.h,
          btn: a.btn,
          text: a.text,
          scene: a.scene,
          tooltip: a.tooltip
        })) : undefined,
        
        options: scene.options ? scene.options.map(o => ({
          btn: o.btn,
          text: o.text,
          scene: o.scene,
          image: o.image
        })) : undefined
      };

      Object.keys(normalized[key]).forEach(k => normalized[key][k] === undefined && delete normalized[key][k]);
    }
    return normalized;
  }
  
  /**
   * Ingests, normalizes, and stores the scene graph.
   */
  setScenes(scenes) {
    this.scenes = this._normalizeScenes(scenes);
    return this;
  }

  /**
   * Validates and triggers a transition to a targeted scene.
   */
  goToScene(sceneId) {
    const scene = this.scenes[sceneId];
    if (!scene) {
      console.error(`Aventura Engine: Scene "${sceneId}" not found.`);
      return;
    }
    this._dispatchScene(sceneId, scene);
  }

  /**
   * Generates a temporary, intermediate scene for branching options.
   */
  playDynamicScene(option) {
    const tempScene = {
      text: option.text,
      scene: option.scene,
      image: option.image
    };
    this._dispatchScene(`temp_${Math.random().toString(36).substr(2, 5)}`, tempScene);
  }

  /**
   * Native Restart Function
   * Clears history, resets generative context, and boots the first scene.
   */
  restart() {
    if (!this.startSceneId) return;
    this.history = [];
    this.resetContext();
    this.goToScene(this.startSceneId);
  }

  /**
   * Native Back Function
   * Pops the history stack and dispatches the previous scene without logging it.
   */
  goBack() {
    if (this.history.length === 0) return;
    const prevSceneId = this.history.pop();
    const scene = this.scenes[prevSceneId];
    this._dispatchScene(prevSceneId, scene, true);
  }

  /**
   * The core state machine tick. Updates history, processes grammar, 
   * packages the state, and broadcasts to the UI layer.
   */
  _dispatchScene(sceneId, scene, isGoingBack = false) {
    // Record the absolute start scene on the very first dispatch
    if (!this.startSceneId) {
      this.startSceneId = sceneId;
    }

    if (this.currentScene !== sceneId) {
      this.previousScene = this.currentScene;
      
      // If we are moving forward, push the current scene to the history stack
      if (!isGoingBack && this.currentScene) {
        this.history.push(this.currentScene);
      }
    }
    
    this.currentScene = sceneId;

    if (scene.dataScene && this.previousScene) {
      scene.options = [{ btn: "<<<", scene: this.previousScene }];
    }

    const parsedText = this.grammar ? this.grammar.expandText(scene.text || '', this.storyContext) : (scene.text || '');

    // Terminal State Detection (Dead End)
    const hasOptions = scene.options && scene.options.length > 0;
    const hasAreaLinks = scene.areas && scene.areas.some(a => a.scene);
    const isTerminal = !hasOptions && !hasAreaLinks;

    const sceneState = {
      id: sceneId,
      rawScene: scene,
      parsedText: parsedText,
      options: scene.options, 
      image: scene.image,     
      areas: scene.areas,
      deadEnd: scene.deadEnd,
      
      // Broadcast navigational state to the UI layer
      canGoBack: this.history.length > 0,
      isTerminal: isTerminal
    };

    if (this.onSceneChange) {
      this.onSceneChange(sceneState);
    }
  }

  /**
   * Debugging utility to traverse the normalized scene graph and detect unreachable nodes.
   */
  testScenes() {
    if (!this.scenes || Object.keys(this.scenes).length === 0) {
      console.error("Aventura Engine: There are no scenes to test.");
      return this;
    }

    const deadEnds = [];
    
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

/**
 * StoryUI
 * The default presentation layer for Aventura. It acts as a "Batteries Included" 
 * UI that listens to the StoryEngine and dynamically generates the DOM elements, 
 * CSS styling, SVG interactive areas, and visual transitions.
 */
class StoryUI {
  constructor(lang, options, storyEngine) {
    this.lang = lang;
    this.options = options;
    this.engine = storyEngine; 
    this.container = null;
    this.storyPreload = {};
  }

  /**
   * Initializes the DOM environment, injecting required CSS variables
   * and establishing the main container for the story elements.
   */
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

  /**
   * Preloads static images into memory to prevent flickering during scene transitions.
   */
  preloadImages(scenes) {
    for (const key of Object.keys(scenes)) {
      const im = scenes[key].image || scenes[key].imagen;
      if (im && !this.storyPreload[im]) {
        this.storyPreload[im] = new Image();
        this.storyPreload[im].src = im;
      }
    }
  }

  /**
   * The primary render hook. Clears or prepares the container based on the 
   * scrolling settings, and orchestrates the rendering of media and text.
   */
  render(sceneState) {
    if (!this.container) return;

    // Handle single-view replacement vs. scrolling history
    if (!this.options.adventureScroll || sceneState.rawScene.plop) {
      this.container.innerHTML = ''; 
    } else {
      // Remove interactive elements from previous scenes to prevent retroactive branching
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

  /**
   * Evaluates the scene state and conditionally delegates rendering to the 
   * D3 DataEngine, the IgramaEngine, or standard static image handling.
   */
  async _renderImageAndAreas(sceneState, storydiv) {
    const imgSrc = sceneState.image;
    const igramaRule = sceneState.rawScene.igrama;
    const vizConfig = sceneState.rawScene.viz;

    if (!imgSrc && !igramaRule && !vizConfig) return;

    const imgContainer = document.createElement("div");
    imgContainer.className = "storyimage-container";
    storydiv.appendChild(imgContainer);

    let image;

    // Route 1: D3 Interactive Data Visualization
    if (vizConfig && this.engine.grammar.dataEngine) {
      const width = this.options.vizWidth || 600;
      const height = this.options.vizHeight || 500;
      
      const svgNode = this.engine.grammar.dataEngine.renderViz(
        vizConfig, 
        width, 
        height, 
        (target) => this.engine.goToScene(target) 
      );
      
      if (svgNode) imgContainer.appendChild(svgNode);

    // Route 2: Generative Canvas Drawing (Igrama)
    } else if (igramaRule && this.engine.grammar.igramaEngine) {
      image = new Image();
      image.className = "storyimage";
      imgContainer.appendChild(image);
      
      const layers = this.engine.grammar.expandIgrama(igramaRule);
      
      // Append generative attributes to the main text flow
      const extraText = this.engine.grammar.igramaText(layers);
      if (extraText) {
         sceneState.parsedText = extraText + "\n" + sceneState.parsedText;
      }

      const url = await this.engine.grammar.igramaDataUrl(layers, this.options.igramaFormat);
      image.src = url;

    // Route 3: Standard Static Image
    } else if (imgSrc) {
      image = this.storyPreload[imgSrc] ? this.storyPreload[imgSrc].cloneNode() : new Image();
      image.src = imgSrc;
      image.className = "storyimage";
      imgContainer.appendChild(image);
    }

    // Attach SVG overlay hitboxes if defined in the scene state
    if (image && sceneState.areas && sceneState.areas.length > 0) {
      const attachSVG = () => {
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

      // Ensure the image has layout dimensions before calculating the SVG coordinate space
      if (image.complete) {
        attachSVG();
      } else {
        image.onload = attachSVG;
      }
    }
  }

  /**
   * Processes the normalized text. Handles HTML evaluation security 
   * and orchestrates the asynchronous typewriter effect.
   */
  async _renderText(sceneState, storydiv) {
    const paragraph = document.createElement("p");
    paragraph.className = "storyp";
    storydiv.appendChild(paragraph);

    if (this.options.adventureSlide) {
      this.container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    
    // Typewriter effect handling
    if (this.options.typewriterSpeed > 0) {
      let i = 0;
      let lastTime = 0;
      
      await new Promise(resolve => {
        const typeFrame = (time) => {
          if (!lastTime) lastTime = time;
          if (time - lastTime >= this.options.typewriterSpeed) {
            i++;
            
            const currentText = sceneState.parsedText.substring(0, i);
            
            // Text injection logic based on security settings
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
      // Instant text rendering
      if (this.options.evalTags) {
        paragraph.innerHTML = sceneState.parsedText.replace(/\n/g, '<br>');
      } else {
        paragraph.textContent = sceneState.parsedText;
      }
    }

    this._renderButtons(sceneState, storydiv);
  }

  /**
   * Generates interactive buttons for scene traversal. 
   * Handles intermediate dynamic scenes, dead ends, and dynamic history navigation.
   */
  _renderButtons(sceneState, storydiv) {
    const btns_container = document.createElement("div");
    btns_container.className = "storybutton-container";
    storydiv.appendChild(btns_container);

    // --- 1. INJECT BACK BUTTON ---
    if (this.options.backBtn && sceneState.canGoBack) {
      const backBtn = document.createElement("button");
      backBtn.className = "storybutton";
      backBtn.textContent = "<<<";
      backBtn.addEventListener("click", () => this.engine.goBack());
      btns_container.appendChild(backBtn);
    }

    // --- 2. RENDER NORMAL OPTIONS ---
    if (sceneState.options && sceneState.options.length > 0) {
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
    } else if (!sceneState.deadEnd && !sceneState.isTerminal) {
      // Fallback continue button if a scene target is defined without explicit buttons
      const target = sceneState.rawScene.scene || sceneState.rawScene.escena;
      if (target) {
        const btn = document.createElement("button");
        btn.className = "storybutton";
        btn.textContent = ">>>";
        btns_container.appendChild(btn);
        btn.addEventListener("click", () => this.engine.goToScene(target));
      }
    }

    // --- 3. INJECT RESTART BUTTON ---
    if (this.options.restartBtn && sceneState.isTerminal) {
      const restartBtn = document.createElement("button");
      restartBtn.className = "storybutton btn-restart";
      restartBtn.textContent = "↻";
      restartBtn.addEventListener("click", () => this.engine.restart());
      btns_container.appendChild(restartBtn);
    }

    if (this.options.adventureSlide) {
      this.container.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  /**
   * Dynamically constructs and applies the CSS variables to the document head 
   * based on the Aventura initialization options.
   */
  _injectThemeCSS() {
    if (document.getElementById('aventura-theme-styles')) return;

    const t = this.options.theme;
    const style = document.createElement('style');
    style.id = 'aventura-theme-styles';
    
    style.innerHTML = `
      :root {
        --av-bg: ${t.background}; 
        --av-text: ${t.text}; 
        --av-font: ${t.fontFamily};
        --av-accent-bg: ${t.accentBackground}; 
        --av-accent-text: ${t.accentText};
        --av-btn-border: ${t.buttonBorder}; 
        --av-radius: ${t.borderRadius};
        --av-container-border: ${t.containerBorder};
        
        --av-btn-bg: ${t.buttonBg || t.background};
        --av-btn-text: ${t.buttonText || t.text};
        --av-btn-hover-bg: ${t.buttonHoverBg || t.accentBackground};
        --av-btn-hover-text: ${t.buttonHoverText || t.accentText};
      }
      
      .storygeneraldiv { 
        box-sizing: border-box; 
        margin: auto; 
        max-width: 600px; 
        font-family: var(--av-font); 
        background: var(--av-bg); 
        color: var(--av-text);
      }
      
      .storydiv { 
        box-sizing: border-box; 
        width: 100%; 
        display: flex; 
        padding: 1em; 
        flex-direction: column; 
        border: var(--av-container-border); 
      }
      
      .storyp { 
        font-size: 1.1em; 
        line-height: 1.5; 
        min-height: 1.5em; 
        white-space: pre-wrap; 
        margin-bottom: 1.5em; 
      }
      
      .storybutton { 
        background: var(--av-btn-bg); 
        color: var(--av-btn-text); 
        border: var(--av-btn-border); 
        border-radius: var(--av-radius); 
        margin: 0px 0.5em 0.5em 0px; 
        padding: 0.6em 1.2em; 
        font-size: 1em; 
        font-family: var(--av-font); 
        font-weight: bold;
        cursor: pointer; 
        transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.1s ease; 
      }
      
      /* The tactile pop-out effect */
      .storybutton:hover { 
        background: var(--av-btn-hover-bg); 
        color: var(--av-btn-hover-text);
        transform: translate(-2px, -2px);
        box-shadow: 4px 4px 0px var(--av-accent-bg);
      }
      
      .storyimage-container { 
        position: relative; 
        width: 100%; 
        margin: 1em auto; 
        border: 2px solid var(--av-text); /* Hard border on the image */
      }
      
      .storyimage { 
        width: 100%; 
        display: block; 
        border-radius: var(--av-radius); 
      }
      
      .story-svg-overlay { 
        position: absolute; 
        top: 0; left: 0; width: 100%; height: 100%; 
      }
      
      /* Updated areas to match the editor's dashed aesthetic */
      .storyimage-area rect { 
        fill: rgba(255, 255, 255, 0.3); 
        stroke: var(--av-text); 
        stroke-width: 2; 
        stroke-dasharray: 4 4; /* Dashed line */
        cursor: pointer; 
        transition: all 0.1s ease; 
      }
      
      .storyimage-area:hover rect { 
        fill: rgba(0, 191, 255, 0.2); /* Accent tint */
        stroke: var(--av-accent-bg); 
        stroke-dasharray: 0; /* Solid line on hover */
      }
      
      .storyimage-area text { 
        font-family: var(--av-font); 
        font-weight: bold;
        fill: var(--av-text); 
        text-anchor: middle; 
        dominant-baseline: middle; 
        pointer-events: none; 
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * IgramaEngine
 * A headless rendering engine for generative images (Igramas).
 * Processes context-free image grammars to produce composite HTML5 Canvases,
 * vector splines, and animated GIFs (via MiniGif).
 */
class IgramaEngine {
  constructor(grammarEngine) {
    this.textGrammarEngine = grammarEngine; 
    this.igrama = null;
    
    // Memory cache to prevent redundant fetching of external image assets
    this.imgsMemo = {};
    this.minigifOptions = {};
  }

  /**
   * Ingests the Igrama JSON configuration.
   */
  setIgrama(igramaObj) {
    this.igrama = igramaObj;
    return this;
  }

  // ==========================================
  // 1. GRAMMAR EXPANSION & PARSING
  // ==========================================

  expand(startSymbol) {
    if (!this.igrama || !this.igrama.grammar) return [];
    const rawString = this._resolveIgramaGrammar(startSymbol);
    return rawString.split('|').map(drawing => this.decodeDrawing(drawing));
  }

  _resolveIgramaGrammar(symbol, depth = 0) {
    if (depth > 100) return "";
    
    let lookup = symbol;
    if (symbol.startsWith('<') && symbol.endsWith('>')) {
      lookup = symbol.substring(1, symbol.length - 1);
    }

    const rules = this.igrama.grammar[lookup];
    if (!rules || rules.length === 0) return symbol; 

    const pick = getRandomPick(rules).element;

    return pick.replace(/<([^>]+)>/g, (match, innerTag) => {
      return this._resolveIgramaGrammar(innerTag, depth + 1);
    });
  }

  /**
   * Decodes proprietary Igrama syntax into executable layer objects.
   * Expected format: type%%content%%attribute
   */
  decodeDrawing(data) {
    if (!data || data === '') return [];
    
    const [type, content, attribute] = data.split('%%');
    let decoded = { type, attribute };

    if (type === 'vector') {
      decoded.content = content.split('**').map(doodle => {
        // NEW PARSER: Automatically supports both legacy formats and the new 2-Bit format
        const parts = doodle.split('&');
        const xy = [];
        
        xy.color = parts[0];
        xy.weight = parts[1];
        
        // If it's the new format, grab type and style. If legacy, default to stroke/solid.
        xy.type = parts.length > 3 ? parts[2] : 'stroke';
        xy.style = parts.length > 3 ? parts[3] : 'solid';
        
        const v = parts.length > 3 ? parts[4] : parts[2];
        if (!v) return xy;
        
        const flat = v.split(',');
        for (let i = 0; i < flat.length; i += 2) {
          xy.push([+flat[i], +flat[i + 1]]);
        }
        return xy;
      });
    } else {
      decoded.content = content; 
    }
    return decoded;
  }

  getText(layers) {
    return layers.filter(d => d.attribute).map(d => d.attribute).reverse().join(' ').trim();
  }

  // ==========================================
  // 2. RENDERING PIPELINE
  // ==========================================

  async getDataUrl(layers, format = 'png') {
    if (!this.igrama || !this.igrama.metadata) return '';

    const width = this.igrama.metadata.width;
    const height = this.igrama.metadata.height;
    
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = this.igrama.metadata.bg || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    await this.drawLayers(layers, ctx);

    let dataUrl = '';
    if (format === 'png') {
      dataUrl = canvas.toDataURL('image/png');
    } else if (format === 'gif') {
      if (typeof MiniGif === 'undefined') {
        console.error("Aventura: MiniGif library is required to export GIFs.");
      } else {
        const options = Object.assign({ colorResolution: 7, dither: false, delay: 50 }, this.minigifOptions);
        const gif = new MiniGif(options);   
        
        gif.addFrame(canvas); 
        
        const layerWiggle = this._getLayerWiggle(layers);
        ctx.fillStyle = this.igrama.metadata.bg || '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        await this.drawLayers(layerWiggle, ctx);
        gif.addFrame(canvas);
        
        const buffer = gif.makeGif();
        const base64 = await this._base64ArrayBuffer(buffer);
        dataUrl = "data:image/gif;base64," + base64;
      }
    }
    
    return dataUrl;
  }

  async drawLayers(layers, ctx) {
    for (const [index, layer] of layers.entries()) {
      if (layer.type === 'url' && this.igrama.sections && this.igrama.sections[index]) {
        const { w, h, x, y } = this.igrama.sections[index];
        
        if (!this.imgsMemo[layer.content]) {
          const img = new Image();
          img.src = layer.content;
          this.imgsMemo[layer.content] = await new Promise(resolve => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
          });
        }
        ctx.drawImage(this.imgsMemo[layer.content], x, y, w, h);
        
      } else if (layer.type === 'vector') {
        for (const doodle of layer.content) {
          if (doodle.length === 0) continue;
          const spline = this._getSpline(doodle);
          // Pass the new type and style properties to the drawing function
          this._drawSpline(spline, ctx, doodle.color, doodle.weight, doodle.type, doodle.style);        
        }
      }
    }
  }

  _drawSpline(spline, ctx, semanticColor, weight, type, style) {
    if (spline.length === 0) return;

    // 1. Resolve Semantic Color
    let actualHex = '#000000';
    if (semanticColor === 'white') actualHex = '#ffffff';
    else if (semanticColor === 'black') actualHex = '#000000';
    else if (semanticColor === 'accent' && this.igrama && this.igrama.metadata) {
      actualHex = this.igrama.metadata.accentColor || '#000000';
    } else if (semanticColor && semanticColor.startsWith('#')) {
      actualHex = semanticColor; // Legacy backwards compatibility
    }

    // 2. Generate the pattern (Solid or Hatching)
    const fillStyle = this._getPattern(ctx, actualHex, style);

    // 3. Create the Path
    ctx.beginPath();
    for (let i = 0; i < spline.length; i++) {
      if (i === 0) ctx.moveTo(...spline[0]);
      else ctx.lineTo(...spline[i]);
    }

    // 4. Fill or Stroke
    if (type === 'fill') {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    } else {
      ctx.strokeStyle = fillStyle;
      ctx.lineWidth = weight;
      ctx.stroke();
    }
  }

  /**
   * Generates a CanvasPattern for native Dither/Hatching fills
   */
  _getPattern(ctx, color, style) {
    if (style === 'solid') return color;
    
    // Safely check for window (in case Aventura runs in Node environments)
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    
    const pCanvas = document.createElement('canvas');
    const etchSize = 5; 
    
    pCanvas.width = etchSize * dpr;
    pCanvas.height = etchSize * dpr;
    const pCtx = pCanvas.getContext('2d');
    pCtx.scale(dpr, dpr);
    
    pCtx.strokeStyle = color;
    pCtx.lineWidth = 1; 
    pCtx.lineCap = 'square';
    
    pCtx.beginPath();
    pCtx.moveTo(0, etchSize);
    pCtx.lineTo(etchSize, 0);
    pCtx.stroke();
    
    pCtx.beginPath();
    pCtx.moveTo(-etchSize / 2, etchSize / 2);
    pCtx.lineTo(etchSize / 2, -etchSize / 2);
    pCtx.stroke();
    
    pCtx.beginPath();
    pCtx.moveTo(etchSize / 2, etchSize * 1.5);
    pCtx.lineTo(etchSize * 1.5, etchSize / 2);
    pCtx.stroke();
    
    const pattern = ctx.createPattern(pCanvas, 'repeat');
    if (typeof DOMMatrix !== 'undefined') {
      pattern.setTransform(new DOMMatrix().scale(1 / dpr, 1 / dpr));
    }
    
    return pattern;
  }

  _getSpline(points) {
    let spline = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p = [];
      p[0] = i > 0 ? points[i - 1] : points[0];
      p[1] = points[i];
      p[2] = points[i + 1];
      p[3] = i < points.length - 2 ? points[i + 2] : points[points.length -1];
      
      for (let t = 0; t < 1; t += 0.05) {
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * ((2 * p[1][0]) + (-p[0][0] + p[2][0]) * t + (2 * p[0][0] - 5 * p[1][0] + 4 * p[2][0] - p[3][0]) * t2 + (-p[0][0] + 3 * p[1][0] - 3 * p[2][0] + p[3][0]) * t3);
        const y = 0.5 * ((2 * p[1][1]) + (-p[0][1] + p[2][1]) * t + (2 * p[0][1] - 5 * p[1][1] + 4 * p[2][1] - p[3][1]) * t2 + (-p[0][1] + 3 * p[1][1] - 3 * p[2][1] + p[3][1]) * t3);
        spline.push([x, y]);     
      }
    }
    return spline;
  }

  _getLayerWiggle(layers) {
    const r = 3;
    const layerWiggle = JSON.parse(JSON.stringify(layers));
    const rndRng = (a, b) => Math.floor(a + (Math.random() * (b - a)));
    
    for (const [i, layer] of layerWiggle.entries()) {
      if (layer.type === 'vector') {
        for (const [j, doodle] of layer.content.entries()) {
          for (const v of doodle) {
            if (Math.random() < 0.5) v[0] += rndRng(-r, r);
            else v[1] += rndRng(-r, r);  
          }
          // Carry over all rendering properties to the Wiggle Frame
          doodle.color = layers[i].content[j].color;
          doodle.weight = layers[i].content[j].weight;
          doodle.type = layers[i].content[j].type;
          doodle.style = layers[i].content[j].style;
        }
      }
    }
    return layerWiggle;
  }

  async _base64ArrayBuffer(data) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",", 2)[1]);
      reader.readAsDataURL(new Blob([data]));
    });
  }
}

/**
 * DataEngine
 * A headless visualization engine designed for digital humanities and archival navigation.
 * Inspired by Aby Warburg's Mnemosyne Atlas, it processes tabular data to automatically 
 * generate interactive, D3-powered SVG visualizations and interconnected story scenes.
 */
class DataEngine {
  constructor(options) {
    this.options = options;
    this.data = [];
    this.metaKeys = [];
  }

  /**
   * Ingests archival data and automatically generates individual artifact scenes (`ind_[ID]`).
   * Injects these generated scenes directly into the StoryEngine's scene graph.
   */
  setupDataScenes(scenes, data, metaKeys) {
    const d3Instance = globalThis.d3 || window.d3;
    if (!d3Instance) {
      console.warn("Aventura: D3 library is required to use the Data Engine visualizations.");
      return scenes;
    }

    this.data = JSON.parse(JSON.stringify(data));
    this.metaKeys = metaKeys || [];

    for (const d of this.data) {
      if (d.ID === undefined) {
        console.error("Aventura: All data items must contain a unique 'ID' key.");
        break;
      }
      
      // Construct the individual artifact scene
      scenes[`ind_${d.ID}`] = {
        text: d.CONT || '',
        meta: d.ID, 
        dataScene: true, // Flags the StoryEngine to dynamically inject a "Go Back" button
        options: [] 
      };
      
      if (d.IMGURL) scenes[`ind_${d.ID}`].image = d.IMGURL;
      if (d.URL) scenes[`ind_${d.ID}`].url = d.URL;
    }

    return scenes;
  }

  /**
   * Evaluates comparison rules (e.g., [["Year", ">", 1900]]) to filter 
   * the dataset dynamically before rendering a visualization.
   */
  _filterData(filterRules) {
    let filtered = this.data;
    if (!filterRules) return filtered;

    const parseBool = (v) => v === "true" ? true : v === "false" ? false : v;

    for (const f of filterRules) {
      const [key, comp, val] = f;
      const target = parseBool(val);
      
      if (comp === "=" || comp === "==" || comp === "===") {
        filtered = filtered.filter(d => parseBool(d[key]) == target);
      } else if (comp === "<") {
        filtered = filtered.filter(d => parseBool(d[key]) < target);
      } else if (comp === ">") {
        filtered = filtered.filter(d => parseBool(d[key]) > target);
      }
    }
    return filtered;
  }

  /**
   * Central router that determines which D3 layout algorithm to execute
   * based on the scene's `viz` configuration block.
   */
  renderViz(vizConfig, width, height, onNavigate) {
    const filteredData = this._filterData(vizConfig.filter);
    
    if (vizConfig.type === 'compare') {
      return this._compareViz(filteredData, vizConfig.x, vizConfig.y, width, height, onNavigate);
    } else if (vizConfig.type === 'scatter') {
      return this._scatterViz(filteredData, vizConfig.x, vizConfig.y, width, height, onNavigate);
    } else if (vizConfig.type === 'pack') {
      return this._packViz(filteredData, vizConfig.x, vizConfig.y, width, height, onNavigate);
    }
    return null;
  }

  // ==========================================
  // D3 SVG VISUALIZATION ALGORITHMS
  // ==========================================

  /**
   * Renders a static side-by-side comparison of two specific artifacts.
   */
  _compareViz(data, id1, id2, width, height, onNavigate) {
    const d3 = globalThis.d3 || window.d3;
    const filtered = [data.find(d => d.ID == id1), data.find(d => d.ID == id2)].filter(Boolean);
    
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "story-svg-viz");

    const w = (width / 2) * 0.8;
    
    svg.selectAll("image")
      .data(filtered)
      .join("image")
      .attr("href", d => d.IMGURL)
      .attr("width", w)
      .attr("x", (d, i) => (i * (width / 2)) + (width / 4) - (w / 2))
      .attr("y", height * 0.1)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNavigate(`ind_${d.ID}`));

    return svg.node();
  }

  /**
   * Maps artifacts onto a Cartesian plane using a force-directed layout 
   * to resolve coordinate collisions.
   */
  _scatterViz(data, vx, vy, width, height, onNavigate) {
    const d3 = globalThis.d3 || window.d3;
    const size = this.options.vizImageSize || 50;
    const margin = {l: 0.2 * width, r: 0.1 * width, t: 0.1 * height, b: 0.1 * height};
    const wm = width - margin.l - margin.r;
    const hm = height - margin.t - margin.b;

    const domainX = [...new Set(data.map(d => d[vx]))];
    const domainY = [...new Set(data.map(d => d[vy]))];
    
    const scaleX = d3.scalePoint().domain(domainX).range([0, wm]).padding(0.5).round(true);
    const scaleY = d3.scalePoint().domain(domainY).range([0, hm]).padding(0.5).round(true);

    // Initialize node starting positions
    const nodes = data.map(d => ({
      ...d,
      x: scaleX(d[vx]) + margin.l,
      y: scaleY(d[vy]) + margin.t
    }));

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "story-svg-viz");

    // Construct categorical axes
    const axes = svg.append("g").attr("fill", "var(--av-text)").attr("font-size", "14px").attr("text-anchor", "middle");
    domainX.forEach(d => axes.append("text").attr("x", margin.l + scaleX(d)).attr("y", margin.t + hm + 20).text(d));
    axes.append("line").attr("x1", margin.l).attr("y1", margin.t + hm).attr("x2", margin.l + wm).attr("y2", margin.t + hm).attr("stroke", "var(--av-text)");

    domainY.forEach(d => axes.append("text").attr("x", margin.l - 10).attr("y", margin.t + scaleY(d)).attr("text-anchor", "end").attr("dominant-baseline", "middle").text(d));
    axes.append("line").attr("x1", margin.l).attr("y1", margin.t).attr("x2", margin.l).attr("y2", margin.t + hm).attr("stroke", "var(--av-text)");

    // Bind data to interactive SVG image nodes
    const nodeGroup = svg.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("href", d => d.IMGURL)
      .attr("width", size)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNavigate(`ind_${d.ID}`));

    // Live physics simulation tick logic
    d3.forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(5))
      .force("collide", d3.forceCollide(size * 0.6))
      .on("tick", () => {
        nodeGroup
          .attr("x", d => d.x - (size/2))
          .attr("y", d => d.y - (size/2));
      });

    return svg.node();
  }

  /**
   * Implements a hierarchical circle-packing layout. Initializes nodes at the 
   * canvas center to create an outward burst animation as the physics resolve.
   */
  _packViz(data, h1, h2, width, height, onNavigate) {
    const d3 = globalThis.d3 || window.d3;
    const size = this.options.vizImageSize || 40;
    
    const groups = d3.rollup(data, v => v.length, d => d[h1], d => d[h2]);
    const root = d3.hierarchy(groups, ([key, value]) => value.size && Array.from(value))
      .sum(([,value]) => value)
      .sort((a, b) => b.value - a.value);

    d3.pack().size([width, height]).padding(20)(root);

    // Map the calculated hierarchical leaf coordinates back to the artifact data
    const nodes = [];
    for (const f of data) {
      for (const d of root.leaves()) {
        if (f[h1] === d.parent.data[0] && f[h2] === d.data[0]) {
          nodes.push({ 
            ...f, 
            targetX: d.x, 
            targetY: d.y, 
            x: width / 2, 
            y: height / 2 
          });
        }
      }
    }

    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("class", "story-svg-viz");

    // Draw hierarchical bounding circles
    const scheme = ["rgba(0,0,0,0)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.1)"];
    svg.append("g")
      .selectAll("circle")
      .data(root.descendants())
      .join("circle")
      .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r)
      .attr("fill", d => scheme[d.depth] || scheme[2])
      .attr("stroke", "var(--av-text)")
      .attr("stroke-opacity", 0.2);

    // Attach taxonomy labels
    svg.append("g").attr("fill", "var(--av-text)").attr("font-size", "12px").attr("text-anchor", "middle")
      .selectAll("text")
      .data(root.descendants().filter(d => d.depth === 1 || d.depth === 2))
      .join("text")
      .attr("x", d => d.x).attr("y", d => d.y - d.r - 5)
      .text(d => d.data[0]);

    // Bind data to interactive SVG image nodes
    const nodeGroup = svg.append("g")
      .selectAll("image")
      .data(nodes)
      .join("image")
      .attr("href", d => d.IMGURL)
      .attr("width", size)
      .style("cursor", "pointer")
      .on("click", (event, d) => onNavigate(`ind_${d.ID}`));

    // Live physics simulation tick logic
    d3.forceSimulation(nodes)
      .force("x", d3.forceX(d => d.targetX).strength(0.5))
      .force("y", d3.forceY(d => d.targetY).strength(0.5))
      .force("collide", d3.forceCollide(size * 0.6))
      .on("tick", () => {
        nodeGroup
          .attr("x", d => d.x - (size/2))
          .attr("y", d => d.y - (size/2));
      });

    return svg.node();
  }
}

/**
 * Aventura Orchestrator
 * The core entry point for the Aventura V3 framework. Initializes all headless 
 * engines, manages global configurations, and exposes the unified public API.
 */
class Aventura {
  constructor(lang = 'es', options = {}) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : 'en';
    
    // Global framework configuration
    this.options = Object.assign({
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined,
      adventureScroll: false,
      adventureSlide: false,
      evalTags: false,
      igramaFormat: "png",
      minigifOptions: {},
      vizWidth: 600,
      vizHeight: 500,
      vizImageSize: 50,
      theme: {
        background: '#ffffff',
        text: '#000000',
        fontFamily: "'Inconsolata', monospace",
        accentBackground: '#00bfff',
        accentText: '#000000',
        buttonBorder: '2px solid #000000',
        borderRadius: '0px',
        containerBorder: 'none',
        buttonBg: '#ffffff',
        buttonText: '#000000',
        buttonHoverBg: '#000000',
        buttonHoverText: '#ffffff'
      }
    }, options);

    // Initialize Sub-Engines
    this.grammarEngine = new GrammarEngine();
    this.markovEngine = new MarkovEngine();
    this.storyEngine = new StoryEngine(this);
    this.igramaEngine = new IgramaEngine(this);
    this.dataEngine = new DataEngine(this.options);
    
    // Export utility wrappers
    this.loadJSON = loadJSON;

    // =========================================================
    // UNIFIED PUBLIC API
    // =========================================================

    // --- Context-Free Grammar ---
    this.setGrammar = (g) => { this.grammarEngine.setGrammar(g); return this; };
    this.expandGrammar = (start, context) => this.grammarEngine.expandGrammar(start, context);
    this.expandText = (text, context) => this.grammarEngine.expandText(text, context);
    this.testGrammar = () => {
      this.grammarEngine.testGrammar();
      this.grammarReport = this.grammarEngine.grammarReport;
      return this;
    };
    
    // --- Markov Chains ---
    this.markovModel = (file, n, save) => this.markovEngine.buildModel(file, n, save ? this.saveJSON : null);
    this.setMarkov = (m) => { this.markovEngine.setModel(m); return this; };
    this.markovChain = (len, seed, nlProb) => this.markovEngine.generateChain(len, seed, nlProb);
    this.testDistribution = () => { this.markovEngine.testDistribution(); return this; };

    // --- Generative Images (Igramas) ---
    this.setIgrama = (i) => { this.igramaEngine.setIgrama(i); return this; };
    this.expandIgrama = (start) => this.igramaEngine.expand(start);
    this.igramaText = (layers) => this.igramaEngine.getText(layers);
    this.igramaDataUrl = (layers, format) => this.igramaEngine.getDataUrl(layers, format || this.options.igramaFormat);
    
    // Utility to render an Igrama directly to the DOM outside of the story flow
    this.showIgrama = async (layers, format, containerId) => {
      const url = await this.igramaDataUrl(layers, format);
      const img = new Image();
      img.src = url;
      img.className = 'storyimage';
      const parent = containerId ? document.getElementById(containerId) : document.body;
      parent.appendChild(img);
    };

    // --- Archival Data Visualization ---
    this.setDataScenes = (scenes, data, metaKeys) => {
      const enhancedScenes = this.dataEngine.setupDataScenes(scenes, data, metaKeys);
      this.storyEngine.setScenes(enhancedScenes);
      return this;
    };

    // --- Interactive Story Orchestration ---
    this.setScenes = (s) => { this.storyEngine.setScenes(s); return this; };
    this.testScenes = () => { this.storyEngine.testScenes(); return this; };
    
    this.startAdventure = (startSymbol) => {
      const defaultUI = new StoryUI(this.lang, this.options, this.storyEngine);
      defaultUI.preloadImages(this.storyEngine.scenes);
      defaultUI.init();

      // Bridge the headless engine's state changes to the UI renderer
      this.storyEngine.onSceneChange = (sceneState) => {
        defaultUI.render(sceneState);
      };

      this.storyEngine.resetContext();
      this.storyEngine.goToScene(startSymbol);
      return this;
    };
  }
}

export { Aventura as default };
