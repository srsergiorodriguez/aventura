/*
Aventura v2.3.5
A library for making biterature / Una librería para hacer biteratura
Copyright (c) 2020 - 2022 Sergio Rodríguez Gómez // https://github.com/srsergiorodriguez
Released under MIT License
*/

/*
CHANGELOG
historia interactiva
- sceneCallback: devuelve la escena actual
- setAreas: se pueden ajustar áreas con botones
- las imágenes se precargan para que sea más fluida la interacción
markov
- corregido el error de separación de las cadenas de markov
- guarda el número de ngramas en el nombre del filename del modelo markov
- cargar modelo debe ser incluir la extension en el path
- ahora se pueden hacer igramas con gifs pero mostrar igrama tiene este orden (resultado, formato, contenedor)
- se pueden quitar elementos de las arrays sobre la marcha cuando se crean nuevas reglas (poniendo  un '-' antes del key)

POR HACER
- Documentación de igramas y cadenas de markov
- Documentación de áreas

- Poder hacer escenas con opciones que no tengan pantalla de retroalimentación !!!!!!
- Integrar igramas a historias interactivas !!!!!!
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
    this.modeloMarkov = this.getMarkovModel;
    this.fijarMarkov = this.setMarkov;
    this.cadenaMarkov = this.markovChain;
    this.probarDistribucion = this.testDistribution;
    this.markovSeparator = /[^\S\r\n]+/i;

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
    let grammar = g || this.grammar;
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
    const rules = newstring.match(/\$[\w\d]+\$\[[\w\d:,-]+\]/ig);
    if (rules) {
      while (rules.length) {
        const newrule = rules.pop(); // remove top rule from rule list
        newstring = newstring.replace(newrule,""); // remove rule text string from original string
        const { symbol, pairsString } = /\$(?<symbol>[\w\d]+)\$\[(?<pairsString>[\w\d:,-]+)\]/i.exec(newrule).groups; // get symbol and string of listed values
        const pairs = pairsString.match(/[-]?[\w\d]+:[\w\d]+/gi).map(d=>(/(?<remove>[-]?)(?<key>[\w\d]+)[ ]?:[ ]?(?<value>[\w\d]+)/gi.exec(d)).groups); // format the string of listed values into an array of objects
        if (pairs) {
          grammar[symbol] = grammar[symbol] || {};
          // assign key-value pairs to symbol
          for (let p of pairs) {
            const ruleArray = grammar[p.value];
            if (!ruleArray) {
              const errorMsg = this.lang === 'es' ? 
                `Se intentó crear la nueva regla "${symbol}", pero no se pudo encontrar "${p.value}" para producir la subregla "${p.key}"` 
                : `Tried to create new rule: "${symbol}", but couldn't find "${p.value}" to produce "${p.key}" subrule`;
              console.error(errorMsg);
            };
            const remove = p.remove === '-' ? true : false; // if the symbol '-' is present before the key, remove the choice from the rulearray
            const assigned = this.selectGrammarRule(ruleArray);
            if (remove) {
              const choiceIndex = ruleArray.indexOf(assigned);
              grammar[p.value] = [...ruleArray.slice(0, choiceIndex), ...ruleArray.slice(choiceIndex + 1)];
            }
            grammar[symbol][p.key] = [assigned];
          }
        }
      }
    }
    return newstring;
  }

  // INTERACTIVE STORY

  startAdventure(start) {
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
    if (array.length === 0) return ''
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
    const choiceIndex = Math.floor(Math.random()*array.length);
    const choice = array[choiceIndex];
    return choice
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
    let text = await (await fetch(`./${filename}`)).text();
    text = text.replace(/([,:.;])/g, " $1").replace(/[()\¿¡!?”“—-]/g, "").toLowerCase();
  
    const words = text.split(this.markovSeparator);
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
      this.saveJSON(mProbs, `${filenameParts[filenameParts.length-1]}_markovModel_${ngram}N.json`);
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
      let tempList = currentGram.split(this.markovSeparator);
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
      type: "application/json"
    }));
    a.setAttribute("download", `${filename.includes('.json') ? filename : filename+'.json'}`);
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
  async showIgrama(layers, format = 'png', cont) {
    const dataUrl = await this.igramaDataUrl(layers, format);
    const img = new Image();
    img.src = dataUrl;
    if (cont == undefined) {
      document.body.appendChild(img);
    } else {
      document.getElementById(cont).appendChild(img);
    }
  }

  async igramaDataUrl(layers, format = 'png') {
    const width = this.igrama.metadata.width;
    const height = this.igrama.metadata.height;
    let canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.fillStyle = this.igrama.metadata.bg || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    await this.drawLayers(layers, ctx);

    let dataUrl;
    if (format === 'png') {
      dataUrl = canvas.toDataURL();
    } else if (format === 'gif') {
      const options = {
        colorResolution: 7,
        dither: false,
        delay: 50,
      }
      const gif = new MiniGif(options);
      gif.addFrame(canvas);
      const layerWiggle = this.getLayerWiggle(layers);
      ctx.fillStyle = this.igrama.metadata.bg || '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      await this.drawLayers(layerWiggle, ctx);
      gif.addFrame(canvas);
      const buffer = gif.makeGif();
      const base64 = await this.base64_arraybuffer(buffer);
      dataUrl = "data:image/gif;base64," + base64;     
    }
    canvas.remove(); 
    return dataUrl
  }

  async base64_arraybuffer(data) {
    const base64url = await new Promise((r) => {
      const reader = new FileReader()
      reader.onload = () => r(reader.result)
      reader.readAsDataURL(new Blob([data]))
    })
    return base64url.split(",", 2)[1]
  }

  getLayerWiggle(layers) {
    const r = 3;
    const layerWiggle = JSON.parse(JSON.stringify(layers));
    const rndRng = (a, b) => Math.floor(a + (Math.random() * (b - a)));
    for (let [i, layer] of layerWiggle.entries()) {
      if (layer.type === 'vector') {
        for (let [j, doodle] of layer.content.entries()) {
          for (let [k, v] of doodle.entries()) {
            let rnd = Math.random();
            if (rnd < 0.5) {
              v[0] += rndRng(-r, r);
            } else {
              v[1] += rndRng(-r, r);	
            }
          }
          doodle.color = layers[i].content[j].color;
          doodle.weight = layers[i].content[j].weight;
        }
      }
    }
    return layerWiggle
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

/// MINIGIF!

class MiniGif {
  /* 
  MiniGif 
  v.1.0.0
  By Sergio Rodríguez Gómez
  MIT LICENSE
  https://github.com/srsergiorodriguez/
  */
  constructor(options = {}) {
    this.colorResolution = Math.max(1, Math.min(7, options.colorResolution || 2));
    this.colorTableSize = Math.pow(2, this.colorResolution + 1);
    this.colorTableBytes = this.colorTableSize * 3;
    this.customPalette = options.customPalette || undefined;
    this.fileName = options.fileName || 'minigif';

    this.delay = options.delay || 50;
    this.transparent = options.transparent || false;
    this.transparentIndex = options.transparentIndex || 0;
    this.dither = options.dither || false;

    this.width;
    this.height;

    this.globalColorTable;
    this.framesPixels = [];
    this.framesImageData = [];
    this.allPixels = []; // para poner todos los pixels de todas las imágenes y hacer la quantización
  }

  async addFrameFromPath(path) {
    const img = new Image();
    img.src = path;
    await new Promise(r => {img.onload = function() {r(true)}});
    this.addFrame(img);
  }

  addFrame(frame) {
    let canvas;
    let context;
    if (frame instanceof HTMLCanvasElement) {
      canvas = frame;
      context = canvas.getContext("2d");
    } else if (frame instanceof HTMLImageElement) {
      const img = frame;
      canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      img.remove();
    } else {
      console.error(`Frame must be a canvas or img element.
      If you want to add a frame from an image path use addFrameFromPath async function`);
    }

    if (this.width === undefined || this.height === undefined) {
      this.width = canvas.width;
      this.height = canvas.height;
    }
  
    const imageDataObject = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageDataObject.data;
    this.framesPixels.push(pixels);
    this.allPixels = [...this.allPixels, ...pixels];

    if (!(frame instanceof HTMLCanvasElement)) {
      canvas.remove();
    }
    return pixels
  }

  makeGif() {
    const colors = this.customPalette || this.medianCutColors(this.allPixels);
    this.globalColorTable = this.getColorTable(colors);
    const codeTableData = this.getCodeTable(colors);

    for (let i = 0; i < this.framesPixels.length; i++) {
      this.framesPixels[i] = this.dither === true ? this.errorDiffusionDither(this.framesPixels[i], colors) : this.framesPixels[i];
      const [quantizedPixels, indexStream] = this.simpleQuantize(this.framesPixels[i], colors);
      const codeStream = this.getCodeStream(indexStream, codeTableData);
      this.framesImageData[i] = this.getImageData(codeStream);
    }

    const binaryBuffer = this.structureGif();
    return binaryBuffer
  }

  getColorTable(colors) {
    const globalColorTable = new Uint8Array(this.colorTableBytes);
    let offset = 0;
    const flatColors = colors.flat();
    for (let i = 0; i < flatColors.length; i++) {
      if (i % 4 !== 3) {
        globalColorTable[i - offset] = flatColors[i];
      } else {
        offset++; // compensa canal alpha
      }
    }
    return globalColorTable
  }

  getCodeTable(colors) {
    const codeTableDict = {};
    for (let i = 0; i < colors.length; i++) {
      codeTableDict[i] = i;
    }
    codeTableDict[colors.length] = 'CC';
    codeTableDict[colors.length + 1] = 'EOI';
    return {CCindex: colors.length, EOIindex: colors.length + 1, codeTableDict}
  }

  getCodeStream(indexStream, codeTableData) {
    // codifica el indexStream usando el algoritmo LZW y ajusta los tamaños de los códigos variables
    let {CCindex, EOIindex, codeTableDict} = JSON.parse(JSON.stringify(codeTableData));
    const resetCodeTableData = JSON.parse(JSON.stringify(codeTableData));
    const minimumCodeSize = Math.max(2, this.colorResolution + 1);
    let lastCodeSize;
    let streamStart = 0;

    ///////
    const byteSize = 8;
    let bytesStream = [0];
    const bytemask = 0b11111111;
    let numCount = 0; // counter of current byte being written
    let displace = 0;
    
    function addCode(code, codeSize) {
      const newCode = code << displace;
      const bitsAvailable = byteSize - displace; // bits available in current byte
      if (bitsAvailable <= codeSize) { // there is not enough space for new code in byte
        bytesStream[numCount] = (bytesStream[numCount] | newCode) & bytemask; // add all bits possible and crop

        let fraction = code >>> bitsAvailable;
        let tempDisplace = codeSize - bitsAvailable;
        numCount++; // advance to next byte
        bytesStream[numCount] = fraction & bytemask;

        while (tempDisplace >= byteSize) {
          fraction = fraction >>> byteSize;
          numCount++; // advance to next byte
          bytesStream[numCount] = fraction & bytemask;
          tempDisplace -= byteSize;
        }
        displace = tempDisplace;
      } else { // there is space for complete new code in byte
        bytesStream[numCount] = bytesStream[numCount] | newCode;
        displace += codeSize;
      }
    }

    ///////
    addCode(CCindex, minimumCodeSize + 1);
    while (streamStart <= indexStream.length) {
      codeTableDict = JSON.parse(JSON.stringify(resetCodeTableData.codeTableDict));
      let currentCodeSize = minimumCodeSize + 1;
      let codeLengthCounter = EOIindex;
  
      let indexBuffer = indexStream[streamStart];
      let i = streamStart + 1;
      while (codeLengthCounter < Math.pow(2,12) && i < indexStream.length) {
        const k = indexStream[i];
        const combination = `${indexBuffer},${k}`;

        if (codeTableDict[combination] !== undefined) {
          indexBuffer = combination;
        } else {
          codeLengthCounter++;
          if (codeLengthCounter >= Math.pow(2, currentCodeSize) + 1) currentCodeSize++;
          const dictValue = codeTableDict[indexBuffer];
          codeTableDict[combination] = codeLengthCounter;
          addCode(dictValue, currentCodeSize);
          indexBuffer = k;
        }
        i++;
      }

      addCode(codeTableDict[indexBuffer], currentCodeSize);
      streamStart = i;
      if (i >= indexStream.length) {
        lastCodeSize = currentCodeSize;
        break
      }
      addCode(CCindex, currentCodeSize);
    }
    addCode(EOIindex, lastCodeSize);
    return bytesStream
  }

  getImageData(bytesStream) {
    // une los bits que tienen largos variables en bytes
    let bytes = [...bytesStream];

    // bloques de máximo 255 bytes, antecedidos por el tamaño. Entonces total 256 bytes máx
    const minimumCodeSize = Math.max(2, this.colorResolution + 1); // LZW minimum code size, esto va primero en el imageData
    let imageData = [minimumCodeSize];
    const maxBlockSize = 255;
    for (let i = 0; i < Math.ceil(bytes.length / maxBlockSize); i++) {
      let block = bytes.slice(i * maxBlockSize, (i + 1) * maxBlockSize);
      block = [block.length, ...block];
      imageData = [...imageData, ...block];
      
    }
    imageData.push(0) // block terminator, esto muestra que terminó el imageData
    return new Uint8Array(imageData)
  }

  download(buffer) {
    const blob = new Blob([buffer]);
    const fileName = `${this.fileName}.gif`;
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  structureGif() {
    const packedField = parseInt(`1${this.toBin(this.colorResolution, 3)}0${this.toBin(this.colorResolution,3)}`, 2);
    const header = concatArrayBuffers(...[
      //header
      rawString('GIF89a'),
      // logical screen descriptor
      U16LE(this.width),
      U16LE(this.height),
      U8(packedField),
      U8(0),
      U8(0)
    ]);
  
    // global color table here

    const loopRepetitions = 0; // 0 es infinito
    const applicationExtension = concatArrayBuffers(...[
      U8(33), // 33 (hex 0x21) GIF Extension code
      U8(255), // 255 (hex 0xFF) Application Extension Label
      U8(11), // 11 (hex 0x0B) Length of Application Block
      rawString('NETSCAPE2.0'),
      U8(3), // 3 (hex 0x03) Length of Data Sub-Block
      U8(1), // 1 (hex 0x01)
      U16LE(loopRepetitions),
      U8(0) // terminator
    ]);

    // PARA CADA IMAGEN DE LA ANIMACIÓN HAY QUE HACER ESTAS TRES: graphicsColorExtension, imageDescriptor, imageData
    const transparentFlag = this.transparent === true ? 1 : 0;
    const disposal = 1; // forma en la que se dibujan las siguientes imágenes 1 es dibujar encima, 2 es borrar el canvas, 3 restore
    const graphicsControlPackedField = parseInt(`00000${disposal}0${transparentFlag}`, 2);
    const imageDescriptorPackedField = parseInt(`000000000`, 2);

    const globalImageData = [];
    for (let i = 0; i < this.framesImageData.length; i++) {

      const graphicsControlExtension = concatArrayBuffers(...[
        U8(33), // Extension introducer - always 21 hex
        U8(249), // Graphic Control label - always f9 hex
        U8(4), // Byte size
        U8(graphicsControlPackedField),
        U16LE(this.delay), // Delay time
        U8(this.transparentIndex), // Transparent color index
        U8(0) // Block terminator - always 0
      ]);
      globalImageData.push(graphicsControlExtension);
      
      const imageDescriptor = concatArrayBuffers(...[
        U8(44), // Image Separator - always 2C hex
        U16LE(0), // Image left,
        U16LE(0), // ImageTop,
        U16LE(this.width), // Width,
        U16LE(this.height), // Height
        U8(imageDescriptorPackedField),
      ]);

      globalImageData.push(imageDescriptor);

      // image data here
      globalImageData.push(this.framesImageData[i]);
    }
    
    const trailer = new Uint8Array([59]) // 3b hex semicolon indicating end of file
  
    const gifFile = concatArrayBuffers(...[
      header,
      this.globalColorTable,
      applicationExtension,
      ...globalImageData,
      trailer
    ]);
    
    return gifFile

    // ARRAYBUFFER HELPERS
    function concatArrayBuffers(...bufs){
      const result = new Uint8Array(bufs.reduce((totalSize, buf)=>totalSize+buf.byteLength,0));
      bufs.reduce((offset, buf)=>{
        result.set(buf,offset);
        return offset+buf.byteLength
      },0)
      return result
    }

    function U16LE(v) {
      const bytes = v.toString(2).padStart(16,'0');
      const a = parseInt(bytes.slice(0, 8), 2);
      const b = parseInt(bytes.slice(-8), 2);
      return new Uint8Array([b, a]);
    }

    function U8(v) { return new Uint8Array([v]) }

    function rawString(str) {
      const buffer = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        buffer[i] = str.slice(i, i+1).charCodeAt(0);
      }
      return buffer
    }
  }

  /// IMAGE MANIPULATION
  maskLSB(pixels) {
    // quita los least significant bits de la imagen
    const mask = 0b11110000;
    for (let i = 0; i < pixels.length; i++) {
      if (i % 4 !== 3) {
        pixels[i] = pixels[i] & mask;
      }
    }
    return pixels
  }

  errorDiffusionDither(pixels, colors) { // FALTA REVISAR ESTO DE NUEVO, no funciona bien, pero hace severos glitches 
    const errorDiff = [7/16,3/16,5/16];
    const nIndexes = [[1,0],[-1, 1],[0, 1]];
    const calculateError = (c1, c2) => c1.map((d, i) => d - c2[i]);

    for (let index = 0; index < pixels.length; index += 4) {
      const currentPixel = [pixels[index + 0], pixels[index + 1], pixels[index + 2], 255];        
      const [closest] = this.findClosest(currentPixel, colors);
      const error = calculateError(currentPixel, closest);

      for (let i = 0; i < 3; i++) { pixels[index + i] = closest[i] }
      
      const x = Math.floor(index % this.width);
      const y = Math.floor(index / this.width);
      for (let j = 0; j < nIndexes.length; j++) {
        const nh = (x + (nIndexes[j][0]) * 4) + ((y + (nIndexes[j][1]) * 4) * this.width);
        for (let i = 0; i < 3; i++) {
          pixels[nh + i] = pixels[nh + i] + (error[i] * errorDiff[i]);
        }
      }
    }
  
    return pixels
  }

  simpleQuantize(pixels, colors) {
    // returns image data object and index stream of colors in color table
    const indexStream = [];
    
    for (let index = 0; index < pixels.length; index += 4) {
      const currentPixel = [pixels[index + 0], pixels[index + 1], pixels[index + 2], 255];
      const [closest, colorIndex] = this.findClosest(currentPixel, colors);
      for (let i = 0; i < 3; i++) {pixels[index + i] = closest[i]}
      indexStream.push(colorIndex);      
    }

    return [pixels, indexStream]
  }

  getIndexStream(pixels, colors) {
    // pixels must be in rgba
    const indexStream = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const pixel = [];
      for (let j = 0; j < 4; j++) { pixel.push(pixels[i + j]) }
      const index = this.getIndex(pixel, colors);
      indexStream.push(index);
    }
    return indexStream
  }

  findClosest(c, base) {
    let index = 0;
    let minDistance = Infinity;
    for (let i = 0; i < base.length; i++) {
      const distance = this.euclideanDistance(c, base[i]);
      if (distance < minDistance) {
        minDistance = distance;
        index = i;
      }
    }
    return [[...base[index], 255], index]
  }
  
  euclideanDistance(c1, c2) {
    const a = c1[0] - c2[0];
    const b = c1[1] - c2[1];
    const c = c1[2] - c2[2];
    return ((a * a) + (b * b) + (c * c));
  }

  medianCutColors(pixels) {
    const targetBins = this.colorTableSize;
  
    const cols = [[]];  
    let counter = 0;
    for (let i = 0; i < pixels.length; i++) { // crear el primer bin a partir de los pixels
      if (i % 4 === 0) {
        cols[counter][0] = pixels[i];
      } else if (i % 4 === 1) {
        cols[counter][1] = pixels[i];
      } else if (i % 4 === 2) {
        cols[counter][2] = pixels[i];
      } else if (i % 4 === 3) {
        counter++;
        cols[counter] = [];
      }
    }
    cols.pop(); //quitar el último objeto que se creó por el alpha sobrante
  
    // recursion
    const bins = medianCutRecursion([cols], targetBins);
    return averageBins(bins);
  
    function averageBins() {
      const averages = [];
      for (let bin of bins) {
        const channels = {r:[], g:[], b:[]};
        for (let ch of bin) {
          channels.r.push(ch[0]);
          channels.g.push(ch[1]);
          channels.b.push(ch[2]);
        }
        const avg = [stats(channels.r).avg, stats(channels.g).avg, stats(channels.b).avg, 255];
        averages.push(avg);
      }
      return averages
    }
  
    function medianCutRecursion(bins, targetBins) {
      if (bins.length >= targetBins) return bins
  
      let newBins = [];
      for (let bin of bins) {
        const channels = {r:[], g:[], b:[]};
        for (let ch of bin) {
          channels.r.push(ch[0]);
          channels.g.push(ch[1]);
          channels.b.push(ch[2]);
        }
        
        const maxRangeI = stats([stats(channels.r).range, stats(channels.g).range, stats(channels.b).range]).maxI; // index of channel with maxrange
        const sorted = bin.sort((a,b)=> a[maxRangeI] - b[maxRangeI]); // ascendente
        newBins.push(
          sorted.slice(0, Math.floor(sorted.length/2)), // primera mitad
          sorted.slice(Math.floor(sorted.length/2)) // segunda mitad
        )
      }
      return medianCutRecursion(newBins, targetBins);
    }

    function stats(arr) {
      let max = -Number.MAX_VALUE, min = Number.MAX_VALUE;
      let minI = 0, maxI = 0;
      let sum = 0;
      arr.forEach((e, i) => {
        sum += e;
        if (max < e) {
          max = e;
          maxI = i;
        }
        if (min > e) {
          min = e;
          minI = i;
        }
      })
      return {min, max, minI, maxI, range: max-min, avg: Math.floor(sum/arr.length)}
    }
  }

  // HELPERS
  getIndex(r, table) {
    let index = 0;
    for (let i = 0; i < table.length; i++) {
      const t = table[i];
      let isCol = true;
      for (let j = 0; j < r.length; j++) {
        if (r[j] !== t[j]) isCol = false;
      }
      if (isCol) {
        index = i;
        break
      }
    }
    return index
  }

  toBin(v, pad = 0) {return (v).toString(2).padStart(pad,'0')}
}