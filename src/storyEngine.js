/**
 * StoryEngine
 * A headless state machine that manages scene transitions, memory context,
 * and data normalization for interactive narratives. It broadcasts state 
 * changes to the UI layer without interacting with the DOM.
 */
export default class StoryEngine {
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