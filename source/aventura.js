class Aventura {
  /*
  Aventura.js 1.0
  A library of biterature
  Copyright (c) 2019 Sergio Rodríguez Gómez / https://meanmeaning.com
  Released under MIT License
  */
  constructor(lang = 'en') {
    this.lang = (lang === 'en' || lang === 'es') ? lang : undefined;
    if (!this.lang) {console.log('Incorrect language / lenguaje incorrecto')}
  }

  setScenes(scenes) {
    let keys = Object.keys(scenes);
    this.scenes = scenes;
    for (let i=0;i<keys.length;i++) {
      this.scenes[keys[i]].key = keys[i];
    }
  }

  promptAdventure() {
    if (this.lang === undefined) {console.log("Tura.js: Language undefined / lenguaje indefinido");return}
    document.title = this.scenes.cover.title.toUpperCase();
    alert(`${this.scenes.cover.title.toUpperCase()}\n${this.scenes.cover.subtitle}`);
    alert(this.scenes.intro.text);
    this.goToScene_prompt(this.scenes.start);
  }

  goToScene_prompt(s) {
    const endAdventure = function(e) {
      alert(e.end.text);
      let credits = e.credits.text;
      for (let a in e.credits.authors) {
        credits+=`\n${e.credits.authors[a]}`;
      }
      credits+=`\n${e.credits.year}`
      alert(credits);
    }
    const ormsg = this.lang === 'en' ? 'or' : 'o';
    const response = prompt(`${s.text}\n${s.optionA} ${ormsg} ${s.optionB}`);
    if (response == s.optionA) {
      alert(s.messageA);
      if (s.sceneA=='end') {
        endAdventure(this.scenes);
      } else {
        this.goToScene_prompt(this.scenes[s.sceneA]);
      }
    } else if (response == s.optionB) {
      alert(s.messageB);
      if (s.sceneB=='end') {
        endAdventure(this.scenes);
      } else {
        this.goToScene_prompt(this.scenes[s.sceneB]);
      }
    } else if (response == null) {
      let exitmsg = this.lang === 'en' ? "You quit the game." : "Saliste del juego";
      alert(exitmsg);
      let repeatmsg = this.lang === 'en' ? "Do you want to try again?" : "¿Quieres volver a jugar?";
      let repeat = confirm(repeatmsg);
      if (repeat) {
        this.goToScene_prompt(this.scenes.start);
      }
    } else {
      let optsmsg = this.lang === 'en' ? `Invalid answer, you must choose either ${s.optionA} or ${s.optionB}.` : `Respuesta inválida, debes escoger entre ${s.optionA} o ${s.optionB}`;
      alert(optsmsg);
      this.goToScene_prompt(s);
    }
  }

  domAdventure(container) {
    if (this.lang === undefined) {console.log("Tura.js: Language undefined / lenguaje indefinido");return}
    document.title = this.scenes.cover.title.toUpperCase();
    let css = document.createElement('style');
    css.id = "adventurestyle";
    css.type = 'text/css'; 
    let styles = `
      #storygeneraldiv {
        box-sizing: border-box;
        margin:auto;
      }
      #storydiv {
        border: solid black 1px;
      }
      .storyp {
        box-sizing: border-box;
        font-size: 16px;
        padding: 10px;
        font-family: 'Courier New', Courier, monospace;
      }
      .storybutton {
        font-family: 'Courier New', Courier, monospace;
        font-size:18px;
        background:white;
        box-shadow:none;
        border:solid 1px;
        margin:0px 0px;
        float:right;
      }
      .storybutton:hover {
        color:white;
        background:#111111;
      }`;
    css.innerHTML = styles;
    document.getElementsByTagName("head")[0].appendChild(css);

    let generaldiv = document.createElement("div");
    generaldiv.id = "storygeneraldiv";
    generaldiv.style.width = document.body.clientWidth<500 ? document.body.clientWidth+"px" : "500px";
    document.body.appendChild(generaldiv);

    if (container) {
      let cont = document.getElementById(container);
      document.cont.appendChild(cont);
    }
    
    let cover = {text:`${this.scenes.cover.title.toUpperCase()}<br>${this.scenes.cover.subtitle}`};
    this.scenes.intro.continuation = 'start';
    this.scenes.end.continuation = 'credits';
    let credits = this.scenes.credits.text;
      for (let a in this.scenes.credits.authors) {
        credits+=`<br>${this.scenes.credits.authors[a]}`;
      }
      credits+=`<br>${this.scenes.credits.year}`
    this.scenes.credits.text = credits;
    this.goToScene_dom(cover,cover.text,()=>{this.continueButton(this.scenes.intro,'continue')});
  }

  overrideStyle(styles) {
    let css = document.getElementById("adventurestyle");
    css.innerHTML = styles;
  }

  goToScene_dom(s,text,callback) {
    let generaldiv = document.getElementById("storygeneraldiv");
    let prevdiv = document.getElementById("storydiv");
    if (prevdiv) {generaldiv.removeChild(prevdiv)};

    let storydiv = document.createElement("div");
    storydiv.id = "storydiv";
    generaldiv.appendChild(storydiv);

    let p = document.createElement("p");
    p.className = "storyp";
    
    p.style.minHeight = "40px";
    p.innerHTML = "";
    storydiv.appendChild(p);

    text = text.replace(/\n/g,'<br>');
    let i = 0;
    let interval = setInterval(()=>{
      let textpart = text.substring(0,i);
      p.innerHTML = textpart;
      i++;
      if (i>text.length) {
        clearInterval(interval);
        if (s.key!='credits') {callback()};
      }
    },50);
  }

  optionButtons(s) {
    let storydiv = document.getElementById("storydiv");
    let optionAButton = document.createElement("button");
    optionAButton.className = "storybutton";
    optionAButton.innerHTML = s.optionA;
    storydiv.appendChild(optionAButton);
    optionAButton.addEventListener("click",()=>{
      let buttonType = s.sceneA == 'end' ? 'continue' : 'options';
      this.goToScene_dom(s,s.messageA,()=>{this.continueButton(this.scenes[s.sceneA],buttonType)});
    });

    let optionBButton = document.createElement("button");
    optionBButton.className = "storybutton";
    optionBButton.innerHTML = s.optionB;
    storydiv.appendChild(optionBButton);
    optionBButton.addEventListener("click",()=>{
      let buttonType = s.sceneB == 'end' ? 'continue' : 'options';
      this.goToScene_dom(s,s.messageB,()=>{this.continueButton(this.scenes[s.sceneB],buttonType)});
    });
  }

  continueButton(s,buttonType = "options") {
    let storydiv = document.getElementById("storydiv");
    let continueText = this.lang === 'en' ? "Continue" : "Continuar";
    let continueButton = document.createElement("button");
    continueButton.className = "storybutton";
    continueButton.innerHTML = continueText;
    storydiv.appendChild(continueButton);
    continueButton.addEventListener("click",()=>{
      if (buttonType == 'continue') {
        this.goToScene_dom(s,s.text,()=>{this.continueButton(this.scenes[s.continuation])});
      }  else {
        this.goToScene_dom(s,s.text,()=>{this.optionButtons(s)});
      }
    });
  }

  setGrammar(grammar) {
    this.grammar = grammar;
  }

  developGrammar(start) {
    if (this.lang === undefined) {console.log("Tura.js: Language undefined / lenguaje indefinido");return}
    let string = this.selectGrammarRule(this.grammar[start]);
    string = this.grammarRuleRecursion(string);
    return string
  }

  selectGrammarRule(array) {
    let string =  array[Math.floor(Math.random()*array.length)];
    return string
  }

  getNestedObject(object, pathArray) {
    return pathArray.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, object);
  }

  defineTransformations(rule) {
    let transformations = {
      capitalize: false,
      allcaps: false 
    }
    let transformationList = rule.match(/#[a-zA-Z1-9,]+#/g);
    if (!transformationList) {
      return transformations 
    } 
    transformationList = transformationList[0].replace(/[#]/g,"");
    transformationList = transformationList.match(/[A-Z]+/g);
    for (let i=0;i<transformationList.length;i++) {
      transformations[transformationList[i].toLowerCase()] = true;
    }
    return transformations;
  }

  transformString(string,transformations) {
    let tempString = string;
    if (transformations.capitalize) {
      tempString = tempString.charAt(0).toUpperCase() + 
      tempString.slice(1);
    }
    if (transformations.allcaps) {
      tempString = tempString.toUpperCase();
    }
    return tempString;
  }

  grammarRuleRecursion(string) {
    string = this.setNewRule(string);
    const ruleList = string.match(/<[a-zA-Z1-9.,/#]+>/gi);
    if (!ruleList) {return string}
    for (let i=0;i<ruleList.length;i++) {
      const transformations = this.defineTransformations(ruleList[i]);
      string = string.replace(ruleList[i],()=>{
        ruleList[i] = ruleList[i].replace(/[<>]/gi,"");
        ruleList[i] = ruleList[i].replace(/#[a-zA-Z1-9.,/]+#/g,"");
        if (ruleList[i].search(/[.]/)>-1) {
          // if there is a path for a rule
          const pathList = ruleList[i].match(/[a-zA-Z1-9]+/g,"");
          const preTransformed = this.selectGrammarRule(this.getNestedObject(this.grammar,pathList));
          return this.transformString(preTransformed,transformations);
        } else {
          // if the rule can be accesed directly
          const preTransformed = this.selectGrammarRule(this.grammar[ruleList[i]]);
          return this.transformString(preTransformed,transformations);
        }
      });
    }
    return this.grammarRuleRecursion(string);
  }

  setNewRule(string) {
    let str = string;
    let rule = str.match(/\$[a-zA-Z1-9]+\$<[a-zA-Z1-9:,]+>/g);
    if (rule) {
      while (rule.length) {
        let tempfixed = rule.pop();
        str = str.replace(tempfixed,"");
        const symbol = tempfixed.match(/\$[a-zA-Z1-9]+\$/gi)[0].replace(/\$/g,"");
        const pairs =  tempfixed.match(/<[a-zA-Z1-9:,]+>/gi)[0].match(/[a-zA-Z1-9]+:[a-zA-Z1-9]+/gi);
        const keys =  pairs.map(d=>d.replace(/:[a-zA-Z1-9,]+/,""));
        const values =  pairs.map(d=>d.replace(/[a-zA-Z1-9]+:/,""));
        this.grammar[symbol] = this.grammar[symbol] ? this.grammar[symbol] : {};
        if (keys && values) {
          for (let i=0;i<keys.length;i++) {
            this.grammar[symbol][keys[i]] = [this.selectGrammarRule(this.grammar[values[i]])];
          }
        }
      }
    }
    return str;
  }
}