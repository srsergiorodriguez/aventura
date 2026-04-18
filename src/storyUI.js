/**
 * StoryUI
 * The default presentation layer for Aventura. It acts as a "Batteries Included" 
 * UI that listens to the StoryEngine and dynamically generates the DOM elements, 
 * CSS styling, SVG interactive areas, and visual transitions.
 */
export default class StoryUI {
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
   * Handles intermediate dynamic scenes and dead ends.
   */
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
      .storygeneraldiv { box-sizing: border-box; margin: auto; max-width: 600px; font-family: var(--av-font); background: var(--av-bg); color: var(--av-text); }
      .storydiv { box-sizing: border-box; width: 100%; display: flex; padding: 1em; flex-direction: column; border: var(--av-container-border); }
      .storyp { font-size: 1.1em; line-height: 1.5; min-height: 1.5em; white-space: pre-wrap; margin-bottom: 1.5em; }
      
      .storybutton { 
        background: var(--av-btn-bg); 
        color: var(--av-btn-text); 
        border: var(--av-btn-border); 
        border-radius: var(--av-radius); 
        margin: 0px 0.5em 0.5em 0px; 
        padding: 0.6em 1.2em; 
        font-size: 1em; 
        font-family: var(--av-font); 
        cursor: pointer; 
        transition: all 0.2s ease; 
      }
      
      .storybutton:hover { 
        background: var(--av-btn-hover-bg); 
        color: var(--av-btn-hover-text);
        opacity: 0.9; 
      }
      
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