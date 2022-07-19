# Aventura :loop:
Biterature, generative text and interactive stories in JavaScript.

If you already know how the library works, jump to the [Cheat sheet](#cheat-sheet)

To read the reference in Spanish... Para leer la referencia en español: [clic aquí / click here](/README_es.md).

## About
This is a library that lets you create generative text using [Context free grammars](https://en.wikipedia.org/wiki/Context-free_grammar) and [Markov Chains](https://en.wikipedia.org/wiki/Markov_chain), and [interactive stories](https://en.wikipedia.org/wiki/Interactive_storytelling) using decision trees. Aventura has the purpose of being a creative coding library useful to explore electronic literature or “biterature”.

## How to use the library
Just download the [library](./source/aventura.js) from the source into your project folder, then add a *script* tag to your html document, like this:

`<script src="aventura.js"></script>`

In your JavasScript code, to use the library, create a new Class instance of Aventura:

`const aventura = new Aventura();`

### Index
- [Aventura :loop:](#aventura-loop)
  - [About](#about)
  - [How to use the library](#how-to-use-the-library)
    - [Index](#index)
  - [Generative text](#generative-text)
    - [Generative text with Context Free Grammars :monkey:](#generative-text-with-context-free-grammars-monkey)
      - [The basics](#the-basics)
      - [Fixing errors](#fixing-errors)
      - [Advanced options](#advanced-options)
        - [Defining probabilities in rule options](#defining-probabilities-in-rule-options)
        - [Applying transformations](#applying-transformations)
        - [Creating new rules](#creating-new-rules)
    - [Generative images - igramas](#generative-images---igramas)
      - [The basics](#the-basics-1)
    - [Generative text with Markov chains :floppy_disk:](#generative-text-with-markov-chains-floppy_disk)
      - [The basics](#the-basics-2)
      - [Saving the model](#saving-the-model)
      - [Analyzing the model](#analyzing-the-model)
  - [Interactive stories :alien:](#interactive-stories-alien)
    - [The basics](#the-basics-3)
    - [Finding errors](#finding-errors)
    - [Interactive stories - advanced options](#interactive-stories---advanced-options)
      - [Usa areas of images as buttons](#usa-areas-of-images-as-buttons)
      - [Add images!](#add-images)
      - [Using generative text in your stories](#using-generative-text-in-your-stories)
  - [Custom configuration](#custom-configuration)
    - [Language](#language)
    - [Choosing a container](#choosing-a-container)
    - [Change typewriter speed](#change-typewriter-speed)
    - [Change igrama format](#change-igrama-format)
    - [Change MiniGif options](#change-minigif-options)
    - [Scrolling](#scrolling)
    - [Custom code in scenes](#custom-code-in-scenes)
    - [Overwrite CSS styling](#overwrite-css-styling)
  - [Cheat sheet](#cheat-sheet)
  - [Help to improve this library](#help-to-improve-this-library)
  - [Version, license, copyright](#version-license-copyright)

## Generative text

### Generative text with Context Free Grammars :monkey:

#### The basics

A particular kind of generative text that you can create with Aventura is based on something called Context Free Grammar. In less extravagant words, imagine that the text tha you are goung to generate is defined by a sequence of possible text chunks that can be chained together, and to obtain the final chunks you must define two things: an order in which the chunks will be chained and a set of options from which to choose the chunks. Both order and options make what we can call a ‘grammar’.
Let’s suppose that we want to create a simple sentence composed by two parts, a greeting and a farewell. First we define the order: the first element is the greeting and the second is the farewell, and inthe middle of both we put the word “and”, done. Then we define a set of options: let’s say that the greeting will always be “Hello” and the farewell could be “goodbye”, “see ya” or “hasta la vista”. Now suppose that, to generate a new text, we pass through each part in order and we put our hand inside a bag that contains the options for each part written in pieces of paper; we pick a random paper and we get an ordered text: say, “Hello (the only option) and goodbye (one of the three options)”.

Now we can write our grammar in Aventura to create a text generator. In Aventura you must use an object to describe your grammar, and the object must contain a set of arrays representing *rules* for the grammar: that is, descrptions of the order or the options in the grammar. One of these rules, anyone you choose, must be the base from wich all the remaining grammar develops. To indicate that the grammar must reffer to another rule you must use a tag enclosed in angular brackets: `<rule>`.
Then a very simple grammar would look like this:

```Javascript
const grammar = {
    base: ["<greeting> and <farewell>"],
    greeting: ["Hello"],
    farewell: ["goodbye", "see ya", "hasta la vista"]
};
```

The possible results of a text generated with this grammar would be: “Hello and goodbye”, “Hello and see ya”, “Hello and hasta la vista”. The option that will complete the text from the farewell rule will be chosen on random, and all the options have the same chance of being picked for making part of the final text. If you want more control over probabilities, check the advanced options. In your rules that work as a ‘bag of options’ you can include as many options as you want, as long as there is at least one, as you can see in the example of the greeting rule.

:exclamation: rule names must not contain spaces!

Test the results! After you create a grammar you have to pass it as an argument to your instance of Aventura using the **‘setGrammar’** function:

`aventura.setGrammar(grammar);`

And to get a generated text you have to use the **‘expandGrammar’** function, passing as argument the name of the initial rule ('base', in our example):

`const generatedText = aventura.expandGrammar('base');`

Conveniently, you can chain these functions in one line:

`const generatedText = aventura.setGrammar(gramatica).expandGrammar('base');`


Well, that’s a fairly simple generator, but it can be more complex. Now let’s include more rules, and even subrules:

```Javascript
const grammar = {
    sentence: ["A <features> <animal>"],
    animal: ["cat", "giraffe", "squirrel"],
    features: ["<adjective> <color>"],
    color: ["green", "blue", "red"],
    adjective: ["strong", "smart", "brave"]
};

const generatedText = aventura.setGrammar(grammar).expandGrammar('sentence');
console.log(generatedText);
// A possible result would be: "A brave blue squirrel"
```

Notice that here a rule (features) is referencing two subrules (color and adjective), so they must be expanded to obtain the final result. It’s like a grammar inside another grammar.

Try to create even more complex rules, but beware of creating rules that reference each other, because you could create an infinite loop.

#### Fixing errors

It might be the case that, if your grammar gets complex, your generator isn’t working. Do not despair, this is probably happening because there is a reference to a rule that does not exist. It is hard to keep count of all the branches once the tree gets bigger. To solve this, Aventura will show you in the console with an error message like this:

`Tried to expand from rule "colr", but couldn't find it`

Aha! What this message means is that the rule “colr” doesn’t exist, so we must check if it is misspelled o if we forgot to create it.

:exclamation: it would not be impossible for your code to have abother kind of error, but this is, without doubt, the most common.

To analyze all your grammar, so you can find all errors from missing rules at once, you can use the chainable function **'testGrammar'** right before expanding the text.

`const generatedText = aventura.setGrammar(grammar).testGrammar().expandGrammar('sentence');`

Just like that Aventura will show you the origin of all errors in console with messages like this:

`The following rules, referenced in "attribute", do not exist: clr`

#### Advanced options

##### Defining probabilities in rule options

If you want some options in a rule to have more probabilities to be picked than others you can create a new property in the rule Array called 'prob'. Ideally, each option must have a value between 0 and 1, and the sum of all values should be 1:

```Javascript
const grammar = {
    colors: ["green", "blue", "red", "purple"]
};
grammar.colors.prob = [0.1, 0.2, 0.1, 0.6];
```

In the previous example, “purple" is the most likley option.


##### Applying transformations
You can apply some transformations to the text that is expanding from some rule. For example, you can capitalize the first letter in the string of text, or you can capitalize all of the letters of the string. Transformations must be indicated inside a pair of '#' symbols after the name of the reference. You can apply multiple transformations (split them by commas):

```Javascript
const grammar = {
    sentence: ["<animal#ALLCAPS#>"],
    animal: ["cat", "giraffe", "squirrel"]
}
const generatedText = aventura.setGrammar(grammar).expandGrammar('sentence');
// A possible result would be: "SQUIRREL"
```

For now, the possible transformations are:

* Capitalize first letter: CAPITALIZE
* Capitalize all letters: ALLCAPS

##### Creating new rules
You can create new rules while your grammar expands. This is useful to fixate rules that you want to produce generatively but also that you want to use consistently in your new text. For example, think about a tale in which the name of a hero appears multiple times in the story. You want that the name of the hero changes with each new generation of the text, but you also want that the same name is used throughout the story. New rules are created by defining a new name for the rule (inside `$` symbol), followed by a set of sub-rules encolsed in `[ `and `]`: `[key1:value1,key2:value2...]`. Each sub-rule must be specified in key-value pairs, and the set of sub-rules must be separated by commas:

```Javascript
const grammar = {
    sentence: ["$hero$[name:animal,attribute:adjective]This is the story of <hero.name>. You must know that <hero.name> was very <hero.attribute>"],
    animal: ["cat", "giraffe", "squirrel"],
    adjective: ["strong", "smart", "brave"]
}
const text = aventura.setGrammar(grammar).expandGrammar('sentence');
// A possible result: "This is the story of cat. You must know that cat was very smart"
```


Aditionally, if you want remove an option from a rule once it has been picked you can use a "minus" sign before the key, like this: `-key:value`. This will delete it from the array. This functionality is useful, for example, if you want to choose a character name and you don't want it to be used anywhere else, but you want to keep using the same array of options.

### Generative images - igramas

#### The basics

There's a special kind of image generator, which we will call here an "igrama", that can be created with Aventura based on the context free grammar generator. Igramas work almost identically to the conventional ones, but, instead of combining fragments of text they combine fragments of images. Then, for making them it is also necessary to define a grammar with an order an lists of options.

To create an igrama gramar you can use the [igrama app](https://srsergiorodriguez.github.io/igrama), which provides the necessary interface to defina the special grammar that an image generator requires. This interface lets you download the grammar in .json format so you can load it later to your Aventura code. The functions used to generate an image are very similar to the ones used in the conventional generator: first you must set the grammar with `setIgrama`, passing the model as argument, then you expand the layers of the drawing with `expandIgrama`, passing the initial rule, and then, to show the drawing, you can use the `showIgrama` function, passing the layers, and, optionally, an image format ("png" or "gif") and the id of a container div. If you want to generate gifs you must also have the library [MiniGif](https://github.com/srsergiorodriguez/minigif) included in your project.
Additionally you can expand some text that generates in parallel with the images if you defined an atributtes section in the igrama app with the function `igramaText` (passing also the layers).

```Javascript
aventura.loadJSON("./igrama.json").then(grammar => {
  aventura.setIgrama(grammar);
  const layers = aventura.expandIgrama('base');
  aventura.showIgrama(layers, 'png', 'igrama-container');
  const text = aventura.igramaText(layers);
  console.log(text);
});
```

You can also get the URL of the image by using the function `igramaDataUrl` and passing the layers and the image format.

### Generative text with Markov chains :floppy_disk:

#### The basics

Another type of generative text you can create in Aventura is structured on the basis of a system called *[Markov chains](https://en.wikipedia.org/wiki/Markov_chain)*. In less extravagant words, imagine that you are reading a text in full and, as you read, you write down what are the probabilities for a word to follow another one. For example, you read the text "A cat is a cool animal. A cat is coolness" and you discover that the words that can follow "A" are these: "cat" 67% of probability aprox. (because it appears twice), and "animal" 33% of probability aprox. (because it appears once). Later, having all the probabilities per word, you can choose a seed, that is, an intial word, and choose a possible word that could be after the seed depending on its probabilities, then you repeat the process with the new word and so on until you have a chain of words. Hence the Markov chain name.

To do this process in Aventura, first you must generate a Markov model that contains all the word probabilities by using the `markovModel` function, passing as argument the path of the file that you want to analyze:

```JavaScript
  aventura.markovModel("baseText.txt");
```

This analysis might take a little bit of time, not much, so the function returns a promise. Then, the model returned when the promise resolves can be set into Aventura with the function `setMarkov` and, once set, you can create new texts with the `markovChain` function. This function receives as arguments the length of the chain and the seed that starts the chain:

```JavaScript
aventura.markovModel("baseText.txt").then(model => {
  const generatedText = aventura.setMarkov(model).markovChain(100, 'seed');
  console.log(generatedText);
});
```

It's that simple.

However, here we should add that, in fact, a markov Model can be created not only with one word but with a sequence of words. This is what intheory is called an "n-gram". For example, 'cat' or 'the' are unigrams, and 'the cat' or 'black cat' are bigrams. The n in n-gram means the length of sequences of words used to build the model. Then, in Aventura we can get models with different n-grams by passing n as a second argument in `markovModel`. It is important to take into account that the seed must also be an n-gram of the length defined for the model:

```JavaScript
aventura.markovModel("baseText.txt", 2).then(model => {
  const generatedText = aventura.setMarkov(model).markovChain(100, 'germinating seed');
  console.log(generatedText);
});
```

When aventura does not find the seed in the model it simply uses a valid seed at random.

#### Saving the model

If you pass the boolean `true` as the third argument of `markovModel`, then Aventura will save the model in a .json file. You can use this file later with the `loadJSON` function:

```JavaScript
aventura.loadJSON("./markov.json").then(model => {
  const generatedText = aventura.setMarkov(model).markovChain(100, 'seed');
  console.log(generatedText);
});
```

#### Analyzing the model

An additional option available is creating a very simple visualization in the console of the probability distribution of the n-grams with the chainable function `testDistribution`:

```JavaScript
aventura.loadJSON("./markov.json").then(model => {
  const generatedText = aventura.setMarkov(model)
    .testDistribution() // Use this function to test distribution
    .markovChain(100, 'seed');
  console.log(generatedText);
});
```

In this way you can get a general idea of the variety of the original text. If tha majority of the distribution is close to the number 1, the text is not very diverse, and in consequence the generated text will be very simlar to the original. On the contrary, if the distribution is bigger, closer to the number 0, then the original text is more diverse and in consequence the generated text will also be diverse.

## Interactive stories :alien:

### The basics
Aventura lets you create [interactive stories](https://en.wikipedia.org/wiki/Interactive_storytelling), in which your reader's decisions change the development of the events. Aventura produces a very simple interface that allows to navigate the story, and also controls the path of decisions followed by the reader. Even though the interface comes with some styling by default, you can customize it with CSS.

You must structure your story in an object that contains the contents of every scene. Each scene will also be an object in which you should specify things like: what text to display, what options can the reader choose, what message will display after each decision, and, even, optionally, what image to show in each scene.

There are, basically, two types of scenes:

A *simple scene*, which shows a continue button, and when the button is pressed, it takes the reader to another scene, or which shows no button at all (used, for instance, for the end of a story).

This is the structure of a couple of simple scenes:

```Javascript
const scenes = {
  start: {
    text: "Once upon a time, there was a squashed circle", // this is the text of the scene
    scene: "end" // this is the name of the next scene
  },
  end: {
    text: "Looks like the story took an ellipsis",
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

The other type of scene is a **scene with options**. Here, just as with the simple scene, you should specify a text, but also you must define an array of options. The array must contain objects with the text of the buttons that will be displayed for interaction, optionally a text that will be shown after taking a particular decision, and the scene that will follow after pressing a button:

```Javascript
const scenes = {
  start: {
    text: "Once upon a time, there was a squashed circle",
    options: [
      {
        btn: "leave alone",
        text: "you leave the circle alone",
        scene: "end1"
      },
      {
        btn: "unsquash", // This is the text that will be displayed on a button
        text: "...unsquashing",  // This is optional and will be shown after pressing the button as an intermediate scene
        scene: "end2" // This is the scene to which the button will redirect
      }
    ]
  },
  end1: {
    text: "Looks like the story took an ellipsis",
    deadEnd: true
  },
  end2: {
    text: "Perfect, a round end",
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

#### Usa areas of images as buttons
You can use clickable areas inside the images of scenes of your story to redirect to new scenes. To do it, you must creat an array of `areas` and in the parame
Puedes usar areas cliqueables dentro de las imágenes de las escenas de tu historia que llevan a nuevas escenas. Para hacerlo, debes crear una array de `areas` en los parámetros de una escena con los siguientes parámetros para cada área:

```Javascript
// ... inside a scene
 areas: [
  {
    x: 500, // x position in px of the area based on the original image
    y: 200, // y position in px of the area based on the original image
    w: 50, // width of the area in px
    h: 50, // height of the area in px
    btn: "Go forward!", // Text contained inside the area (you can leave an empty string)
    scene: "1", // scene that the area will call when clicked
    tooltip: "click me!" // optional tooltip text
  }//, and so on on all areas in the same scene
 ]
```

#### Add images!
:surfer: You can also add images to a scene by defining the parameter 'image' with an imagepath:

```Javascript
const scenes = {
  start: {
    text: "Once upon a time, there was a squashed circle",
    image: "./squashed.jpg",
    options: [
      {
        btn: "leave alone",
        text: "you leave the circle alone",
        scene: "end1",
        image: "./squashed.jpg"
      },
      {
        btn: "unsquash",
        text: "...unsquashing",
        scene: "end2",
        image: "./round.jpg"
      }
    ]
  },
  end1: {
    text: "Looks like the story took an ellipsis",
    deadEnd: true
  }
  end2: {
    text: "Perfect, a round end",
    deadEnd: true
  }
}
```

You can also use generative images if you pass an igrama grammar into Aventura, with `setIgrama`, and in the scenes of your interactive story you use the "igrama" attribute, instead of "image". In the igrama attribute you must set the rule base for the generator:

```Javascript
  scene: {
    text: "Hello",
    igrama: "base"
  }
```

#### Using generative text in your stories

This is a powerful functionality, you can combine generative text produced with a grammar into the development of your story. To do it, you must first pass a grammar to your intance of Aventura as well as your scenes. In this way, your scenes can contain strings that contain references to rules in the grammar:

```Javascript
const grammar = {
  attributes: ["brave", "impatient", "elusive", "smart"],
  green: ["greenful", "greenish"],
  yellow: ["yellowy", "yeeelloooow"],
  blue: ["bluish", "very blue"]
}

const scenes = {
  cover: {
    text: 
    "$squirrel$[attribute:attributes]The <squirrel.attribute#ALLCAPS#> squirrel, an amazing story",
    scene: 'introduction'
  },
  introduction:{
    text: "I will tell you the story of a very <squirrel.attribute> squirrel...",
    scene: 'start'
  },
  start: {
    text: "The squirrel had a beatiful fur of color...",
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

## Custom configuration
You can change some options if you pass a configuration object when you create an instance of Aventura:

```Javascript
const config = {
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined,
      igramaFormat: 'png',
      adventureScroll: false,
      sceneCallback: (scene) => { return scene }
    }
const aventura = new Aventura('es',config);
```
The options are:

### Language
Pass 'en' for English and 'es' for Spanish as the first argument for the instance of Aventura in order to configure the language used in the stories and generators.

### Choosing a container
You can place your story in the DOM element you like in your project, just put the id of your container in the parameter **adventureContainer**.

### Change typewriter speed
Change the speed of the typewritter with the parameter **typewriterSpeed**. The value by default is 50, that is, one extra letter every 50 milliseconts. If **typewriterSpeed** is 0 all the text will display immediately.

### Change igrama format
To change the default image format of the igrama set "png" or "gif" in the **igramaFormat**. The default format is .png.

### Change MiniGif options
When you generate gif igramas you must also have the [MiniGif](https://github.com/srsergiorodriguez/minigif) library in your project. You can pass particular settings to MiniGif by setting them in the **minigifOptions** parameter.

### Scrolling
You can show the chosen scenes in an interactive story succesively and in vertical display, instead of replacing every scene with the new one. to do so you must set the **adventureScroll** parameter to `true`. This is useful, for example, to create interactive web comics.

### Custom code in scenes
You can run custom code in each scene of an interactive story with the **igramaFormat** parameter. It defines a callback function that is called on every scene. This callback also return the current scene.

### Overwrite CSS styling
To disable the default style of the interface, pass false in the parameter **defaultCSS**. Then you can customize the style as you prefer. For reference, this is the default styling:

```CSS
/* General container */

#storygeneraldiv {
  box-sizing: border-box;
  margin: auto;
  max-width: 600px;
  font-family: 'Courier New', Courier, monospace;
  background: white;
}


/* Container of the story */

.storydiv {
  border: solid black 1px;
  width: 100%;
  display: flex;
  padding: 10px;
  flex-direction: column;
  box-sizing: border-box;
}

/* Text paragraph */

.storyp {
  font-size: 18px;
  min-height: 25px;
}

/* Option buttons */

.storybutton-container {
  margin: auto;
}

.storybutton {
  background: white;
  box-shadow: none;
  border: solid 1px;
  margin: 0px 1em 0px 0px;
  font-size: 20px;
  font-family: 'Courier New', Courier, monospace;
  cursor: pointer;
}

.storybutton:hover {
  color: white;
  background: black;
}

/* Image */

.storyimage-container {
  box-sizing: content-box;
  position: relative;
  width: 100%;
  margin: auto;
}

.storyimage {
  justify-content: center;
  width: 100%;
  margin: auto;
  border-radius: 20px;
  display: block;
}

/* Clickable area in image story */
.storyimage-area {
  position: absolute;
  cursor: pointer;
  text-align: center;
  color: black;
  background: white;
  border-radius: 4px;
  padding: 10px;
  border: solid 1px black;
}

.storyimage-area:hover {
  background: black;
  color: white;
}

/* Configuration for small devices */

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
```

## Cheat sheet

General:

* Create instance : `const aventura = new Aventura(?language, ?config);`
  
---

* Config: 

```JavaScript
  config  = {
    typewriterSpeed: 50,
    defaultCSS: true,
    adventureContainer: undefined, // interactive story container (default: body)
    igramaFormat: 'png', // default: 'png', or 'gif')
    adventureScroll: true,
    sceneCallback: (scene) => {return scene}
  }
```
  
---

Generative text with Context free grammars:

* Set grammar: `setGrammar(grammar);`
* Test grammar: `testGrammar(?grammar);`
* Expand grammar: `expandGrammar(root);`

---

* Reference a rule: `<rule>`
* Reference with transformation: `<rule#TRANSFORMATION#>`
* New rule: `$name$[key:subrule]`

---

Igramas:

* Set igrama: `setIgrama(grammar);`
* Expand igrama: `expandIgrama(rule);` Returns layers
* Show image: `showIgrama(layers, format, container)` Format can be 'png' or 'gif'
* Text from attributes: `igramaText(layers);`
* Image URL: `igramaDataUrl(layers, format)` Format can be 'png' or 'gif'

---

Generative text with Markov chains:

* Generate model: `markovMovel(path);` Returns promise
* Load model: `loadJSON(model, ?n, ?save model);` Devuelve promesa 
* Set model: `setMarkov(model);` 
* Test distribution: `testDistribution();` 
* Generate text: `markovChain(n, seed);`

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
  ?igrama,
  deadEnd,
  plop, // boolean, set this to reset screen when scrolling is activated
  options: [
    {
      btn,
      ?text,
      scene,
      ?image,
      ?igrama
    }
    ?...
  ],
  ?areas: [
    {
      x,
      y,
      w,
      h,
      btn,
      ?text,
      scene,
      tooltip
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
v2.4.1

By Sergio Rodríguez Gómez @srsergiorodriguez

[MIT LICENSE](./LICENSE)

<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/"><img alt="Licencia Creative Commons" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/80x15.png" /></a><br />Esta documentación está bajo una <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Licencia Creative Commons Atribución-NoComercial-CompartirIgual 4.0 Internacional</a>.

2022