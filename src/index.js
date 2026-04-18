import { loadJSON } from './utils.js';

import GrammarEngine from './GrammarEngine.js';
import MarkovEngine from './MarkovEngine.js';
import StoryEngine from './StoryEngine.js';
import StoryUI from './StoryUI.js'
import IgramaEngine from './IgramaEngine.js';
import DataEngine from './DataEngine.js';

/**
 * Aventura Orchestrator
 * The core entry point for the Aventura V3 framework. Initializes all headless 
 * engines, manages global configurations, and exposes the unified public API.
 */
export default class Aventura {
  constructor(lang = 'es', options = {}) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : 'en';
    
    // Global framework configuration
    this.options = Object.assign({
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined,
      adventureScroll: false,
      adventureSlide: true,
      evalTags: false,
      igramaFormat: "png",
      minigifOptions: {},
      vizWidth: 600,
      vizHeight: 500,
      vizImageSize: 50,
      theme: {
        background: '#ffffff',
        containerBorder: "solid 1px black",
        text: '#000000',
        fontFamily: '"Courier New", Courier, monospace',
        accentBackground: '#000000',
        accentText: '#ffffff',
        buttonBorder: 'solid 1px black',
        borderRadius: '0px'
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
    this.testGrammar = () => { this.grammarEngine.testGrammar(); return this; };
    
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