import { getRandomPick } from './utils.js';

export default class IgramaEngine {
  constructor(grammarEngine) {
    this.textGrammarEngine = grammarEngine; // Reference to text engine if we need shared logic
    this.igrama = null;
    this.imgsMemo = {};
    this.minigifOptions = {};
  }

  setIgrama(igramaObj) {
    this.igrama = igramaObj;
    return this;
  }

  // --- 1. GRAMMAR EXPANSION ---

  expand(startSymbol) {
    if (!this.igrama || !this.igrama.grammar) return [];
    
    // 1. Resolve the grammar recursively (simulating the old grammarRuleRecursion)
    // We can write a simple recursive resolver here since igrama syntax is simpler (just <tags> and | )
    const rawString = this._resolveIgramaGrammar(startSymbol);
    
    // 2. Split by '|' and decode each drawing layer
    return rawString.split('|').map(drawing => this.decodeDrawing(drawing));
  }

  _resolveIgramaGrammar(symbol, depth = 0) {
    if (depth > 100) return "";
    
    // If it's a tag, look it up
    let lookup = symbol;
    if (symbol.startsWith('<') && symbol.endsWith('>')) {
      lookup = symbol.substring(1, symbol.length - 1);
    }

    const rules = this.igrama.grammar[lookup];
    if (!rules || rules.length === 0) return symbol; // Not found, return raw

    const pick = getRandomPick(rules).element;

    // Regex to find <tags> inside the picked rule and resolve them
    return pick.replace(/<([^>]+)>/g, (match, innerTag) => {
      return this._resolveIgramaGrammar(innerTag, depth + 1);
    });
  }

  decodeDrawing(data) {
    if (!data || data === '') return [];
    
    const [type, content, attribute] = data.split('%%');
    let decoded = { type, attribute };

    if (type === 'vector') {
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
      decoded.content = content; // Usually a URL for external images
    }
    return decoded;
  }

  getText(layers) {
    // Extracts the attributes and reverses them as per original logic
    return layers.filter(d => d.attribute).map(d => d.attribute).reverse().join(' ').trim();
  }

  // --- 2. RENDERING ENGINE ---

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
      if (typeof MiniGif === 'undefined') { // <-- Removed "window."
        console.error("Aventura: MiniGif library is required to export GIFs.");
      } else {
        const options = Object.assign({ colorResolution: 7, dither: false, delay: 50 }, this.minigifOptions);
        const gif = new MiniGif(options);   // <-- Removed "window."
        
        gif.addFrame(canvas); // Frame 1
        
        // Frame 2 (Wiggle effect)
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
            img.onerror = () => resolve(img); // Avoid hanging on bad URLs
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
  
  _getSpline(points) {
    let spline = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p = [];
      p[0] = i > 0 ? points[i - 1] : points[0];
      p[1] = points[i];
      p[2] = points[i + 1];
      p[3] = i < points.length - 2 ? points[i + 2] : points[points.length -1];
      
      for (let t = 0; t < 1; t += 0.05) {
        // Catmull-Rom spline interpolation math
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