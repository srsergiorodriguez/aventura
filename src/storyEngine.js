// src/StoryEngine.js

export default class StoryEngine {
  constructor(grammarEngine) {
    this.grammar = grammarEngine;
    this.scenes = {};
    this.currentScene = null;
    this.onSceneChange = null;

    this.storyContext = {};

    this.previousScene = null;
  }

  resetContext() {
    this.storyContext = {};
  }

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
        igrama: scene.igrama,
        
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
    if (this.currentScene !== sceneId) {
      this.previousScene = this.currentScene;
    }
    this.currentScene = sceneId;

    // Handle dynamic "Go Back" button for auto-generated data scenes
    if (scene.dataScene && this.previousScene) {
      scene.options = [{ btn: "<<<", scene: this.previousScene }];
    }

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