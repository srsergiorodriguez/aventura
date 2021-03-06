# Aventura :loop:
Biterature, generative text and interactive stories in JavaScript.

If you already know how the library works, jump to the [Cheat sheet](#cheat-sheet)

To read the reference in Spanish... Para leer la referencia en español: [clic aquí / click here](/README_es.md).

## About
This is a library that lets you create generative text using a [Context free grammar](https://en.wikipedia.org/wiki/Context-free_grammar) and [interactive stories](https://en.wikipedia.org/wiki/Interactive_storytelling). Aventura is intended to be a library of creative coding that lets you explore "biterature", or computer generated literary texts. Although it is simple, with it you can create complex texts and stories.

## How to use the library
Download the the [library](./source/aventura.js) into your project folder, then add a *script* tag to your main .html file:

`<script src="aventura.min.js></script>`

In your JavaScript code, to start using the library, create an instance of the class Aventura. Pass, as the first parameter, a string that describes the language you want to use ('en' for English (default), 'es' for Spanish):

`const aventura = new Aventura('en');`

### Index
- [Aventura :loop:](#aventura-loop)
  - [About](#about)
  - [How to use the library](#how-to-use-the-library)
    - [Index](#index)
  - [Generative text with Context free grammar :monkey:](#generative-text-with-context-free-grammar-monkey)
    - [The basics](#the-basics)
    - [Finding errors](#finding-errors)
    - [Generative text - advanced options](#generative-text---advanced-options)
      - [Defining rule option probabilities](#defining-rule-option-probabilities)
      - [Applying transformations](#applying-transformations)
      - [Creating new rules](#creating-new-rules)
  - [Interactive stories :alien:](#interactive-stories-alien)
    - [The basics](#the-basics-1)
    - [Finding errors](#finding-errors-1)
    - [Interactive stories - advanced options](#interactive-stories---advanced-options)
      - [Add images!](#add-images)
      - [Using generative text in your stories](#using-generative-text-in-your-stories)
      - [Custom configuration](#custom-configuration)
        - [Choosing a container](#choosing-a-container)
        - [Change typewriter speed](#change-typewriter-speed)
        - [Overwrite CSS styling](#overwrite-css-styling)
  - [Cheat sheet](#cheat-sheet)
  - [Help to improve this library](#help-to-improve-this-library)
  - [Version, license, copyright](#version-license-copyright)
        - [Colaborators](#colaborators)

## Generative text with Context free grammar :monkey:

### The basics

The generative texts that you can create with Aventura are structured on a system called [Context free grammar](https://en.wikipedia.org/wiki/Context-free_grammar). In less extravagant words, you can imagine that the text you're going to generate emerges from a tree. The final text is the trunk, but, in order to define the parts of such text, you must choose different branches collecting fruits (each fruit is a text piece). At each branch you can choose which of the many available fruits you want, and once you pick the fruit it goes to the base of the tree (it becomes part of the final text). In fact, each branch can have its own sub-branches, its own path. So, to get a piece of text (or fruit) you must get to the end of a sequence of sub-branches.

In Aventura you represent the tree of your grammar by using an *object* that contains a series of *arrays*, which contain a list of *strings*. One of those arrays is the trunk (whichever you choose), and all the rest are branches or sub-branches. For convenience, we'll call any array in the grammar a 'rule'. Each rule is a list of options; one of such options will be chosen when the tree traversing passes through the rule (including the base!). Inside each option you can write conventional text or references to other rules that must be followed in order to complete the text. To reference another rule you must use a tag like this: `<rule>`.

Then, a very simple tree or grammar, with just one trunk and a branch, would look like this:

```
const tree = {
    trunk: ["Hello and <branch>"],
    branch: ["good day","goodbye","hasta la vista"]
};
```

The possible results of a text produced with this grammar are: "Hello and good day", "Hello and goodbye", and "Hello and hasta la vista". The option in the branch that will complete the text will be chosen at random, and all the options have the same chance of appearing. If you want to have more control over the probabilities, [check the advanced options](#generative-text---advanced-options). You can include as many options as you want, even only one, as is the case with the trunk, but no empty arrays.

Test the results! Once you've created the grammar, you must pass it as an argument to your instance of Aventura using the **'setGrammar'** function:

`aventura.setGrammar(tree);`

And, to get a generated text you must use the funcion **'expandGrammar'**, passing as argument the name (the key) of the trunk (which, in this case, is precisely 'trunk'):

`const text = aventura.expandGrammar('trunk');`

Or, conveniently, you can chain both functions:

`const text = aventura.setGrammar(tree).expandGrammar('trunk');`

The previous example was a very simple text generator, but you can make much more complex things. Let's create another grammar and include more branches, and even sub-branches:

```
const grammmar = {
    sentence: ["A <attribute> <animal>"],
    animal: ["cat","giraffe","squirrel"],
    attribute: ["<adjective> <color>"],
    color: ["green","blue","red"],
    adjective: ["strong","smart","brave"]
};

const text = aventura.setGrammar(grammar).expandGrammar('sentence');
console.log(text);
// A possible result would be: "A brave red giraffe"
```

Note that the branch attribute is referencing two sub-branches (adjective and color), so Aventura will check them too to get the final result.

Try to create more complex rules!

### Finding errors

It may be the case that, when you create a complex grammar, when you generate the text something goes wrong. Most probably, you have a reference to a rule that doesn't exist. Do not panic, it's hard to trace all the branches in a tree once the tree gets bigger. To help you debug and correct errors, Aventura will show you in the console a message like this:

`Tried to expand from rule "colr", but couldn't find it`

Aha! What this message is telling us is that the rule "colr" doesn't exist, so we must check if we misspelled the name or if we forgot to create the rule.

To analyze your grammar in general, so you can find any reference error, you can use the function **'testGrammar'** (the function is chainable):

`const text = aventura.setGrammar(grammar).testGrammar().expandGrammar('sentence');`

Aventura will show you in the console the origin of all errors, like this:

`The following rules, referenced in "attribute", do not exist: clr`

### Generative text - advanced options

#### Defining rule option probabilities
If you want an option in a rule to have more probabilites of appearing in the final text, you can create a new property called 'prob' in the array that represents the rule. Ideally, each option must have a probability value between 0 and 1, and the sum of all values must be equal to 1:

```
const grammar = {
    colors: ["green","blue","red","purple"]
};
grammar.colors.prob = [0.1,0.2,0.1,0.6]
```

In the example above, "purple" will be more likely to appear.

#### Applying transformations
You can apply some transformations to the text that is expanding from some rule. For example, you can capitalize the first letter in the string of text, or you can capitalize all of the letters of the string. Transformations must be indicated inside a pair of '#' symbols after the name of the reference. You can apply multiple transformations (split them by commas):

```
const grammar = {
    sentence: ["<animal#ALLCAPS#>"],
    animal: ["cat","giraffe","squirrel"]
}
const text = aventura.setGrammar(grammar).expandGrammar('sentence');
// A possible result would be: "SQUIRREL"
```

For now, the possible transformations are:

* Capitalize first letter: CAPITALIZE
* Capitalize all letters: ALLCAPS

#### Creating new rules
You can create new rules while your grammar expands. This is useful to fixate rules that you want to produce generatively but also that you want tou use consistently in your new text. For example, think about a tale in which the name of a hero appears multiple times in the story. You want that the name of the hero changes with each new generation of the text, but you also want that the same name is used throughout the story. New rules are created by defining a new name for the rule (inside `$` symbol), followed by a set of sub-rules encolsed in `[ `and `]`: `[key1:value1,key2:value2...]`. Each sub-rule must be specified in key-value pairs, and the set of sub-rules must be separated by commas:

```
const grammar = {
    sentence: ["$hero$[name:animal,attribute:adjective]This is the story of <hero.name>. You must know that <hero.name> was very <hero.attribute>"],
    animal: ["cat","giraffe","squirrel"],
    adjective: ["strong","smart","brave"]
}
const text = aventura.setGrammar(grammar).expandGrammar('sentence');
// A possible result: "This is the story of cat. You must know that cat was very smart"
```

## Interactive stories :alien:

### The basics
Aventura lets you create [interactive stories](https://en.wikipedia.org/wiki/Interactive_storytelling), in which your reader's decisions change the development of the events. Aventura produces a very simple interface that allows to navigate the story, and also controls the path of decisions followed by the reader. Even though the interface comes with some styling by default, you can customize it with CSS.

You must structure your story in an object that contains the contents of every scene. Each scene will also be an object in which you should specify things like: what text to display, what options can the reader choose, what message will display after each decision, and, even, optionally, what image to show in each scene.

There are, basically, two types of scenes:

A *simple scene*, which shows a continue button, and when the button is pressed, it takes the reader to another scene, or which shows no button at all (used, for instance, for the end of a story).

This is the structure of a couple of simple scenes:

```
const scenes = {
  start {
    text: "Once upon a time, there was a squashed circle", // this is the text of the scene
    scene: "end" // this is the name of the next scene
  },
  end {
    text: "Looks like the story took an ellipsis"
    deadEnd: true
  }
}
```

To display the interface of the story, first you must pass the scenes to your instance of Aventura with the **'setScenes'** function:

`aventura.setScenes(scenes);`

Then, you must start the interface with **startAdventure**, passing as an argument the name of the beginning scene:

`aventura.startAdventure('start');`

Or, conveniently, you can chain both functions:

`aventura.setScenes(scenes).startAdventure('start');`

The other type of scene is a **scene with options**. Here, just as with the simple scene, you should specify a text, but also you must define an array of options. The array must contain objects with the text of the buttons that will be displayed for interaction, a text that will be shown after taking a particular decision, and the scene that will follow after pressing a button:

```
const scenes = {
  start {
    text: "Once upon a time, there was a squashed circle",
    options [
      {
        btn: "leave alone",
        text: "you leave the circle alone",
        scene: "end1"
      },
      {
        btn: "unsquash", // This is the text that will be displayed on a button
        text: "...unsquashing",  // This will be shown after pressing the button
        scene: "end2" // This is the scene to which the button will redirect
      }
    ]
  },
  },
  end1 {
    text: "Looks like the story took an ellipsis",
    deadEnd: true
  }
  end2 {
    text: "Perfect, a round end"
    deadEnd: true
  }
}
```

Of course, these scenes are just a simple example, you can make more complex stories with a larger number of scenes.

### Finding errors

It may be the case that, when you create a complex story, when you generate the text something goes wrong. Most probably, you have a reference to a scene that doesn't exist. Do not panic, it's hard to trace all the scenes, because the story can become messy easily. To track all your missing scenes you can use the function **testScenes** (it is chainable):

`aventura.setScenes(scenes).testScenes().startAdventure('start');`

In this way, Aventura will show you all the scenes that are missing:

`The following scenes are dead ends: introduction => strt`

This means that the scene strt referenced in introduction is either misspelled or it does not existe.

:exclamation: If you intentionally want to have scenes that are deadEnds (for example, the last scene in a story), and in order to avoid an error message, define the parameter `deadEnd: true` inside the scene.

### Interactive stories - advanced options

#### Add images!
:surfer: You can also add images to a scene by defining the parameter 'image' with an imagepath:

```
const scenes = {
  start {
    text: "Once upon a time, there was a squashed circle",
    image: "./squashed.jpg",
    options [
      {
        btn: "leave alone",
        text: "you leave the circle alone",
        scene: "end1",
        image: "./squashed.jpg"
      },
      {
        btn: "unsquash",
        text: "...unsquashing",
        scene: "end2"
        image: "./round.jpg"
      }
    ]
  },
  },
  end1 {
    text: "Looks like the story took an ellipsis",
    deadEnd: true
  }
  end2 {
    text: "Perfect, a round end"
    deadEnd: true
  }
}
```

#### Using generative text in your stories

This is a powerful functionality, you can combine generative text produced with a grammar into the development of your story. To do it, you must first pass a grammar to your intance of Aventura as well as your scenes. In this way, your scenes can contain strings that contain references to rules in the grammar:

```
const grammar = {
  attributes: ["brave","impatient","elusive","smart"],
  green: ["greenful","greenish"],
  yellow: ["yellowy","yeeelloooow"],
  blue: ["bluish","very blue"]
}

const scenes = {
  cover: {
    text: 
    `$squirrel$[attribute:attributes]The <squirrel.attribute#ALLCAPS#> squirrell.
an amazing story`,
    scene: 'introduction'
  },
  introduction:{
    text:"I will tell you the story of a very <squirrel.attribute> squirrel...",
    scene: 'start'
  },
  start: {
    text:
    `The squirrel had a beatiful fur of color...`,
    options: [
      {
        btn:"Green",
        scene: "end",
        text: "$squirrel$[color:green]Of course, <squirrel.color>"
      },
      {
        btn:"Blue",
        scene: "end",
        text: "$squirrel$[color:blue]Of course, <squirrel.color>"
      },
      {
        btn:"Yellow",
        scene: "end",
        text: "$squirrel$[color:yellow]Of course, <squirrel.color>"
      }
    ]
  },
  end: {
    text:"That's all",
    scene: "credits"
  },
  credits: {
    text: 
    `This story was written by
    Sergio Rodríguez Gómez
    2020`,
    deadEnd: true
  }
}

aventura.setGrammar(grammar).setScenes(scenes).startAdventure('cover');
```

#### Custom configuration
You can change some options if you pass a configuration object when you create an instance of Aventura:

```
const config = {
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined
    }
const aventura = new Aventura('es',config);
```
The options are:

##### Choosing a container
You can place your story in the DOM element you like in your project, just put the id of your container in the parameter **adventureContainer**.

##### Change typewriter speed
Change the speed of the typewritter with the parameter **typewriterSpeed**. The value by default is 50, that is, one extra letter every 50 milliseconts. If **typewriterSpeed** all the text will display immediately.

##### Overwrite CSS styling
To disable the default style of the interface, pass false in the parameter **defaultCSS**. Then you can customize the style as you prefer. For reference, this is the default styling:

```
// General container
#storygeneraldiv {
  box-sizing: border-box;
  margin: auto;
  max-width: 600px;
}

// Container of the story
#storydiv {
  box-sizing: border-box;
  border: solid black 1px;
}

// Text paragraph
.storyp {
  box-sizing: border-box;
  min-height: 40px;
  font-size: 18px;
  padding: 0px 10px;
  font-family: 'Courier New', Courier, monospace;
}

// Option buttons
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

// Image
.storyimage {
  max-width: 100%;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

// Configuration for small devices
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

## Cheat sheet

General:

* Create instance : `const aventura = new Aventura(?language, ?config);`
  
---

Generative text:

* Set grammar: `setGrammar(grammar);`
* Test grammar: `testGrammar(?grammar);`
* Expand grammar: `expandGrammar(root);`

---

* Reference a rule: `<rule>`
* Reference with transformation: `<rule#TRANSFORMATION#>`
* New rule: `$name$[key:subrule]`

---

Interactive story

* Set scenes: `setScenes(scenes);`
* Display interface: `startAdventure(startScene);`
* Test scenes: `testScenes(?scenes);`

---

* Simple scene: `{text, ?scene, ?image, ?deadEnd}`
* Scene with options:
```
{
  text,
  ?image,
  options: [
    {
      btn,
      text,
      scene,
      ?image,
    }
    ?...
  ]
}
```

(? means optional)

## Help to improve this library
All suggestions are welcome.
This library aims to be bilingual (Spanish-English), so it takes more time to implement some functions or to write documentation.

## Version, license, copyright
v2.1.1

(c) Sergio Rodríguez Gómez @srsergiorodriguez

[MIT LICENSE](/LICENSE)

2020

##### Colaborators
@perropulgoso
