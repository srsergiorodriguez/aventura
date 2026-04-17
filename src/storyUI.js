// src/StoryUI.js

export default class StoryUI {
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

async _renderImageAndAreas(sceneState, storydiv) {
    // 1. Static Image
    const imgSrc = sceneState.image;
    
    // 2. Igrama Generative Image
    const igramaRule = sceneState.rawScene.igrama;

    if (!imgSrc && !igramaRule) return;

    const imgContainer = document.createElement("div");
    imgContainer.className = "storyimage-container";
    storydiv.appendChild(imgContainer);

    let image;

    if (igramaRule && this.engine.grammar.igramaEngine) {
      // It's an Igrama! We generate it on the fly.
      image = new Image();
      image.className = "storyimage";
      imgContainer.appendChild(image);
      
      const layers = this.engine.grammar.expandIgrama(igramaRule);
      
      // If there's generative text attached to the image, append it to the parsed text
      const extraText = this.engine.grammar.igramaText(layers);
      if (extraText) {
         sceneState.parsedText = extraText + "\n" + sceneState.parsedText;
      }

      const url = await this.engine.grammar.igramaDataUrl(layers, this.options.igramaFormat);
      image.src = url;

    } else if (imgSrc) {
      // It's a standard static image
      image = this.storyPreload[imgSrc] ? this.storyPreload[imgSrc].cloneNode() : new Image();
      image.src = imgSrc;
      image.className = "storyimage";
      imgContainer.appendChild(image);
    }

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