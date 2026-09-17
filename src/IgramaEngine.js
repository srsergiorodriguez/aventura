import { getRandomPick } from './utils.js';

/**
 * IgramaEngine
 * A headless rendering engine for generative images (Igramas).
 * Processes context-free image grammars to produce composite HTML5 Canvases,
 * vector splines, and animated GIFs (via MiniGif).
 */
export default class IgramaEngine {
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