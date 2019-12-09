class Aventura {
  /*
  Aventura.js 1.1
  A library of biterature
  Copyright (c) 2019 Sergio Rodríguez Gómez / https://meanmeaning.com
  Released under MIT License
  */
  constructor(lang = 'en',options) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : undefined;
    if (!this.lang) {console.log('Incorrect language / lenguaje incorrecto')}
    this.options = {
      typewriterSpeed: 50,
      style: `
      #storygeneraldiv {
        box-sizing: border-box;
        margin: auto;
        max-width: 600px;
      }
      #storydiv {
        box-sizing: border-box;
        border: solid black 1px;
        width:100%;
      }
      .storyp {
        box-sizing: border-box;
        min-height: 40px;
        padding: 0px 10px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 18px;
      }
      .storybutton {
        padding: 3px:
        background: white;
        box-shadow: none;
        border: solid 1px;
        margin: 0px 1em 0px 0px;
        font-family: 'Courier New', Courier, monospace;
        font-size: 20px;
      }
      .storybutton:hover {
        color: white;
        background: black;
      }
      .storyimage {
        max-width: 100%;
        display: block;
        margin-left: auto;
        margin-right: auto;
      }
      @media screen and (max-device-width: 500px) {
        #storygeneraldiv {
          max-width:100%;
        }
        .storyp {
          font-size: 7vw;
        }
        .storybutton {
          background: white;
          font-size: 10vw;
        }
      }
      `
    }
    if (options) {this.options = Object.assign(this.options,options)}
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
    css.innerHTML = this.options.style;
    document.getElementsByTagName("head")[0].appendChild(css);

    let generaldiv = document.createElement("div");
    generaldiv.id = "storygeneraldiv";
    document.body.appendChild(generaldiv);

    if (container) {
      let cont = document.getElementById(container);
      document.cont.appendChild(cont);
    }

    this.scenes.cover.text = `${this.scenes.cover.title.toUpperCase()}<br>${this.scenes.cover.subtitle}`;
    this.scenes.intro.continuation = 'start';
    this.scenes.end.continuation = 'credits';
    let credits = this.scenes.credits.text;
      for (let a in this.scenes.credits.authors) {
        credits+=`<br>${this.scenes.credits.authors[a]}`;
      }
      credits+=`<br>${this.scenes.credits.year}`
    this.scenes.credits.text = credits;
    this.goToScene_dom(this.scenes.cover,'MAIN',()=>{this.continueButton(this.scenes.intro,'continue')});
  }

  goToScene_dom(s,textType,callback) {
    // Delete previous div containing story display
    let generaldiv = document.getElementById("storygeneraldiv");
    let prevdiv = document.getElementById("storydiv");
    if (prevdiv) {generaldiv.removeChild(prevdiv)};

    let storydiv = document.createElement("div");
    storydiv.id = "storydiv";
    generaldiv.appendChild(storydiv);

    let text;
    let imagePath;
    if (textType == 'MAIN') {
      text = s.text;
      imagePath = s.image;
    } else if (textType == 'A') {
      text = s.messageA;
      imagePath = s.imageA;
    } else if (textType == 'B') {
      text = s.messageB;
      imagePath = s.imageB;
    }

    if (imagePath != undefined) {
      let image = document.createElement("img");
      image.className = "storyimage";
      image.src = imagePath;
      storydiv.appendChild(image);
    }

    let p = document.createElement("p");
    p.className = "storyp";
    p.innerHTML = "";
    storydiv.appendChild(p);
    
    text = text.replace(/\n/g,'<br>');
    if (this.options.typewriterSpeed > 0) {
      let i = 0;
      let interval = setInterval(()=>{
        let textpart = text.substring(0,i);
        p.innerHTML = textpart;
        i++;
        if (i>text.length) {
          clearInterval(interval);
          if (s.key!='credits') {callback()};
        }
      },this.options.typewriterSpeed);
    } else {
      p.innerHTML = text;
      if (s.key!='credits') {callback()};
    }
  }

  optionButtons(s) {
    let storydiv = document.getElementById("storydiv");
    let optionAButton = document.createElement("button");
    optionAButton.className = "storybutton";
    optionAButton.innerHTML = s.optionA;
    storydiv.appendChild(optionAButton);
    optionAButton.addEventListener("click",()=>{
      let buttonType = s.sceneA == 'end' ? 'continue' : 'options';
      this.goToScene_dom(s,'A',()=>{this.continueButton(this.scenes[s.sceneA],buttonType)});
    });

    let optionBButton = document.createElement("button");
    optionBButton.className = "storybutton";
    optionBButton.innerHTML = s.optionB;
    storydiv.appendChild(optionBButton);
    optionBButton.addEventListener("click",()=>{
      let buttonType = s.sceneB == 'end' ? 'continue' : 'options';
      this.goToScene_dom(s,'B',()=>{this.continueButton(this.scenes[s.sceneB],buttonType)});
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
        this.goToScene_dom(s,'MAIN',()=>{this.continueButton(this.scenes[s.continuation])});
      }  else {
        this.goToScene_dom(s,'MAIN',()=>{this.optionButtons(s)});
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