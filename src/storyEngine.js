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
   * Ensures the incoming JSON strictly adheres to the Aventura V3 English schema.
   * Strips out unrecognized keys and undefined values to optimize memory.
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
        
        // Extended module configurations
        igrama: scene.igrama,
        viz: scene.viz,             
        dataScene: scene.dataScene, 
        meta: scene.meta,           

        // Hit-area geometry and navigation
        areas: scene.areas ? scene.areas.map(a => ({
          x: a.x, y: a.y, w: a.w, h: a.h,
          btn: a.btn,
          text: a.text,
          scene: a.scene,
          tooltip: a.tooltip
        })) : undefined,
        
        // Standard button options
        options: scene.options ? scene.options.map(o => ({
          btn: o.btn,
          text: o.text,
          scene: o.scene,
          image: o.image
        })) : undefined
      };

      // Strip undefined properties to maintain a minimal memory footprint
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
   * Generates a temporary, intermediate scene for branching options 
   * that contain their own transitional text.
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
   * The core state machine tick. Updates history, processes grammar, 
   * packages the state, and broadcasts to the UI layer.
   */
  _dispatchScene(sceneId, scene) {
    if (this.currentScene !== sceneId) {
      this.previousScene = this.currentScene;
    }
    this.currentScene = sceneId;

    // Automatically inject a "Go Back" button for auto-generated collection artifacts
    if (scene.dataScene && this.previousScene) {
      scene.options = [{ btn: "<<<", scene: this.previousScene }];
    }

    // Expand generative tags (e.g. <animal>) against the current playthrough memory
    const parsedText = this.grammar ? this.grammar.expandText(scene.text || '', this.storyContext) : (scene.text || '');

    const sceneState = {
      id: sceneId,
      rawScene: scene,
      parsedText: parsedText,
      options: scene.options, 
      image: scene.image,     
      areas: scene.areas,
      deadEnd: scene.deadEnd
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