# Aventura :loop:
Biterature, generative text and interactive stories in JavaScript.

For a reference in Spanish... para una referencia en español: [click here / clic aquí](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md).

## About
This is a library that lets you create generative text using [Context Free Grammars](https://en.wikipedia.org/wiki/Context-free_grammar "Context Free Grammar") and [interactive stories](https://en.wikipedia.org/wiki/Interactive_fiction "Interactive fiction") similar to classic text based adventures (see, for example, [Zork](https://en.wikipedia.org/wiki/Zork "Zork")). Aventura is intended to be a creative coding library for exploring "biterature" or computer generated literary texts. Even though it is simple, you can create complex texts or stories that branch multiple generative possibilities.

## How to use
Just download the [minified library](docs/minified/aventura.min.js) to your project, and add a script tag referencing the minified library to your .html document, like this:

`<script src="aventura.min.js></script>`

Then, in your code, create an instance for the Aventura class, for example:

`const adventure = new Aventura('en');`

The argument 'en' specifies the language that the instance will use. In this case, English. If you want to change the default language to Spanish, pass 'es' as an argument when you create an instance. If you leave the argument undefined the default language will be english. 

## Index
- [Aventura :loop:](#aventura-loop)
  - [About](#about)
  - [How to use](#how-to-use)
  - [Index](#index)
  - [Context Free Grammar Generative Text :monkey:](#context-free-grammar-generative-text-monkey)
    - [Advanced options](#advanced-options)
      - [Transforming terminal text](#transforming-terminal-text)
      - [Setting new rules](#setting-new-rules)
  - [Interactive text based stories :alien:](#interactive-text-based-stories-alien)
    - [Add images!](#add-images)
  - [Custom options](#custom-options)
      - [Changing typewriter speed](#changing-typewriter-speed)
      - [Overriding the style of domAdventure](#overriding-the-style-of-domadventure)
  - [Help to improve this library](#help-to-improve-this-library)
  - [Version, license and copyright](#version-license-and-copyright)

## Context Free Grammar Generative Text :monkey:
Aventura lets you generate text by defining a grammar and by developing it. Namely, traversing a possible path inside the structure of the grammar and, as a result, generating each time a different string of text (ideally!).
Think of a grammar as a tree: you start at the trunk and then you choose a branch, and then a sub branch and so on, until you find a leaf; the leaf is a word or a set of words. Then you choose other branches and end in another leaf... At the end, you get a set of leafs. Such set is your newly generated text.

In Aventura, a grammar is estructured as an object which contains a set of rules in the form of arrays. Such rules should include **conventional strings of text**, **'terminal' symbols** (which point to inventories of words or phrases that could replace the symbol), or **'non-terminal' variables** (which point to inventories of rules that could replace the variables).

Symbols and variables are referenced inside rules by using tags enclosed in angle brackets: `<tag>`.

This is an example of a very simple grammar.

```
let grammar = {
    phrase: ["A <adjective> <animal>"], // this rule references other rules. It is non-terminal
    animal: ["cat","dog","squirrel"], // this rule is an inventory of terminal words
    adjective: ["brave","powerful","smart"]
}
```

After you create the grammar, you have to pass it as an argument into your instance of Aventura by calling the **'setGrammar'** function:

`adventure.setGrammar(grammar);`

And, to generate a new piece of text, you call the **'developGrammar'** function. This function receives as an argument the name of the rule that should be used to start the development of the text. For example:

```
let generatedText = adventure.developGrammar('phrase');
// A possible result could be: "A smart cat"
```

Try creating more complex rules. Your imagination (and the power of your computer) is the limit!

### Advanced options
#### Transforming terminal text
Conveniently, you can apply some transformations to the text developed by terminal symbols. For instance, you can capitalize the first letter of the string or capitalize all letters. If it is the case, transformations should all be indicated into one pair of hashtags '#' after the name of the symbol (each transformation must be separated by a comma):

```
let grammar = {
    phrase: ["<animal#ALLCAPS#>"],
    animal: ["cat","dog","squirrel"]
}
adventure.setGrammar(grammar);
let generatedText = adventure.developGrammar('phrase');
// A possible result could be: "SQUIRREL"
```

At the moment, available transformations are: CAPITALIZE, and ALLCAPS.

#### Setting new rules
You can set new rules as your grammar develops. This is useful to fix rules that you want to generate but you also want to use repeatedly in your text (i.e. A character in a story that reapears constantly). New rules are created by defining a new name for the rule (enclosed in `$`) followed by a set of subrules, enclosed by angle brackets. Each subrule must be specified in key-value pairs, and must be separated by commas:

```
let grammar = {
    phrase: ["$hero$<name:animal,attribute:adjective>This is the story of <hero.name>. You must know that <hero.name> was a very <hero.attribute> hero"],
    animal: ["cat","dog","squirrel"],
    adjective: ["brave","powerful","smart"]
}
adventure.setGrammar(grammar);
let generatedText = adventure.developGrammar('phrase');
// A possible result could be: "This is the story of dog. You must know that dog was a very brave hero"
```

## Interactive text based stories :alien:
Aventura lets you create interactive text stories inspired by classic text adventures like Zork, where you have to input decisions into a prompt to advance the story. In Aventura you can create **binary decision stories**, namely, stories where you must choose between two options each time and, as a result, the story takes different paths depending on your decisions. 

For creating an interactive story you must pass an object as argument into **'setScenes'** function. Such object must contain the structure of the scenes of your story: 
* the initial text (*text*)
* the options you can choose (*optionA,optionB*)
* a result message (*messageA,messageB*) for each option
* and the scenes that follow depending on the chosen option (*sceneA,sceneB*).

Aditionally, a scenes object must contain a set of special scenes:
* a cover -> which specifies the title and subtible of your adventure (*title,subtitle*))
* an intro -> which specifies the exposition text in your adventure (*text*)
* a start -> the first scene in your adventure
* an end -> which specifies final text in your adventure (*text*). For example, a call-to-action to try the adventure again
* and credits -> information about the authors and the year the adventure was written (*text,authors,year*)

For example:

```
let scenes = {
  cover: {
    title: "The smart squirrel",
    subtitle: "An incredible adventure"
  },
  intro:{
    text:"I will tell you the story of a smart squirrel..."
  },
  start: {
    text:"I've found a delicious peanut! —Said the squirrel—. Should I eat it or save it?",
    optionA:"Eat",
    optionB:"Save",
    sceneA:"peanuteaten",
    sceneB:"end",
    messageA: "The squirrel ate the peanut",
    messageB: "The squirrel saved the peanut for later. Smart move!, because in winter, she found it again and she had a good snack when she was hungry"
  },
  peanuteaten: {
    text:"Later on, winter came. And the squirrel had no peanuts to snack on. What should she eat?",
    optionA:"Eat grass",
    optionB:"Eat snow",
    sceneA:"end",
    sceneB:"end",
    messageA: "Grass is no food for a Squirrel, I should have saved some peanuts.",
    messageB: "Snow is no food for a Squirrel, I should have saved some peanuts."
  },
  end: {
    text:"You completed the story. Do you want to try again?"
  },
  credits: {
    text: "This story was written by:",
    authors: ["Sergio Rodríguez Gómez"],
    year: 2019
  }
}

const adventure = new Aventura();
adventure.setScenes(scenes);
```

After you have defined your scenes, Aventura lets you choose between two options: to display your interactive story in prompts in your explorer (by using **'promptAdventure'** function), or to display your interactive story in a very simple html, css styled interface (by using **'domAdventure'** function). It is very simple to choose either one:

`aventura.promptAdventure(); // the prompt interface`

or

`aventura.domAdventure(); // the html interface`

Try both and chose the interface you like the most.

NOTE: You can pass in the id of a div element into **domAdventure** function if you want to place the interface in a particular place in your website.

### Add images!
:surfer: If you choose **domAdventure** interface you can also add images to your scenes by specifying an image path in the *image* parameter (for the initial presentation of each scene) and *imageA* / *imageB* parameters for the subsequent messages. All the images adapt to the size of the interface (by default, 600px).


## Custom options
You can change some options by passing an configuration object into any new instance of Aventura.

```
let configuration = {//here you specify new options}
const adventure = new Aventura('en',options);
```

Such options are:
#### Changing typewriter speed
To change the default speed of the typewriter effect in the domAdventure interface, define the **typewriterSpeed** property in your configuration object. Default is 50,that is, a new letter every 50 milliseconds.
If **typewriterSpeed** is 0, the typewriter effect will get disabled and text will display immediately.

#### Overriding the style of domAdventure
To override the default style of the **domAdventure** interface, pass as string containing your new css style into the **style** property in the configuration object.
I recommend using the default styling as a template and adapting it to your taste:

```
#storygeneraldiv {
  box-sizing: border-box;
  margin: auto;
  max-width: 600px;
}
#storydiv {
  box-sizing: border-box;
  border: solid black 1px;
}
.storyp {
  box-sizing: border-box;
  min-height: 40px;
  font-size: 18px;
  padding: 0px 10px;
  font-family: 'Courier New', Courier, monospace;
}
.storybutton {
  font-size: 20px;
  padding: 3px:
  background: white;
  box-shadow: none;
  border: solid 1px;
  margin: 0px 0px;
  font-family: 'Courier New', Courier, monospace;
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
```

## Help to improve this library
All suggestions and contributions are welcome.
It is important to say that this is a library that intends to be bilingual, I want it to be usable and fun for both English speaking and Spanish speaking users.

TODO LIST — some implementations I want to add in the future are:
* <del>Make possible to add images to interactive stories</del>
* Add a transformation that pluralizes words, both in English and Spanish
* Add a transformation that conjugates words, both in English and Spanish
* Add probabilities to rule choosing when a grammar is being developed
* Make a more efficient and easier to use css styling function
* Add a simple interface to display generative text

## Version, license and copyright
V.1.1.0

(c) Sergio Rodríguez Gómez

2019-2020

Released under [MIT License](/LICENSE)
