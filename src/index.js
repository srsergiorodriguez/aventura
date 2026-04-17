import { parseAventuraRule } from './parser.js';
import { getRandomPick, applyTransforms, loadJSON } from './utils.js';
import { buildMarkovModel } from './markov.js';

import StoryEngine from './StoryEngine.js';
import StoryUI from './StoryUI.js'
import IgramaEngine from './IgramaEngine.js';
import DataEngine from './DataEngine.js';

export default class Aventura {
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
      igramaFormat: "png",
      minigifOptions: {},
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

    // Engines
    this.storyEngine = new StoryEngine(this);
    this.igramaEngine = new IgramaEngine(this);
    this.dataEngine = new DataEngine(this.options);
    
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

    // Igrama API Wrappers
    this.setIgrama = (igrama) => {
      this.igramaEngine.setIgrama(igrama);
      return this; // <-- This restores the chain!
    };
    this.expandIgrama = (start) => this.igramaEngine.expand(start);
    this.igramaText = (layers) => this.igramaEngine.getText(layers);
    this.igramaDataUrl = (layers, format) => this.igramaEngine.getDataUrl(layers, format || this.options.igramaFormat);

    this.showIgrama = async (layers, format, containerId) => {
      const url = await this.igramaDataUrl(layers, format);
      const img = new Image();
      img.src = url;
      img.className = 'storyimage'; // Give it default styling
      const parent = containerId ? document.getElementById(containerId) : document.body;
      parent.appendChild(img);
    };

    // Data Engine Wrapper
    this.setDataScenes = (scenes, data, metaKeys) => {
      // 1. Let DataEngine inject ind_ scenes into the raw scenes object
      const enhancedScenes = this.dataEngine.setupDataScenes(scenes, data, metaKeys);
      // 2. Pass the enhanced object to the StoryEngine
      this.storyEngine.setScenes(enhancedScenes);
      return this;
    };
    this.fijarDatosEscenas = this.setDataScenes.bind(this);

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