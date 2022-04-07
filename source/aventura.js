/*
Aventura v2.3.1
A library for making biterature / Una librería para hacer biteratura
Copyright (c) 2020 - 2022 Sergio Rodríguez Gómez // https://github.com/srsergiorodriguez
Released under MIT License
*/

class Aventura {
  constructor(lang = 'en',options) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : 'en';
    this.options = {
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined,
      sceneCallback: (s)=>{return s} // Returns the current scene
    }
    if (options) {this.options = Object.assign(this.options,options)}
    this.grammarError = false;
    this.scenesError = false;

    // SPANISH WRAPPERS
    this.fijarGramatica = this.setGrammar;
    this.expandirGramatica = this.expandGrammar;
    this.probarGramatica = this.testGrammar;

    this.fijarEscenas = this.setScenes;
    this.iniciarAventura = this.startAdventure;
    this.probarEscenas = this.testScenes;

    this.cargarJSON = this.loadJSON;
    this.fijarMarkov = this.setMarkov;
    this.cadenaMarkov = this.markovChain;
    this.probarDistribucion = this.testDistribution;

    this.fijarIgrama = this.setIgrama;
    this.expandirIgrama = this.expandIgrama;
    this.mostrarIgrama = this.showIgrama;
    this.textoIgrama = this.getIgramaText;

    this.imgsMemo = {}; // memoiza imágenes de los igramas
    this.storyPreload = {}; // precarga imágenes para la historia interactiva
  }

  // MAIN INPUT FUNCTIONS

  setGrammar(grammar) {
    this.grammar = grammar;
    return this
  }

  setIgrama(model) {
    this.igrama = model;
    const grammar = [];
    for (let [key, value] of Object.entries(model.grammar)) {
      grammar[key] = value;
    }
    return this
  }

  setScenes(scenes) {
    this.scenes = scenes;
    for (let key of Object.keys(scenes)) {
      this.scenes[key].key = key;

      // preload images
      const im = this.scenes[key].image || this.scenes[key].imagen;
      if (im !== undefined) {
        if (this.storyPreload[im] === undefined) {
          this.storyPreload[im] = new Image();
          this.storyPreload[im].src = im
          this.storyPreload[im].className = "storyimage";
        }
      }
    }
    
    return this
  }

  setMarkov(model) {
    this.markov = model;
    return this
  }

  // GRAMMAR EXPANSION

  expandGrammar(start) {
    const firstString = this.selectGrammarRule(this.grammar[start]);
    return this.grammarRuleRecursion(firstString);
  }

  expandIgrama(start) {
    const grammar = this.igrama.grammar;
    const firstString = this.selectGrammarRule(grammar[start]);
    const result =  this.grammarRuleRecursion(firstString, grammar).split('|').map(drawing => this.decodeDrawing(drawing));
    return result
  }

  grammarRuleRecursion(string, g) {
    let grammar;
    if (g === undefined) {
      grammar = this.grammar;
    } else {
      grammar = g;
    }
    let newstring = this.setNewRules(string); // Clean string from recursive rules and create the rules
    const ruleList = newstring.match(/<[\w\d.,/#]+>/gi); // Create a list of rules to be developed from the string
    if (!ruleList) {return newstring} // Return the string if there are no new rules to develop
    for (let rule of ruleList) {
      const transformations = this.defineTransformations(rule);
      newstring = newstring.replace(rule,()=>{
        rule = rule.replace(/[<>]/gi,""); // delete <> symbols
        rule = rule.replace(/#[\w\d.,/]+#/g,""); // delete transformation definition
        const ruleArray = rule.search(/[.]/)>-1 ? 
        this.getNestedObject(grammar,rule.match(/[\w\d]+/g)) : // if there is a path for the rule
        grammar[rule]; // if the rule can be accesed directly
        if (!ruleArray) {
          const errorMsg = this.lang === 'es' ?
            `Se intentó expandir desde la regla "${rule}", pero no se pudo encontrar` :
            `Tried to expand from rule "${rule}", but couldn't find it`;
          console.error(errorMsg);
        };
        const preTransformed = this.selectGrammarRule(ruleArray);
        return this.transformString(preTransformed,transformations);
      });
    }
    return this.grammarRuleRecursion(newstring, grammar);
  }

  // GRAMMAR RULE CREATION

  setNewRules(string, g) {
    let grammar;
    if (g === undefined) {
      grammar = this.grammar;
    } else {
      grammar = g;
    }
    // Check if there are recursive rules in a string and add them to the grammar
    // Return the string without recursive rules
    let newstring = string;
    const rules = newstring.match(/\$[\w\d]+\$\[[\w\d:,]+\]/ig);
    if (rules) {
      while (rules.length) {
        const newrule = rules.pop(); // remove top rule from rule list
        newstring = newstring.replace(newrule,""); // remove rule text string from original string
        const { symbol, pairsString } = /\$(?<symbol>[\w\d]+)\$\[(?<pairsString>[\w\d:,]+)\]/i.exec(newrule).groups; // get symbol and string of listed values
        const pairs = pairsString.match(/[\w\d]+:[\w\d]+/gi).map(d=>(/(?<key>[\w\d]+)[ ]?:[ ]?(?<value>[\w\d]+)/gi.exec(d)).groups); // format the string of listed values into an array of objects
        if (pairs) {
          grammar[symbol] = grammar[symbol] || {};
          // asign key-value pairs to symbol
          for (let p of pairs) {
            const ruleArray = grammar[p.value];
            if (!ruleArray) {
              const errorMsg = this.lang === 'es' ? 
                `Se intentó crear la nueva regla "${symbol}", pero no se pudo encontrar "${p.value}" para producir la subregla "${p.key}"` 
                : `Tried to create new rule: "${symbol}", but couldn't find "${p.value}" to produce "${p.key}" subrule`;
              console.error(errorMsg);
            };
            grammar[symbol][p.key] = [this.selectGrammarRule(ruleArray)];
          }
        }
      }
    }
    return newstring;
  }

  // INTERACTIVE STORY

  startAdventure(start) {
    const titleContent = this.scenes[start].text || this.scenes[start].texto;
    document.title = this.grammar ? this.grammarRuleRecursion(titleContent) : titleContent; // Change the title of html page to adventure name
    if (this.options.defaultCSS) {this.setCSS()};

    // Create the div that will contain the adventure
    const generaldiv = document.createElement("div");
    generaldiv.id = "storygeneraldiv";
    const parent = this.options.adventureContainer?document.getElementById(this.options.adventureContainer):document.body;
    parent.appendChild(generaldiv);

    // Start the interactice story display
    this.goToScene(this.scenes[start]);
    return this
  }

  goToScene(scene) {
    // Delete previous div containing story display
    const generaldiv = document.getElementById("storygeneraldiv");
    const prevdiv = document.getElementById("storydiv");
    if (prevdiv) {generaldiv.removeChild(prevdiv)};

    // de pronto on window resize redibujar scene

    const storydiv = document.createElement("div");
    storydiv.id = "storydiv";
    generaldiv.appendChild(storydiv);

    // Create image (if there's a path available)
    if (scene.image || scene.imagen) {
      const storyImageContainer = document.createElement("div");
      storyImageContainer.className = "storyimage-container";


      // node.cloneNode(true);
      const src = scene.image || scene.imagen;
      const image = this.storyPreload[src];


      storyImageContainer.appendChild(image);
      storydiv.appendChild(storyImageContainer);

      if (scene.areas) { // clickable areas that take to scenes
        if (image.complete) {
          this.setAreas(image, storyImageContainer, scene.areas);
        } else {
          image.onload = () => {
            this.setAreas(image, storyImageContainer, scene.areas);
          };
        }
        window.onresize = () => {
          this.goToScene(scene);
        }
      }
    }

    // Create text paragraph
    const paragraph = document.createElement("p");
    paragraph.className = "storyp";
    paragraph.innerHTML = "";
    storydiv.appendChild(paragraph);

    this.typewriter(paragraph,scene);
    this.options.sceneCallback(scene);
  }

  setAreas(imgSource, parent, areas) {
    // Parts of an image that are used to go to another scene
    // Adapts according to responsive changes in image size
    const dims = imgSource.getBoundingClientRect();
    const dimsC = parent.getBoundingClientRect();
    for (let a of areas) {
      let area = document.createElement("div");
      area.className = "storyimage-area";
      const left = ((a.x-(Math.floor(a.w/2))) * dims.width)/imgSource.naturalWidth;
      area.style.left = `${dims.left - dimsC.left + left}px`;
      const top = ((a.y-(Math.floor(a.h/2))) * dims.height)/imgSource.naturalHeight;
      area.style.top = `${dims.top - dimsC.top + top}px`;
      area.style.minWidth = `${a.w*dims.width/imgSource.naturalWidth}px`;
      area.style.minHeight = `${a.h*dims.height/imgSource.naturalHeight}px`;
      area.innerHTML = a.text || a.texto;
      parent.appendChild(area);

      area.style.fontSize = `${40*dims.height/imgSource.naturalHeight}px`;
      area.onclick = () => {
        const e = a.scene || a.escena;
        this.goToScene(this.scenes[e]);
      }

      if (a.tooltip !== undefined) {
        area.onmouseover = () => {
          area.innerHTML = a.tooltip || a.tooltip
          area.style.zIndex =  '100';
        }
        area.onmouseout = () => {
          area.innerHTML = a.text || a.texto;
          area.style.zIndex =  '0';
        }
      }
    }
  }

  typewriter(paragraph,scene) {
    // Writes the text in a typewriter effect, and once it finishes, shows buttons
    const textContent = scene.text || scene.texto;
    let text = this.grammar ? this.grammarRuleRecursion(textContent) : textContent;
    text = text.replace(/\n/g,'<br>');
    if (this.options.typewriterSpeed > 0) {
      let i = 0;
      const interval = setInterval(()=>{
        const textpart = text.substring(0,i);
        paragraph.innerHTML = textpart;
        i++;
        if (i>text.length) {
          clearInterval(interval);
          this.optionButtons(scene);
        }
      },Math.floor(this.options.typewriterSpeed));
    } else {
      paragraph.innerHTML = text;
      this.optionButtons(scene);
    }
  }

  optionButtons(scene) {
    const storydiv = document.getElementById("storydiv");
    if (scene.options || scene.opciones) {
      const options = scene.options || scene.opciones;
      // Create multiple buttons for choosing a new scene path
      for (let option of options) {
        const optionButton = document.createElement("button");
        optionButton.className = "storybutton";
        optionButton.innerHTML = option.btn;
        storydiv.appendChild(optionButton);
        optionButton.addEventListener("click",()=>{
          this.goToScene(option);
        });
      }
    } else if (scene.scene || scene.escena) {
      // Create a default continue button
      const nextScene = scene.scene || scene.escena;
      const continueButton = document.createElement("button");
      continueButton.className = "storybutton";
      continueButton.innerHTML = this.lang === 'en' ? "Continue" : "Continuar";
      storydiv.appendChild(continueButton);
      continueButton.addEventListener("click",()=>{
        this.goToScene(this.scenes[nextScene]);
      });
    }
  }

  // GRAMMAR UTILITIES

  selectGrammarRule(array) {
    // Pick a random rule from an array of rules
    if (array.prob) {
      const chooser = Math.random() * array.prob.reduce((a,c)=>a+c);
      let count = 0;
      for (let i=0;i<array.prob.length;i++) {
        if (count <= chooser && chooser < count+array.prob[i] ) {
          return array[i];
        }
        count += array.prob[i];
      }
    }
    return array[Math.floor(Math.random()*array.length)];
  }

  getNestedObject(object, pathArray) {
    return pathArray.reduce((obj, key) => 
      (obj && obj[key] !== undefined) ? obj[key] : undefined, object);
  }

  defineTransformations(rule) {
    // Define which transformations must be applied to the string
    let transformations = {};
    const transformationList = /#(?<trans>[\w\d,]+)#/gi.exec(rule)?.groups.trans.match(/[\w]+/gi)||[];
    for (let t of transformationList) {transformations[t] = true}
    return transformations;
  }

  transformString(string,transformations) {
    let tempString = string;
    if (transformations.CAPITALIZE) {
      tempString = tempString.charAt(0).toUpperCase() + tempString.slice(1);
    }
    if (transformations.ALLCAPS) {
      tempString = tempString.toUpperCase();
    }
    return tempString;
  }

  // IGRAMA UTILITIES
  decodeDrawing(data) {
    if (data === '') {
      return []
    }
    const [type, content, attribute] = data.split('%%');
    let decoded = {};
    if (type === 'vector') {
      decoded.content = content.split('**').map(doodle => {
        const [color, weight, v] = doodle.split('&');
        const xy = [];
        xy.color = color;
        xy.weight = weight;
        if (v === undefined) return xy
        const flat = v.split(',');
        for (let i = 0; i < flat.length; i += 2) {
          xy.push([+flat[i], +flat[i + 1]])
        }
        return xy
      });
    } else {
      decoded.content = content
    }
    decoded.attribute = attribute;
    decoded.type = type;
    return decoded
  }

  // MARKOV MODEL

  async getMarkovModel(filename, ngram = 1, save = false) {
    let text = await (await fetch(`./${filename}.txt`)).text();
    text = text.replace(/([,:.;])/g, " $1").replace(/[()\¿¡!?”“—-]/g, "").toLowerCase();
  
    const words = text.split(/\s+/);
    const fragments = {};
  
    for (let i = 0; i < words.length - ngram; i ++) {
      let f = "";
      for (let j = 0; j < ngram; j++) {
        f += j === 0 ? words[i + j] : " " + words[i + j];
      }
  
      if (fragments[f] === undefined) { fragments[f] = {} }
      const nextWord = words[i + ngram];
  
      if (fragments[f][nextWord] === undefined) {
        fragments[f][nextWord] = 1;
      } else {
        fragments[f][nextWord]++;
      }
    }
  
    const mProbs = {};
    for (let f of Object.keys(fragments)) {
  
      const keys = Object.keys(fragments[f]);
      mProbs[f] = {probs: [], grams: keys};
  
      let sum = 0;
      for (let i = 0; i < keys.length; i++) {
        sum += fragments[f][keys[i]];
      }
      for (let i = 0; i < keys.length; i++) {
        mProbs[f].probs[i] = fragments[f][keys[i]] / sum; // Normalized probabilities
      }
    }
  
    if (save) {
      const filenameParts = filename.split('/');
      this.saveJSON(mProbs, `${filenameParts[filenameParts.length-1]}_markovModel_${ngram}N`);
    }
    
    return mProbs;
  }

  // MARKOV CHAIN

  markovChain(chainLength, seed, newLineProbability = 0.1) {
    // Create a Markov sequence of the defined length
    let result = seed === undefined || this.markov[seed] === undefined ? this.randomMarkovWord() : seed;
    let currentGram = result;
  
    for (let chain = 0; chain < chainLength - 1; chain++) {
      let nextWord = this.getNextMarkov(this.markov[currentGram]);
      if (nextWord === undefined) {
        nextWord = this.getNextMarkov(this.randomMarkovWord());
      }
      let tempList = currentGram.split(/\s+/);
      tempList.push(nextWord);
      tempList = tempList.slice(1).join(' ');
      currentGram = tempList;
      result += ` ${nextWord}`;
    }
  
    const formatted = this.formatMarkov(result, newLineProbability);
    return formatted
  }

  // MARKOV UTILITIES

  randomMarkovWord() {
    const choice = Math.floor(Math.random() * Object.keys(this.markov).length);
    return Object.keys(this.markov)[choice]
  }

  getNextMarkov(data) {
    // Get a new gram element from the defined probabilities
    const rnd = Math.random();
    let count = 0;
    if (data === undefined) return undefined
    for (let i = 0; i < data.probs.length; i++) {
      if (count <= rnd && rnd < count + data.probs[i]) {
        return data.grams[i];
      }
      count += data.probs[i];
    }
  }

  formatMarkov(str, newLineProbability = 0.1) {
    // Format the final markov chain text ... put initials, random new lines, adjust punctuation
    let formatted = str.replace(/ ([,:.;])/g, "$1");
    formatted = formatted.replaceAll(/([.]) ([\wáéíóú])/ig, (match, c1, c2, offset, fullString) => {
      const rnd = Math.random();
      if (rnd < newLineProbability) {
        return `.\n${c2.toUpperCase()}`
      } else {
        return `. ${c2.toUpperCase()}`
      }
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // GENERAL UTILITIES

  async loadJSON(path) {
    return await (await fetch(path)).json();
  }

  saveJSON(obj, filename) {
    // FOR BROWSER
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], {
      type: "text/plain"
    }));
    a.setAttribute("download", `${filename}.json`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // DEBUGGING TOOLS

  testScenes(scenes) {
    const testScenes = scenes || this.scenes;
    if (!testScenes) {
      const errorMsg = this.lang === 'es' ? "No hay escenas para probar" : "There are not scenes to test"
      console.error(errorMsg);
    };
    let deadEnds = [];
    for (let e of Object.keys(testScenes)) {
      const scene = testScenes[e];
      if (scene.options || scene.opciones) {
        const options = scene.options || scene.opciones;
        const filtered = options.filter(d=>!testScenes[d.scene||d.escena]);
        deadEnds = [...deadEnds,...filtered.map(d=>`${e} => ${d.btn} => ${d.scene||d.escena}`)];
      } else {
        if (scene.deadEnd||scene.sinSalida) {continue}
        if (!testScenes[scene.scene||scene.escena]) {
          deadEnds.push(`${e} => ${scene.scene||scene.escena}`);
        }
      }
    }
    if (deadEnds.length>0) {
      const errorMsg = this.lang === 'es' ?
      `Las siguientes escenas no llevan a ningún lado: ${deadEnds.join(", ")}` :
      `The following scenes are dead ends: ${deadEnds.join(", ")}`
      console.error(errorMsg);
      this.scenesError = true;
    }
    return this
  }

  testGrammar(grammar) {
    const testGrammar = grammar || this.grammar;
    if (!testGrammar) {
      const errorMsg = this.lang === 'es' ? "No hay gramática para probar" : "There is not grammar to test"
      console.error(errorMsg);
    };
    for (let e of Object.keys(testGrammar)) {
      const rules = testGrammar[e];
      for (let rule of rules) {
        const references = rule.match(/<([\w\d]+)>/gi)?.map(d=>d.replace(/[<>]/g,""))||[];
        const newRules = rule.match(/\$[\w\d]+\$\[([\w\d.,:]+)\]/gi)?.map(d=>{
          return d.match(/([ ]?:[\w\d]+)/g).map(x=>/[ ]?:(?<key>[\w\d]+)/.exec(x).groups.key);
        }).reduce((a,c)=>[...a,...c],[])||[];
        const deadEnds = [...references,...newRules].filter(d=>!testGrammar[d]);
        if (deadEnds.length>0) {
          const errorMsg = this.lang === 'es'?
            `Las siguientes reglas, que se referencian en "${e}", no existen: ${deadEnds.join(", ")}` :
            `The following rules, referenced in "${e}", do not exist: ${deadEnds.join(", ")}` 
          this.grammarError = true;
          console.error(errorMsg);
        }
      }
    }
    return this
  }

  testDistribution(markov) {
    const testMarkov = markov || this.markov;
    if (testMarkov === undefined) {
      const errorMsg = this.lang === 'es' ? "No hay modelo Markov para probar" : "There is not Markov model to test"
      console.error(errorMsg);
    }
    
    const distributions = {};
    const x = {};
    let c = 0;
    const values = Object.values(testMarkov);
    for (let v of values) {
      for (let p of v.probs) {
        const aprox = (Math.round(p / 0.05) *  0.05).toFixed(2);
        x[c] = aprox;
        c++;
        if (distributions[aprox] === undefined) {
          distributions[aprox] = 1;
        } else {
          distributions[aprox]++;
        }
      }
    }

    console.log("------------------------------------ DIST ------------------------------------");
    const max = Math.max(...Object.values(distributions));
    const sorted = Object.entries(distributions).sort((a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0);
    for (let d of sorted) {
      console.log(`${d[0]}... ${"|".repeat(Math.ceil(d[1] * 100 / max))}`);
    }
    console.log("------------------------------------ DIST ------------------------------------");

    return this
  }

  // DRAW IMAGES
  async showIgrama(layers, cont) {
    const width = this.igrama.metadata.width;
    const height = this.igrama.metadata.height;
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, width, height);

    await this.drawLayers(layers, ctx);

    const dataUrl = canvas.toDataURL();
    const img = new Image();
    img.src = dataUrl;
    if (cont == undefined) {
      document.body.appendChild(img);
    } else {
      document.getElementById(cont).appendChild(img);
    }
    canvas.remove();
  }

  getIgramaText(layers) {
    const text = layers.map(d => d.attribute).reverse().join(' ');
    return text
  }

  async drawLayers(layers, ctx) {
    for (let [index, layer] of layers.entries()) {
      if (layer.type === 'url') {
        const {w, h, x, y} = this.igrama.sections[index];
        if (this.imgsMemo[layer.content] === undefined) {
          const img = new Image();
          img.src = layer.content;
          this.imgsMemo[layer.content] = await new Promise(resolve => {
            img.addEventListener('load',() => {resolve(img)}, false)
          });
          // img.remove();
        }
        ctx.drawImage(this.imgsMemo[layer.content], x, y, w, h);
      } else if (layer.type == 'vector') {
        for (let doodle of layer.content) {
          if (doodle.length === 0) continue
          const spline = this.getSpline(doodle);
          this.drawSpline(spline, ctx, doodle.color, doodle.weight);        
        }
      }
    }
  }

  drawSpline(spline, ctx, color, weight) {
    ctx.lineWidth = weight;
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath();
    for (let i = 0; i < spline.length; i++) {
      if (i === 0) {
        ctx.moveTo(...spline[0]);
      } else {
        ctx.lineTo(...spline[i])
      }
    }
    ctx.stroke();
  }
  
  getSpline(points) {
    let spline = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p = [];
      p[0] = i > 0 ? points[i - 1] : points[0];
      p[1] = points[i];
      p[2] = points[i + 1];
      p[3] = i < points.length - 2 ? points[i + 2] : points[points.length -1];
      
      for (let t = 0; t < 1; t += 0.05) {
        const s = this.getSplinePoint(t, p);
        spline.push(s);			
      }
    }
    return spline
  }
  
  getSplinePoint(t, p) {
    const p1 = Math.floor(t) + 1;
    const p2 = p1 + 1;
    const p3 = p2 + 1;
    const p0 = p1 - 1;
  
    const tt = t * t;
    const ttt = tt * t;
  
    const q1 = -ttt + 2.0*tt - t;
    const q2 = 3.0*ttt - 5.0*tt + 2.0;
    const q3 = -3.0*ttt + 4.0*tt + t;
    const q4 = ttt - tt;
  
    const tx = 0.5 * (p[p0][0] * q1 + p[p1][0] * q2 + p[p2][0] * q3 + p[p3][0] * q4);
    const ty = 0.5 * (p[p0][1] * q1 + p[p1][1] * q2 + p[p2][1] * q3 + p[p3][1] * q4);
  
    return [tx,ty]
  }
  
  // INTERACTIVE STORY DOM UTILITIES

  setCSS() {
    const css = document.createElement('style');
    css.id = "adventurestyle";
    css.innerHTML = defaultStyling;
    document.getElementsByTagName("head")[0].appendChild(css);
  }
}

const defaultStyling = 
`#storygeneraldiv {
  box-sizing: border-box;
  margin: auto;
  max-width: 600px;
  font-family: 'Courier New', Courier, monospace;
}
#storydiv {
  border: solid black 1px;
  width: 100%;
}
.storyp {
  min-height: 40px;
  padding: 0px 10px;
  font-size: 18px;
}
.storybutton {
  padding: 3px;
  background: white;
  box-shadow: none;
  border: solid 1px;
  margin: 0px 1em 0px 0px;
  font-size: 20px;
  font-family: 'Courier New', Courier, monospace;
}
.storybutton:hover {
  color: white;
  background: black;
}

.storyimage-container {
  box-sizing: content-box;
  position: relative;
  padding: 10px;
  max-width: 100%;
  max-height: 70vh;
  margin: auto;
  display: flex;
}

.storyimage {
  justify-content: center;
  max-width: 100%;
  max-height: 70vh;
  margin: auto;
  border-radius: 20px;
  display: block;
}

.storyimage-area {
  position: absolute;
  cursor: pointer;
  text-align: center;
  color: red;
  background: black;
  border-radius: 100px;
}

.storyimage-area:hover {
  background: white;
  color: black;
}

@media screen and (max-device-width: 500px) {
  #storygeneraldiv {
    max-width:100%;
  }
  .storyimage {
    max-width: 100%;
  }
  .storyp {
    font-size: 7vw;
  }
  .storybutton {
    font-size: 10vw;
  }
}
`

/*
CHANGELOG
historia interactiva
- sceneCallback: devuelve la escena actual
- setAreas: se pueden ajustar áreas con botones
- las imágenes se precargan para que sea más fluida la interacción
markov
- corregido el error de separación de las cadenas de markov
- guarda el número de ngramas en el nombre del filename del modelo markov

POR HACER
- Documentación de igramas y cadenas de markov
- Poder hacer escenas con opciones que no tengan pantalla de retroalimentación
- Integrar igramas a historias interactivas
*/