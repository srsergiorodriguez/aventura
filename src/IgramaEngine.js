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

  /**
   * Expands a starting symbol into a fully resolved array of drawing layers.
   */
  expand(startSymbol) {
    if (!this.igrama || !this.igrama.grammar) return [];
    
    const rawString = this._resolveIgramaGrammar(startSymbol);
    
    // Igrama layers are delimited by the '|' character
    return rawString.split('|').map(drawing => this.decodeDrawing(drawing));
  }

  /**
   * Recursively resolves Igrama tags (e.g., <tag_name>).
   */
  _resolveIgramaGrammar(symbol, depth = 0) {
    if (depth > 100) return "";
    
    let lookup = symbol;
    if (symbol.startsWith('<') && symbol.endsWith('>')) {
      lookup = symbol.substring(1, symbol.length - 1);
    }

    const rules = this.igrama.grammar[lookup];
    if (!rules || rules.length === 0) return symbol; 

    const pick = getRandomPick(rules).element;

    // Recursively expand nested tags within the chosen rule
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
      // Vector data contains multiple doodles delimited by '**'
      // Each doodle format: color&weight&x1,y1,x2,y2...
      decoded.content = content.split('**').map(doodle => {
        const [color, weight, v] = doodle.split('&');
        const xy = [];
        xy.color = color;
        xy.weight = weight;
        if (!v) return xy;
        
        const flat = v.split(',');
        for (let i = 0; i < flat.length; i += 2) {
          xy.push([+flat[i], +flat[i + 1]]);
        }
        return xy;
      });
    } else {
      // For 'url' types, content is the source path
      decoded.content = content; 
    }
    return decoded;
  }

  /**
   * Extracts and reverses parallel text attributes generated alongside the image.
   */
  getText(layers) {
    return layers.filter(d => d.attribute).map(d => d.attribute).reverse().join(' ').trim();
  }

  // ==========================================
  // 2. RENDERING PIPELINE
  // ==========================================

  /**
   * Renders the parsed layers to an off-screen Canvas and returns a Base64 Data URL.
   * Supports 'png' or 'gif' output formats.
   */
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
        
        // Base Frame
        gif.addFrame(canvas); 
        
        // Wiggle Frame: Applies a slight coordinate displacement for a hand-drawn boil effect
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

  /**
   * Iterates through layers and draws images or vector splines onto the target Canvas context.
   */
  async drawLayers(layers, ctx) {
    for (const [index, layer] of layers.entries()) {
      if (layer.type === 'url' && this.igrama.sections && this.igrama.sections[index]) {
        const { w, h, x, y } = this.igrama.sections[index];
        
        if (!this.imgsMemo[layer.content]) {
          const img = new Image();
          img.src = layer.content;
          this.imgsMemo[layer.content] = await new Promise(resolve => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img); // Fail gracefully on bad URLs
          });
        }
        ctx.drawImage(this.imgsMemo[layer.content], x, y, w, h);
        
      } else if (layer.type === 'vector') {
        for (const doodle of layer.content) {
          if (doodle.length === 0) continue;
          const spline = this._getSpline(doodle);
          this._drawSpline(spline, ctx, doodle.color, doodle.weight);        
        }
      }
    }
  }

  _drawSpline(spline, ctx, color, weight) {
    ctx.lineWidth = weight;
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath();
    for (let i = 0; i < spline.length; i++) {
      if (i === 0) ctx.moveTo(...spline[0]);
      else ctx.lineTo(...spline[i]);
    }
    ctx.stroke();
  }
  
  /**
   * Expands sparse vector points into a smooth curve using Catmull-Rom spline interpolation.
   */
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

  /**
   * Clones and slightly perturbs vector coordinates to generate a secondary 
   * "boil" frame for GIF animation.
   */
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
          doodle.color = layers[i].content[j].color;
          doodle.weight = layers[i].content[j].weight;
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