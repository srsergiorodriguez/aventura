/*
Aventura v2.2.0
A library for making biterature / Una librería para hacer biteratura
Copyright (c) 2020 - 2021 Sergio Rodríguez Gómez // https://github.com/srsergiorodriguez
Released under MIT License
*/

class Aventura {
  constructor(lang = 'en',options) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : 'en';
    this.options = {
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined
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
    this.cadenaMarkov = this.markovChain;
    this.probarDistribuciones = this.testDistributions;
  }

  // MAIN INPUT FUNCTIONS

  setGrammar(grammar) {
    this.grammar = grammar;
    return this
  }

  setScenes(scenes) {
    this.scenes = scenes;
    for (let key of Object.keys(scenes)) {
      this.scenes[key].key = key;
    }
    return this
  }

  expandGrammar(start) {
    const firstString = this.selectGrammarRule(this.grammar[start]);
    return this.grammarRuleRecursion(firstString);
  }

  grammarRuleRecursion(string) {
    let newstring = this.setNewRules(string); // Clean string from recursive rules and create the rules
    const ruleList = newstring.match(/<[\w\d.,/#]+>/gi); // Create a list of rules to be developed from the string
    if (!ruleList) {return newstring} // Return the string if there are no new rules to develop
    for (let rule of ruleList) {
      const transformations = this.defineTransformations(rule);
      newstring = newstring.replace(rule,()=>{
        rule = rule.replace(/[<>]/gi,""); // delete <> symbols
        rule = rule.replace(/#[\w\d.,/]+#/g,""); // delete transformation definition
        const ruleArray = rule.search(/[.]/)>-1 ? 
        this.getNestedObject(this.grammar,rule.match(/[\w\d]+/g)) : // if there is a path for the rule
        this.grammar[rule]; // if the rule can be accesed directly
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
    return this.grammarRuleRecursion(newstring);
  }

  // GRAMMAR RULE CREATION

  setNewRules(string) {
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
          this.grammar[symbol] = this.grammar[symbol] || {};
          // asign key-value pairs to symbol
          for (let p of pairs) {
            const ruleArray = this.grammar[p.value];
            if (!ruleArray) {
              const errorMsg = this.lang === 'es' ? 
                `Se intentó crear la nueva regla "${symbol}", pero no se pudo encontrar "${p.value}" para producir la subregla "${p.key}"` 
                : `Tried to create new rule: "${symbol}", but couldn't find "${p.value}" to produce "${p.key}" subrule`;
              console.error(errorMsg);
            };
            this.grammar[symbol][p.key] = [this.selectGrammarRule(ruleArray)];
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

    const storydiv = document.createElement("div");
    storydiv.id = "storydiv";
    generaldiv.appendChild(storydiv);

    // Create image (if there's a path available)
    if (scene.image || scene.imagen) {
      const image = document.createElement("img");
      image.className = "storyimage";
      image.src = scene.image || scene.imagen;
      storydiv.appendChild(image);
    }

    // Create text paragraph
    const paragraph = document.createElement("p");
    paragraph.className = "storyp";
    paragraph.innerHTML = "";
    storydiv.appendChild(paragraph);

    this.typewriter(paragraph,scene);
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
      this.saveJSON(mProbs, "markovModel");
    }
    
    return mProbs;
  }

  // MARKOV CHAIN

  markovChain(model, chainLength, seed, newLineProbability = 0.1) {
    // Create a Markov sequence of the defined length
    let result = seed === undefined || model[seed] === undefined ? Object.keys(model)[Math.floor(Math.random() * Object.keys(model).length)] : seed;
    let currentGram = result;
  
    for (let chain = 0; chain < chainLength - 1; chain++) {
      let nextWord = this.getNextMarkov(model[currentGram]);
      if (nextWord === undefined) {
        nextWord = this.getNextMarkov(model[Object.keys(model)[Math.floor(Math.random() * Object.keys(model).length)]]);
      }
      currentGram = `${currentGram.split(/\s+/).slice(1).join(" ")} ${nextWord}`;
      result += ` ${nextWord}`;
    }
  
    const formatted = this.formatMarkov(result, newLineProbability);
  
    return formatted
  }

  // MARKOV UTILITIES

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

  testDistributions(model) {
    const distributions = {};
    const x = {};
    let c = 0;
    const values = Object.values(model);
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

    return distributions
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
.storyimage {
  max-width: 100%;
  max-height: 70vh;
  display: block;
  margin-left: auto;
  margin-right: auto;
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