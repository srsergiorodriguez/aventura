/*
Aventura v2.0.1
A library of biterature
Copyright (c) 2020 Sergio Rodríguez Gómez // https://github.com/srsergiorodriguez
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

  // GRAMMAR OUTPUT FUNCTIONS

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
        if (rule.search(/[.]/)>-1) {
          // if there is a path for the rule
          const pathList = rule.match(/[\w\d]+/g);
          const ruleArray = this.getNestedObject(this.grammar,pathList);
          if (!ruleArray) {console.error(`Tried to expand from rule "${rule}", but couldn't find it / Se intentó expandir desde la regla "${rule}", pero no se pudo encontrar`)};
          const preTransformed = this.selectGrammarRule(ruleArray);
          return this.transformString(preTransformed,transformations);
        } else {
          // if the rule can be accesed directly
          const ruleArray = this.grammar[rule];
          if (!ruleArray) {console.error(`Tried to expand from rule "${rule}", but couldn't find it / Se intentó expandir desde la regla "${rule}", pero no se pudo encontrar`)};
          const preTransformed = this.selectGrammarRule(ruleArray);
          return this.transformString(preTransformed,transformations);
        }
      });
    }
    return this.grammarRuleRecursion(newstring);
  }

  // GRAMAR RULE CREATION

  setNewRules(string) {
    // Check if there are recursive rules in a string and add them to the grammar
    // Return the string without recursive rules
    let newstring = string;
    const rules = newstring.match(/\$[\w\d]+\$<[\w\d:,]+>/ig);
    if (rules) {
      while (rules.length) {
        const newrule = rules.pop(); // remove top rule from rule list
        newstring = newstring.replace(newrule,""); // remove rule text string from original string
        const { symbol, pairsString } = /\$(?<symbol>[\w\d]+)\$<(?<pairsString>[\w\d:,]+)>/i.exec(newrule).groups; // get symbol and string of listed values
        const pairs = pairsString.match(/[\w\d]+:[\w\d]+/gi).map(d=>(/(?<key>[\w\d]+)[ ]?:[ ]?(?<value>[\w\d]+)/gi.exec(d)).groups); // format the string of listed values into an array of objects
        if (pairs) {
          this.grammar[symbol] = this.grammar[symbol] || {};
          // asign key-value pairs to symbol
          for (let p of pairs) {
            const ruleArray = this.grammar[p.value];
            if (!ruleArray) {console.error(`Tried to create new rule: "${symbol}", but couldn't find "${p.value}" to produce "${p.key}" subrule / Se intentó crear la nueva regla "${symbol}", pero no se pudo encontrar "${p.value}" para producir la subregla "${p.key}"`)};
            this.grammar[symbol][p.key] = [this.selectGrammarRule(ruleArray)];
          }
        }
      }
    }
    return newstring;
  }

  // INTERACTIVE STORY DOM VERSION

  startAdventure(start) {
    document.title = this.grammar?this.grammarRuleRecursion(this.scenes[start].text):this.scenes[start].text; // Change the title of html page to adventure name
    if (this.options.defaultCSS) {this.setCSS()};

    // Create the div that will contain the adventure
    const generaldiv = document.createElement("div");
    generaldiv.id = "storygeneraldiv";
    const parent = this.options.adventureContainer?document.getElementById(this.options.adventureContainer):document.body;
    parent.appendChild(generaldiv);

    // Start the interactice story display
    this.goToScene_dom(this.scenes[start]);
  }

  goToScene_dom(scene) {
    // Delete previous div containing story display
    const generaldiv = document.getElementById("storygeneraldiv");
    const prevdiv = document.getElementById("storydiv");
    if (prevdiv) {generaldiv.removeChild(prevdiv)};

    const storydiv = document.createElement("div");
    storydiv.id = "storydiv";
    generaldiv.appendChild(storydiv);

    // Create image (if there's a path available)
    if (scene.image) {
      const image = document.createElement("img");
      image.className = "storyimage";
      image.src = scene.image;
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
    let text = this.grammar?this.grammarRuleRecursion(scene.text):scene.text;
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
    if (scene.options) {
      // Create multiple buttons for choosing a new scene path
      for (let option of scene.options) {
        const optionButton = document.createElement("button");
        optionButton.className = "storybutton";
        optionButton.innerHTML = option.button;
        storydiv.appendChild(optionButton);
        optionButton.addEventListener("click",()=>{
          this.goToScene_dom(option);
        });
      }
    } else if (scene.scene) {
      // Create a default continue button
      const continueButton = document.createElement("button");
      continueButton.className = "storybutton";
      continueButton.innerHTML = this.lang === 'en' ? "Continue" : "Continuar";
      storydiv.appendChild(continueButton);
      continueButton.addEventListener("click",()=>{
        this.goToScene_dom(this.scenes[scene.scene]);
      });
    }
  }

  // GRAMAMAR UTILITIES

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

  // INTERACTIVE STORY DEBbUGGING TOOLS

  testScenes(scenes) {
    const testScenes = scenes || this.scenes;
    if (!testScenes) {console.error("There are not scenes to evaluate")};
    let deadEnds = [];
    for (let e of Object.keys(testScenes)) {
      const scene = testScenes[e];
      if (scene.deadEnd) {continue}
      if (scene.options) {
        const filtered = scene.options.filter(d=>!testScenes[d.scene]);
        deadEnds = [...deadEnds,...filtered.map(d=>`${e} => ${d.scene}`)];
      } else {
        if (!testScenes[scene.scene]) {
          deadEnds.push(`${e} => ${scene.scene}`);
        }
      }
    }
    if (deadEnds.length>0) {
      const errorMsg = `The following scenes are dead ends: ${deadEnds.join(", ")} / Las siguientes escenas no llevan a ningún lado: ${deadEnds.join(", ")}`
      console.error(errorMsg);
    }
    return this
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
  width:100%;
}
.storyp {
  min-height: 40px;
  padding: 0px 10px;
  font-size: 18px;
}
.storybutton {
  padding: 3px:
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
  max-height: 70vh;
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
    font-size: 10vw;
  }
}
`