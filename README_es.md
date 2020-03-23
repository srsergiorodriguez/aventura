# Aventura :loop:
Biteratura, texto generativo e historias interactivas en JavaScript.

Para leer la referencia en inglés... For a reference in english: [clic aquí / click here](https://github.com/srsergiorodriguez/aventura/blob/master/README.md).

## Acerca
Esta es una librería que te permite crear texto de forma generativa usando [Gramática libre de contexto](https://es.wikipedia.org/wiki/Gram%C3%A1tica_libre_de_contexto "Gramática libre de contexto") e [historias interactivas](https://es.wikipedia.org/wiki/Aventura_conversacional "FJuegos conversacionales") similares a las aventuras basadas en texto clásicas (por ejemplo, el juego [Zork](https://es.wikipedia.org/wiki/Zork "Zork")). Aventura tiene el propósito de ser una librería de programación creativa para explorar la "biteratura" o los textos literarios generados por computador. Aunque es simple, con ella puedes crear textos o historias complejas que se dividen en múltiples posibilidades generativas.

## Cómo usarla
Solo descarga la [librería minificada](https://github.com/srsergiorodriguez/aventura/blob/master/minified/aventura.min.js), y añade una etiqueta de script a tu documento .html, así:

`<script src="aventura.min.js></script>`

Luego, en tu código, crea una instancia de la clase Aventura, y, para que la librería se ajuste al idioma español, pasa como argumento la string 'es'. por ejemplo:

`const aventura = new Aventura('es');`

(si quieres usar la librería con textos en inglés pasa la string 'en' como argumento).

### Índice
* [Texto generativo con Gramática libre de contexto](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md#texto-generativo-con-gram%C3%A1tica-libre-de-contexto)
* [Historias interactivas basadas en texto](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md#historias-interactivas-basadas-en-texto)
* [Opciones personalizadas](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md#opciones-personalizadas)
* [Ejemplos](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md#ejemplos)
* [Ayuda a mejorar esta librería](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md#ayuda-a-mejorar-esta-librer%C3%ADa)
* [Versión, licencia y copyright](https://github.com/srsergiorodriguez/aventura/blob/master/README_es.md#versi%C3%B3n-licencia-y-copyright)

## Texto generativo con Gramática libre de contexto :monkey:
Aventura te permite generar texto si defines una gramática y la desenvuelves. Es decir, si recorres un camino posible dentro de la estructura de la gramática y, como resultado, generas una cadena de texto (que idealmente será diferente cada vez que desenvuelvas tu gramática).
Piensa que una gramática es como un árbol: empiezas en el tronco y luego eliges una rama, luego una subrama (digamos) y así, hasta que te encuentras con una hoja (¡esa hoja es una parte del texto final!). Luego sigues por otra rama y continúas el procedimiento. Al final quedas con un conjunto de ramas que forman tu nuevo texto generado. Si repites el proceso es posible que generes un texto muy diferente.

En Aventura, una gramática se estructura como un objeto que contiene un set de reglas en forma de arrays. Tales reglas contienen **cadenas de texto convencional**, **símbolos 'terminales'** (o sea, símbolos que apuntan a inventarios de palabras o frases que reemplazan el símbolo), o **variables 'no-terminales'** (o sea, inventarios de reglas que reemplazan las variables).
Así, las reglas también pueden ser terminales o no-terminales.

Dentro de las reglas puedes referenciar símbolos y variables usando etiquetas rodeadas de paréntesis angulares: `<etiqueta>`.

Este es un ejemplo de una gramática muy simple:

```
let gramatica = {
    frase: ["Una <animal> <adjetivo>"], // Esta regla es no-terminal, porque apunta a otras reglas
    animal: ["gata","jirafa","ardilla"], // Esta regla es un inventario de palabras terminales
    adjetivo: ["valiente","poderosa","inteligente"]
}
```

Luego de que crear la gramática, tienes que pasarla como un argumento a tu instancia de aventura usando la función **'setGrammar'**:

`aventura.setGrammar(gramatica);`

Y, para generar un texto nuevo, llamas la función **'developGrammar'**. Esta función recibe como argumento el nombre de la regla que quieres usar para empezar a desenvolver el texto. Por ejemplo:

```
let textoGenerado = aventura.developGrammar('frase');
// Un resultado posible podría ser: "Una gata inteligente"
```

Intenta crear reglas más complejas. ¡Tu imaginación es el límite! ...y el poder del computador, por supuesto.

### Opciones avanzadas
#### Transformar el texto terminal
Convenientemente, puedes aplicar algunas transformaciones al texto que se desenvuelve en símbolos terminales. Por ejemplo, puedes poner en mayúsculas la primera letra de la cadena de texto de algún símbolo o puedes poner en mayúsculas todas sus letras. Si es el caso, las tranformaciones se deben indicar dentro de un par de numerales '#' luego del nombre del símbolo (si quieres poner varias transformaciones, sepáralas con comas):

```
let gramatica = {
    frase: ["<animal#ALLCAPS#>"],
    animal: ["gato","jirafa","ardilla"]
}
aventura.setGrammar(gramatica);
let textoGenerado = aventura.developGrammar('frase');
// Un resultado posible puede ser: "ARDILLA"
```

En el momento, las tranformaciones posibles son:
* Primera letra en mayúscula: CAPITALIZE
* Todas las letras en mayúscula: ALLCAPS

#### Crear nuevas reglas
Puedes crear nuevas reglas mientras tu gramática se desenvuelve. Esto es útil para fijar reglas que quieres producir generativamente pero que además usaras recurrentemente en tu nuevo texto (por ejemplo, un personaje que aparece varias veces en una historia). Las reglas nuevas se crean definiendo un nuevo nombre para la regla (ecerrado en `$`), seguido de un set de subreglas, encerradas en paréntesis angulares. Cada subregla debe especificarse en pares de clave-valor, y el conjunto de subreglas deben separarse por comas:

```
let gramatica = {
    frase: ["$heroe$<nombre:animal,atributo:adjetivo>Esta es la historia de una <heroe.nombre>. Debes saber que la <heroe.nombre> fue muy <heroe.atributo>"],
    animal: ["gata","jirafa","ardilla"],
    adjetivo: ["valiente","poderosa","inteligente"]
}
aventura.setGrammar(gramatica);
let textoGenerado = aventura.developGrammar('frase');
// Un resultado posible puede ser: "Esta es la historia de una gata. Debes saber que la gata fue muy valiente"
```

## Historias interactivas basadas en texto :squirrel:
Aventura te permite crear historias interactivas basadas en texto inspiradas en aventuras de texto clásicas como Zork, en donde debes ingresar decisiones al programa para avanzar en la historia. Con Aventura creas **historias de decisión binaria**, es decir, historias en donde debes decidir entre dos opciones en cada momento y, como resultado de tu decisión, la historia toma diferentes caminos.

Para crear una historia interactiva debes pasar un objeto con las escenas de tu historia a la función **'setScenes'**. 
El objeto debe contener la estructura de las partes de tu historia: 
* el texto inicial (*text*)
* las opciones que se pueden escoger (*optionA,optionB*)
* mensajes que aparecerán luego de escoger alguna opción (*messageA,messageB*)
* y las escenas que aparecerán dependiendo de la selección (*sceneA,sceneB*).

Acicionalmente, el objeto debe contener un set especial de escenas:
* una portada (*cover*) -> que especifica el título y el subtítulo de la historia (*title,subtitle*)
* una introducción (*intro*) -> que especifica el texto que servirá como exposición inicial a la historia (*text*)
* un inicio (*start*) -> la primera escena de tu aventura
* un final (*end*) -> que especifica el texto que aparecerá cuando termine la aventura (*text*). Por ejemplo, un *call-to-action* que invite a jugar de nuevo (¡Vuelve a intentarlo!)
* y unos créditos (*credits*) -> información sobre los autores y el año en el que se creó la aventura (*text,authors,year*)

Por ejemplo:

```
let escenas = {
  cover: {
    title: "La ardilla sagaz",
    subtitle: "Una aventura increíble"
  },
  intro:{
    text:"Te voy a contar una historia de una ardilla muy inteligente..."
  },
  start: {
    text:"¡Encontré una deliciosa avellana! —Dijo la ardilla—. ¿Debería guardarla o comerla?",
    optionA:"Comerla",
    optionB:"Guardarla",
    sceneA:"avellanacomida",
    sceneB:"end",
    messageA: "La ardilla se come la avellana.",
    messageB: "La ardilla guarda la avellana. ¡Una movida inteligente! Porque, tiempo después, en invierno, volvió a encontrarla y pudo comerla cuando tenía hambre."
  },
  avellanacomida: {
    text:"Cuando llegó el invierno la ardilla no encontró avellanas para comer. Entonces, ¿qué debería comer?",
    optionA:"Comer pasto",
    optionB:"Comer nieve",
    sceneA:"end",
    sceneB:"end",
    messageA: "El pasto no es buena comida para ardillas.",
    messageB: "La nieve no es buena comida para ardillas."
  },
  end: {
    text:"Completaste la historia. ¿Quieres intentarlo de nuevo?"
  },
  credits: {
    text: "Esta historia fue escrita por:",
    authors: ["Sergio Rodríguez Gómez"],
    year: 2019
  }
}
const aventura = new Aventura('es');
aventura.setScenes(escenas);
```

Luego de haber definido tus escenas, Aventura te permite escoger una de dos opciones: mostrar tu aventura en cuadros de texto del navegador (usando la función **'promptAdventure'**), o mostrar tu historia en una interfaz html muy simple con un poco de estilo css (usando la función **'domAdventure'**). En cualquier caso, es muy fácil escoger alguna interfaz:

`adventure.promptAdventure(); // la interfaz con cuadro de texto`

o

`adventure.domAdventure(); // la interfaz en html`

Prueba las dos y escoge la que más te guste en cada circunstancia.

NOTA: puedes pasar como argumento el id de un elemento div en html en la función **domAdventure** si quieres que esté contenido en algún lugar particular del diseño de tu página web.

### ¡Añade imágenes!
:surfer: También puedes añadir imágenes a tus escenas usando los parámetros *image* (para la imagen inicial de la escena), e *imageA* y *imageB* (para los mensajes que se presentan luego de elegir alguna opción). Las imágenes solo se presentan usando la interfaz **domAdventure** y se ajustan al ancho general de la interfaz (por defecto, 600px).

## Opciones personalizadas
Puedes cambiar algunas opciones si pasas un objeto de configuración cuando crear una nueva instancia de aventura:

```
let config = {//aquí van tus nuevos parámetros}
const aventura = new Aventura('es',config);
```
Las opciones son:
#### Cambiar la velocidad de la máquina de escribir
Para cambiar la velocidad del efecto de máquina de escribir en la interfaz de **domAdventure** pon como parámetro de **typewriterSpeed** en el objeto de configuración el valor que deses. El valor por defecto es 50, es decir, una nueva letra cada 50 milisegundos.
Si el valor de **typewriterSpeed** es 0, se desactiva el efecto y el texto aparece de inmediato.

#### Sobreescribir el estilo de domAdventure
Para sobreescribir el estilo por defecto de la interfaz **domAdventure**, pasa una string con el estilo css a la propiedad style en el objeto de configuración. 
Te recomiendo tomar como referencia el estilo original y adaptarlo a tu gusto:
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

## Ejemplos
* Un ejemplo de una historia interactiva: [Código](https://github.com/srsergiorodriguez/aventura/blob/master/docs/ejemplos/historia_interactiva/main.js) / [Demostración](https://srsergiorodriguez.github.io/aventura/ejemplos/historia_interactiva/)

## Ayuda a mejorar esta librería
Todas las sugerencias y contribuciones son bienvenidas.
Es importante decir que esta librería tiene como intención ser bilingüe, quiero que sea usable y divertida tanto para personas que hablan español como para quienes hablan inglés.

Algunas implementaciones que quisiera añadir en el futuro son:
* <del>Añadir la posibilidad de incluir imágenes a las historias interactivas</del>
* Añadir una transformación que pluralice palabras, tanto en inglés como español
* Añadir una transformación que conjugue verbos, tanto en inglés como español
* Añadir lrobabilidades de que ese escojan ciertas reglas cuando se desenvuelve una gramática
* Hacer más eficiente y fácil de usar la función de cambiar el estilo css
* Añadir una interfaz simple que permita mostrar texto generativo

## Versión, licencia y copyright
V.1.1

(c) Sergio Rodríguez Gómez

2019

Esta librería está amparada bajo una [licencia MIT](https://github.com/srsergiorodriguez/aventura/blob/master/LICENSE)
