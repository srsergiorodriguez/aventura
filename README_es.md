# Aventura :loop:
Biteratura, texto generativo e historias interactivas en JavaScript.

Si ya conoces la librería, puedes pasar al [resúmen rápido](#resumen-rápido)

Para leer la referencia en inglés... For a reference in english: [clic aquí / click here](/README.md).

## Acerca
Esta es una librería que te permite crear texto de forma generativa usando [Gramática libre de contexto](https://es.wikipedia.org/wiki/Gram%C3%A1tica_libre_de_contexto) e [historias interactivas](https://es.wikipedia.org/wiki/Aventura_conversacional) similares a las aventuras basadas en texto clásicas (por ejemplo, el juego [Zork](https://es.wikipedia.org/wiki/Zork "Zork")). Aventura tiene el propósito de ser una librería de programación creativa para explorar la "biteratura" o los textos literarios generados por computador. Aunque es simple, con ella puedes crear textos o historias complejas que se dividen en múltiples posibilidades generativas.

## Cómo usarla
Solo descarga la [librería minificada](docs/minified/aventura.min.js) en la carpeta de tu proyecto, y luego añade una etiqueta de *script* a tu documento .html, así:

`<script src="aventura.min.js></script>`

En tu código de Javascript, para empezar a usar la librería, crea una instancia de la clase Aventura, y, para que la librería se ajuste al idioma español, pasa como argumento la string 'es'. por ejemplo:

`const aventura = new Aventura('es');`

(si quieres usar la librería con textos en inglés pasa la string 'en' como argumento).

### Índice
- [Aventura :loop:](#aventura-loop)
  - [Acerca](#acerca)
  - [Cómo usarla](#cómo-usarla)
    - [Índice](#índice)
  - [Texto generativo con Gramática libre de contexto :monkey:](#texto-generativo-con-gramática-libre-de-contexto-monkey)
    - [Lo básico](#lo-básico)
    - [Corregir errores](#corregir-errores)
    - [Texto generativo - opciones avanzadas](#texto-generativo---opciones-avanzadas)
      - [Definir probabilidades en las opciones de una regla](#definir-probabilidades-en-las-opciones-de-una-regla)
      - [Transformar el texto definido por una regla](#transformar-el-texto-definido-por-una-regla)
      - [Crear nuevas reglas](#crear-nuevas-reglas)
  - [Aventuras interactivas basadas en texto :alien:](#aventuras-interactivas-basadas-en-texto-alien)
    - [Lo básico](#lo-básico-1)
    - [Corregir errores](#corregir-errores-1)
    - [Historias interactivas - opciones avanzadas](#historias-interactivas---opciones-avanzadas)
      - [¡Añade imágenes!](#añade-imágenes)
      - [Usar texto generativo en las historias](#usar-texto-generativo-en-las-historias)
      - [configuración personalizada](#configuración-personalizada)
        - [Escoger un contenedor](#escoger-un-contenedor)
        - [Cambiar la velocidad de la máquina de escribir](#cambiar-la-velocidad-de-la-máquina-de-escribir)
        - [Sobreescribir el estilo de la interfaz](#sobreescribir-el-estilo-de-la-interfaz)
  - [Resumen rápido](#resumen-rápido)
  - [Ejemplos](#ejemplos)
  - [Ayuda a mejorar esta librería](#ayuda-a-mejorar-esta-librería)
  - [Versión, licencia y copyright](#versión-licencia-y-copyright)
        - [Colaboradores](#colaboradores)

## Texto generativo con Gramática libre de contexto :monkey:

### Lo básico

Los textos generativos que puedes crear con Aventura se estructuran sobre la base de un sistema llamado *[Gramática libre de contexto](https://es.wikipedia.org/wiki/Gram%C3%A1tica_libre_de_contexto)*. En palabras menos extravagantes, puedes imaginar que el texto que vas a generar surge de un árbol en el que el texto final es el tronco, pero, para definir qué partes tendrá ese texto, debes pasar por distintas ramas recogiendo sus frutos (en este caso, los frutos son fracciones de texto). Por cada rama que pasas puedes escoger entre una serie de opciones de texto (de frutos), y una vez escogida, esa opción pasa al tronco como parte del texto final. De hecho, cada rama puede tener sus propias subramas, sus propios caminos por seguir, así que para saber qué pedazo de texto (o fruto) llegará al final, debes llegar al final de todas las ramas y sus subramas (y las subramas de las subramas, y así sucesivamente).

En Aventura, para representar el árbol de tu gramática en JavaScript debes declarar un *[objeto](https://developer.mozilla.org/es/docs/Learn/JavaScript/Objects/Basics)* que contiene una serie de *[arrays](https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/Array)* de *[strings](https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/String)*. Una de esas *arrays* es el tronco (la que tú escojas), y las demás representan ramas o subramas del árbol. Por conveniencia, a todas estas arrays las llamaremos 'reglas'. Cada regla es un listado de opciones de las que se escogerá una cuando el recorrido del árbol pase por la regla (¡incluyendo el tronco!), y dentro de cada una de las opciones puedes poner texto convencional o referencias a otras reglas que se deben seguir para terminar de completar el texto. Para referenciar otra regla debes usar una etiqueta con corchetes angulares: `<regla>`.

Así, un árbol o gramática muy simple, con solo un tronco y una rama, se vería así:

```
const arbol = {
    tronco: ["Hola y <rama>"],
    rama: ["hasta luego","adiós","hasta nunca"]
};
```

Los posibles resultados de un texto generado con esta gramática son: "Hola y hasta luego", "Hola y adiós" u "Hola y hasta nunca". La opción que completará el texto desde la rama se escogerá al azar, y todas las opciones tienen la misma probabilidad de aparecer en el texto final. Si quieres influir más en esas probabilidades, revisa las [opciones avanzadas](#texto-generativo---opciones-avanzadas). Puedes incluir tantas opciones como quieras, incluso solo una, como pasa con el tronco en el ejemplo.

:exclamation: nota que para nombrar al árbol y a sus partes no puedes usar tildes ni espacios, pero el texto que está dentro de las reglas puede tener tildes sin problemas.

¡Prueba los resultados! luego de que crear la gramática, tienes que pasarla como un argumento a tu instancia de Aventura usando la función **'setGrammar'**:

`aventura.setGrammar(arbol);`

Y para obtener un texto generado debes usar la función **'expandGrammar'**, pasando como argumento el nombre del tronco (que en este caso es 'tronco').


`const textoGenerado = aventura.expandGrammar('tronco');`


O, convenientemente, puedes encadenar las funciones de pasar la gramática y luego expandirla, así tienes todo en una sola línea:

`const textoGenerado = aventura.setGrammar(arbol).expandGrammar('tronco');`

Ese que vimos es un generador muy simple, pero puede ser más complejo. Ahora incluyamos más ramas, e incluso subramas:

```
const gramatica = {
    frase: ["Una <animal> <cualidad>"],
    animal: ["gata","jirafa","ardilla"],
    cualidad: ["<color> <adjetivo>"],
    color: ["verde","azul","roja"],
    adjetivo: ["fuerte","inteligente","valiente"]
};

const textoGenerado = aventura.setGrammar(arbol).expandGrammar('tronco');
console.log(textoGenerado);
// Un resultado posible sería: "Una jirafa roja valiente"
```

Nota que aquí una rama (cualidad) está referenciando a dos subramas (color y adjetivo), así que hay que recorrerlas también para obtener el resultado final.

Intenta crear reglas más complejas. ¡Tu imaginación es el límite! ...y el poder del computador, por supuesto. Procura no crear reglas que se referencian circularmente, porque puedes crear un [loop infinito](https://es.wikipedia.org/wiki/Bucle_infinito).

### Corregir errores

Puede que, si creas una gramática compleja, al generar un texto nuevo veas que el programa no funciona. Esto probablemente se deba a que hay una referencia a una regla que no existe. No desesperes, es difícil llevar la cuenta de todas las ramas una vez el árbol se hace más y más grande. Para solucionarlo, Aventura te mostrará el origen de tu error en la consola con un mensaje como este:

```
Tried to expand from rule: "colr", but couldn't find it / Se intentó expandir desde la regla "colr", pero no se pudo encontrar
```

¡Ajá! Lo que este mensaje está diciendo es que no existe la regla "colr", así que tendría que revisar si está mal escrito el nombre de la regla o si debo crearla porque lo olvidé.

:exclamation: no sería imposible que tu programa tuviera otro tipo de error, pero este es sin duda el más común.

### Texto generativo - opciones avanzadas
#### Definir probabilidades en las opciones de una regla
Si quieres que alguna opción en una regla tenga más probabilidades de aparecer cuando se expande el texto final puedes crear una nueva propiedad llamada 'prob' en la *array* que representa la regla. Idealmente, cada opción debe tener un valor de probabilidad entre 0 y 1, y la suma de todos los valores deberá ser igual a 1:

```
const gramatica = {
    colores: ["verde","azul","rojo","púrpura"]
};
gramatica.colores.prob = [0.1,0.2,0.1,0.6]
```

En el ejemplo anterior, "púrpura" tendrá más probabilidad de aparecer que las demás opciones.

#### Transformar el texto definido por una regla
Puedes aplicar ciertas transformaciones al texto que se expande desde alguna regla. Por ejemplo, puedes poner en mayúsculas la primera letra de la cadena de texto o puedes poner en mayúsculas todas sus letras. Si es el caso, las tranformaciones se deben indicar dentro de un par de numerales '#' luego del nombre de una regla referenciada. Si quieres poner varias transformaciones, sepáralas con comas:

```
const gramatica = {
    frase: ["<animal#ALLCAPS#>"],
    animal: ["gato","jirafa","ardilla"]
}
const textoGenerado = aventura.setGrammar(gramatica).developGrammar('frase';
// Un resultado posible puede ser: "ARDILLA"
```

En el momento, las tranformaciones posibles son:
* Primera letra en mayúscula: CAPITALIZE
* Todas las letras en mayúscula: ALLCAPS

#### Crear nuevas reglas
Puedes crear nuevas reglas mientras tu gramática se desenvuelve. Esto es útil para fijar reglas que quieres producir generativamente pero que además usarás recurrentemente en tu nuevo texto. Por ejemplo, piensa en un personaje que aparece varias veces en una historia; quieres que su nombre se decida a partir de una lista de opciones, pero también quieres que, una vez se haya elegido al comienzo de la historia, se siga usando consistentemente en el resto de la historia. Las reglas nuevas se crean definiendo un nuevo nombre para la regla (encerrado en `$`), seguido de un set de subreglas, encerradas en paréntesis angulares. Cada subregla debe especificarse en pares de clave-valor, y el conjunto de subreglas deben separarse por comas:

```
const gramatica = {
    frase: ["$heroe$<nombre:animal,atributo:adjetivo>Esta es la historia de una <heroe.nombre>. Debes saber que la <heroe.nombre> fue muy <heroe.atributo>"],
    animal: ["gata","jirafa","ardilla"],
    adjetivo: ["valiente","poderosa","inteligente"]
}
const textoGenerado = aventura.setGrammar(gramatica).developGrammar('frase';
// Un resultado posible puede ser: "Esta es la historia de una gata. Debes saber que la gata fue muy valiente"
```

## Aventuras interactivas basadas en texto :alien:

### Lo básico

Aventura te permite crear [Historias interactivas basadas en texto](https://es.wikipedia.org/wiki/Aventura_conversacional), en las que debes tomar decisiones que cambian el rumbo de la historia. Aventura produce una interfaz muy simple que permite navegar una historia interactiva de este tipo y controla el camino de decisiones que siguen tus lectores. Aunque viene con unos ajustes por defecto, el estilo de tal interfaz es muy personalizable si conoces los fundamentos [CSS](https://developer.mozilla.org/es/docs/Web/CSS).

Para estructurar una aventura interactiva debes declarar un objeto que contendrá las especificaciones de las escenas de tu aventura. Cada escena será también un objeto en el que debes definir cosas como: qué texto aparecerá cuando tu lectora llegue a esa escena, qué opciones tendrá para decidir cómo continuará la historia, qué mensaje aparecerá luego de la decisión, e incluso, opcionalmente, qué imágenes mostrar en cada escena.

Hay, básicamente, dos tipos de escena:

Una **escena simple**, que solo muestra un texto y un botón de continuar (o de 'continue', si configuraste la librería en inglés) con el que se puede pasar a otra escena. O que muestra solo un texto y ningún botón (por ejemplo, una escena que representa un final de la historia).

Esta es la estructura de un par de objetos de escena simple en un objeto de escenas:

```
const escenas = {
  inicio {
    text: "Érase una vez un círculo aplastado", // aquí va el texto de la escena
    scene: "final" // este es el nombre de la siguiente escena
  },
  final {
    text: "Parece que la historia tomó una elipsis"
  }
}
```

Para mostrar la interfaz que permite navegar la historia, primero debes pasar las escenas a tu instancia de Aventura por medio de la función **setScenes**:

`aventura.setScenes(escenas);`

Y además debes iniciar la aventura con **startAdventure**, pasando como argumento el nombre de la escena inicial:

`aventura.startAdventure('inicio');`

O, convenientemente, puedes encadenar las dos funciones en una sola línea:

`aventura.setScenes(escenas).expandGrammar('inicio');`

El otro tipo de escena es una **escena con opciones**. Aquí, igual que con la escena simple, debes especificar un texto, pero también debes definir una lista de opciones. La lista debe contener objetos con el texto de los botones que explican las decisiones, un texto que se presentará luego de tomar la decisión, y la escena a la que llevará haber tomado la decisión:

```
const escenas = {
  inicio {
    text: "Érase una vez un círculo aplastado", // aquí va el texto de la escena
    options [
      {
        button: "dejar tranquilo",
        text: "dejas al círculo en paz",
        scene: "final1"
      },
      {
        button: "desaplastar", // Este es el texto del botón en esta decisión
        text: "...desaplastando",  // Este es el texto que se mostrará luego de presionar el botón
        scene: "final2" // Esta es la escena a la que dirige
      }
    ]
  },
  final1 {
    text: "Parece que la historia tomó una elipsis"
  }
  final2 {
    text: "Perfecto, un final redondo"
  }
}
```

:exclamation: nota que los parámetros al interior de las escenas tienen nombres en inglés, esto se debe al diseño de la librería. Pero no te preocupes, el contenido puede estár en español (o en el idioma que quieras).

Por supuesto, estas escenas son un ejemplo simple, útil para explicar los fundamentos básicos de la librería, pero tú puedes hacer cosas mucho más complejas, con un número mayor de escenas.

### Corregir errores

Puede que, si creas una historia compleja, al iniciar la interfaz veas que alguna escena no funciona. Esto probablemente se debe a que la escena referenciada en realidad no existe. No desesperes, es difícil llevar la cuenta de todas las escenas, porque la historia puede volverse muy compleja fácilmente. Para solucionar el problema, puedes usar la función **testScenes** (la función es encadenable):

`aventura.setScenes(escenas).testScenes().startAdventure('inicio');`

Así, Aventura te mostrará el origen de tu error en la consola con un mensaje como este:

`The following scenes are dead ends: introduccion => inici / Las siguientes escenas no llevan a ningún lado: introduccion => inici`

Esto quiere decir que tengo que revisar si escribí mal el nombre de la escena o si no existe la escena que estoy referenciando. En el caso del ejemplo, para la escena referenciada en 'introduccion' falta una letra, porque la escena se llama 'inicio'.

:exclamation: Si, intencionalmente, quieres que una escena no lleve a ningún lado (como puede ser el caso con una escena final), para evitar el mensaje de error pon lo siguente en los parámetros de la escena: `deadEnd: true`.

### Historias interactivas - opciones avanzadas

#### ¡Añade imágenes!
:surfer: También puedes añadir imágenes a tus escenas definiendo el parámetro 'image' para establecer el *path* o camino de una imagen en la carpeta de tu proyecto, tanto en tus escenas como en los subobjetos de decisión:

```
const escenas = {
  inicio {
    text: "Érase una vez un círculo aplastado", // aquí va el texto de la escena
    image: "./circuloaplastado.jpg"
    options [
      {
        button: "dejar tranquilo",
        text: "dejas al círculo en paz",
        scene: "final1"
        image: "./circuloaplastado.jpg"
      },
      {
        button: "desaplastar",
        text: "desaplastando",
        scene: "final2"
        image: "./circuloredondeado.jpg"
      }
    ]
  },
  final1 {
    text: "Parece que la historia tomó una elipsis"
  }
  final2 {
    text: "Perfecto, un final redondo"
  }
}
```

#### Usar texto generativo en las historias
Esto es una función poderosa, puedes combinar el texto generativo que produces con una gramática junto con el desarrollo de tu historia. Para hacerlo, debes primero pasar tanto una gramática a tu instancia de Aventura como tus escenas. Así, tus escenas pueden contener *strings* que incluyen referencias a las gramáticas. Aunque esto complica las cosas, es muy útil para crear historias en las que las decisiones de tus lectores no solo afectan el desarrollo de la historia sino que también modifican el propio texto que leerán en las escenas, sea porque se genera uno nuevo con cada nueva ejecución de la historia, sea porque las propias decisiones crean nuevas reglas dentro de la gramática. Para entenderlo mejor, aquí dejo un ejemplo concreto:

```
const gramatica = {
  atributos: ["valiente","esperanzada","impaciente","escurridiza"],
  verde: ["verdosísimo","verdoláceo","verdístico"],
  amarillo: ["amarillento","amarillisísimo","amarillito"],
  azul: ["azulado","azuuul","ultramarino"]
}

const escenas = {
  portada: {
    text: 
    `$ardilla$<atributo:atributos>LA ARDILLA <ardilla.atributo#ALLCAPS#>
Una historia increíble`,
    scene: 'introduccion'
  },
  introduccion:{
    text:"Te voy a contar la historia de una ardilla muy <ardilla.atributo>...",
    scene: 'inicio'
  },
  inicio: {
    text:
    `La ardilla tenía un pelaje bonito de color...`,
    options: [
      {
        button:"Verde",
        scene: "fin",
        text: "$ardilla$<color:verde>Por supuesto, de color <ardilla.color>",
        image: "./assets/squirrel1.jpg"
      },
      {
        button:"Azul",
        scene: "fin",
        text: "$ardilla$<color:azul>Por supuesto, de color <ardilla.color>",
        image: "./assets/squirrel2.jpg"
      },
      {
        button:"Amarillo",
        scene: "fin",
        text: "$ardilla$<color:amarillo>Por supuesto, de color <ardilla.color>",
      }
    ]
  },
  fin: {
    text:"Se acabó la historia",
    scene: "creditos"
  },
  creditos: {
    text: 
    `Esta historia fue escrita por:
    Sergio Rodríguez Gómez
    2020`,
    deadEnd: true
  }
}

aventura.setGrammar(gramatica).setScenes(escenas).testScenes().startAdventure('portada');
```

#### configuración personalizada
Puedes cambiar algunas opciones si pasas un objeto de configuración cuando creas una nueva instancia de Aventura:

```
const config = {
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined
    }
const aventura = new Aventura('es',config);
```
Las opciones son:

##### Escoger un contenedor
Puedes ubicar tu historia en el lugar que quieras en tu proyecto si defines un elemento html contenedor para la interfaz. Para eso, pon el nombre del *id* contenedor en el parámetro **adventureContainer**.

##### Cambiar la velocidad de la máquina de escribir
Para cambiar la velocidad del efecto de máquina de escribir pon como parámetro de **typewriterSpeed** en el objeto de configuración el valor que quieras. El valor por defecto es 50, es decir, una nueva letra cada 50 milisegundos.
Si el valor de **typewriterSpeed** es 0, se desactiva el efecto y el texto aparece de inmediato.

##### Sobreescribir el estilo de la interfaz
Para cancelar el estilo por defecto de la interfaz, pasa `false` en el parámetro **defaultCSS**. Puedes personalizar el estilo como quieras. Como referencia, este es el estilo por defecto de la interfaz:

```
// Contenedor general
#storygeneraldiv {
  box-sizing: border-box;
  margin: auto;
  max-width: 600px;
}

// Contenedor de la historia
#storydiv {
  box-sizing: border-box;
  border: solid black 1px;
}

// Párrafo de texto
.storyp {
  box-sizing: border-box;
  min-height: 40px;
  font-size: 18px;
  padding: 0px 10px;
  font-family: 'Courier New', Courier, monospace;
}

// Botón de opciones
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

// Imagen
.storyimage {
  max-width: 100%;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

// Configuración para dispositivos pequeños
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

## Resumen rápido

General:

* Crear instancia: `const aventura = new Aventura(?idioma, ?configuracion);`
  
---

Texto generativo:

* Pasar gramática: `aventura.setGrammar(gramatica);`
* Expandir gramática: `aventura.expandGammar(raiz);`

---

* Referencia a regla: `<regla>`
* Referencia con transformación: `<regla#TRANSFORMACIÓN#>`
* Nueva regla: `$nombre$<clave:subregla>`

---

Historia interactiva:

* Pasar escenas: `setScenes(escenas);`
* Mostrar interfaz de aventura: `startAdventure(escenaDeInicio);`
* Evaluar estructura de escenas `testScenes(?escenas);`

---

* Escena simple: `{text: texto, ?scene: escenaSiguiente, ?image: imagen, ?deadEnd: escenaFinal}`
* Escena con opciones:
```
{
  text: texto,
  ?image: imagen,
  ?deadEnd: escenaFinal
  options: [
    {
      button: textoBoton,
      text: texto,
      scene: escena
      ?image: imagen
    }
    ?...
  ]
}
```

(? quiere decir opcional)

## Ejemplos
* Un ejemplo de un generador de poemas: [Demostración](https://srsergiorodriguez.github.io/autopoeta/) / [Gramática](https://github.com/srsergiorodriguez/autopoeta/blob/master/docs/assets/autopoetadb.json)

* Un ejemplo de una historia interactiva basada en una historia de Sherlock Holmes: [Demostración](https://srsergiorodriguez.github.io/aventura/ejemplos/historia_interactiva/) / [Código](/docs/ejemplos/historia_interactiva/main.js)

## Ayuda a mejorar esta librería
Todas las sugerencias y contribuciones son bienvenidas.
Es importante decir que esta librería tiene como intención ser bilingüe, así que toma casi el doble de trabajo implementar algunas funciones.

Algunas implementaciones que quisiera añadir en el futuro son:
* Añadir una transformación que pluralice palabras, tanto en inglés como español
* Añadir una interfaz simple que permita mostrar texto generativo
* Añadir a la documentación un tutorial de buenas prácticas para diseñar gramáticas e historias (recomendaciones)
* Crear una interfaz gráfica para diseñar las gramáticas y las historias de forma no líneal (como un árbol) que sea utilizable y exportable

## Versión, licencia y copyright
v2.0.1

(c) Sergio Rodríguez Gómez @srsergiorodriguez

Esta librería está amparada bajo una [licencia MIT](/LICENSE)

2020

##### Colaboradores
@perropulgoso



