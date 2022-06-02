# Aventura :loop:
Biteratura, texto generativo e historias interactivas en JavaScript.

Si ya conoces la librería, puedes pasar al [resúmen rápido](#resumen-rápido)

Para leer la referencia en inglés... For a reference in English: [clic aquí / click here](/README.md).

## Acerca
Esta es una librería que te permite crear texto de forma generativa usando [Gramática libre de contexto](https://es.wikipedia.org/wiki/Gram%C3%A1tica_libre_de_contexto) y [Cadenas de Markov](https://es.wikipedia.org/wiki/Cadena_de_M%C3%A1rkov) e [historias interactivas](https://es.wikipedia.org/wiki/Aventura_conversacional). Aventura tiene el propósito de ser una librería de programación creativa para explorar la "biteratura" o los textos literarios generados por computador. Aunque es sencilla, con ella puedes crear textos o historias complejas que se dividen en múltiples posibilidades generativas.

## Cómo usarla
Solo descarga la [librería](./source/aventura.js) en la carpeta de tu proyecto, y luego añade una etiqueta de *script* a tu documento .html, así:

`<script src="aventura.js"></script>`

En tu código de Javascript, para empezar a usar la librería, crea una instancia de la clase Aventura, y, para que la librería se ajuste al idioma español, pasa como argumento la string 'es'. por ejemplo:

`const aventura = new Aventura('es');`

(si quieres usar la librería con textos en inglés pasa la string 'en' como argumento).

### Índice
- [Aventura :loop:](#aventura-loop)
  - [Acerca](#acerca)
  - [Cómo usarla](#cómo-usarla)
    - [Índice](#índice)
  - [Texto generativo](#texto-generativo)
    - [Texto generativo con Gramática libre de contexto :monkey:](#texto-generativo-con-gramática-libre-de-contexto-monkey)
      - [Lo básico](#lo-básico)
      - [Corregir errores](#corregir-errores)
      - [Opciones avanzadas](#opciones-avanzadas)
        - [Definir probabilidades en las opciones de una regla](#definir-probabilidades-en-las-opciones-de-una-regla)
        - [Transformar el texto definido por una regla](#transformar-el-texto-definido-por-una-regla)
        - [Crear nuevas reglas](#crear-nuevas-reglas)
    - [Texto generativo con Cadenas de Markov :floppy_disk:](#texto-generativo-con-cadenas-de-markov-floppy_disk)
      - [Lo básico](#lo-básico-1)
      - [Guardar el modelo](#guardar-el-modelo)
      - [Analizar el modelo](#analizar-el-modelo)
  - [Historias interactivas basadas en texto :alien:](#historias-interactivas-basadas-en-texto-alien)
    - [Lo básico](#lo-básico-2)
    - [Corregir errores](#corregir-errores-1)
    - [Historias interactivas - opciones avanzadas](#historias-interactivas---opciones-avanzadas)
      - [¡Añade imágenes!](#añade-imágenes)
      - [Usar texto generativo en las historias](#usar-texto-generativo-en-las-historias)
  - [Configuración personalizada](#configuración-personalizada)
        - [Escoger un contenedor](#escoger-un-contenedor)
        - [Cambiar la velocidad de la máquina de escribir](#cambiar-la-velocidad-de-la-máquina-de-escribir)
        - [Cambiar el formato del Igrama](#cambiar-el-formato-del-igrama)
        - [Código personalizado en las escenas](#código-personalizado-en-las-escenas)
        - [Sobreescribir el estilo de la interfaz](#sobreescribir-el-estilo-de-la-interfaz)
  - [Resumen rápido](#resumen-rápido)
  - [Ejemplos](#ejemplos)
  - [Ayuda a mejorar esta librería](#ayuda-a-mejorar-esta-librería)
  - [Versión, licencia y copyright](#versión-licencia-y-copyright)
        - [Colaboradores](#colaboradores)

## Texto generativo 

### Texto generativo con Gramática libre de contexto :monkey:

#### Lo básico

Un tipo de texto generativo que puedes crear con Aventura se estructura sobre la base de un sistema llamado *[Gramática libre de contexto](https://es.wikipedia.org/wiki/Gram%C3%A1tica_libre_de_contexto)*. En palabras menos extravagantes, puedes imaginar que el texto que vas a generar está definido por una posible secuencia de pedacitos de texto unidos, y para obtener los pedacitos finales debes definir dos cosas diferentes: un orden en el que irán unidos y unas opciones de las cuales escoger los pedacitos. El orden y las opciones conforman lo que llamaremos una "gramática".
Supongamos que queremos crear una frase simple que está compuesta de dos partes, un saludo y una despedida. Primero definimos un orden para las partes: primero va el saludo y luego va la despedida, y luego definimos unas opciones para esas partes: digamos que el saludo siempre será "Hola", pero que las despedidas pueden ser "hasta luego", "adiós", o "hasta nunca". Imagina que para generar el texto vamos pasando por cada parte en orden y, como si tuvieramos una bolsa llena de opciones, metemos la mano y sacamos una de las opciones disponibles para cada parte. 

Ahora que ya tenemos una gramática lo que sigue es escribirla en código para que Aventura pueda generar textos. En Aventura, para representar tu gramática en JavaScript debes declarar un *[objeto](https://developer.mozilla.org/es/docs/Learn/JavaScript/Objects/Basics)* que contiene una serie de *[arrays](https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/Array)* de *[strings](https://developer.mozilla.org/es/docs/Web/JavaScript/Referencia/Objetos_globales/String)*. Una de esas *arrays* es la base (la que tú escojas) que contiene el orden inicial y las demás representan opciones. Por conveniencia, a todas estas arrays las llamaremos 'reglas'. Para darle la indicación a aventura de que busque en las opciones de otra regla debes usar una etiqueta con corchetes angulares: `<regla>`.

Así, una gramática muy simple, se vería así:

```Javascript
const gramatica = {
    base: ["Hola y <despedida>"],
    despedida: ["hasta luego", "adiós", "hasta nunca"]
};
```

Los posibles resultados de un texto generado con esta gramática son: "Hola y hasta luego", "Hola y adiós" y "Hola y hasta nunca". La opción que completará el texto desde la regla "despedida" se escogerá al azar, y todas las opciones tienen la misma probabilidad de aparecer en el texto final. Si quieres influir más en esas probabilidades, revisa las [opciones avanzadas](#texto-generativo---opciones-avanzadas). Puedes incluir tantas opciones como quieras, incluso solo una, como pasa con el tronco en el ejemplo.

:exclamation: observa que para nombrar a las reglas no puedes usar tildes ni espacios, pero el texto que está dentro de las reglas puede tener tildes sin problemas.

¡Prueba los resultados! luego de que crear la gramática, tienes que pasarla como un argumento a tu instancia de Aventura usando la función **'fijarGramatica'**:

`aventura.fijarGramatica(gramatica);`

Y para obtener un texto generado debes usar la función **'expandirGramatica'**, pasando como argumento el nombre de la regla inicial (que en este caso es 'base').

`const textoGenerado = aventura.expandirGramatica('base');`

O, convenientemente, puedes encadenar las funciones de pasar la gramática y luego expandirla, así tienes todo en una sola línea:

`const textoGenerado = aventura.fijarGramatica(gramatica).expandirGramatica('base');`

Ese que vimos es un generador muy simple, pero puede ser más complejo. Ahora incluyamos más reglas, e incluso subreglas:

```Javascript
const gramatica = {
    frase: ["Una <animal> <cualidad>"],
    animal: ["gata", "jirafa", "ardilla"],
    cualidad: ["<color> <adjetivo>"],
    color: ["verde", "azul", "roja"],
    adjetivo: ["fuerte", "inteligente", "valiente"]
};

const textoGenerado = aventura.fijarGramatica(gramatica).expandirGramatica('frase');
console.log(textoGenerado);
// Un resultado posible sería: "Una jirafa roja valiente"
```

Observa que aquí una regla (cualidad) está referenciando a dos subreglas (color y adjetivo), así que hay que recorrerlas también para obtener el resultado final. Es como una gramatica metida dentro de otra gramática.

Intenta crear reglas más complejas. ¡Tu imaginación es el límite! ...y el poder del computador, por supuesto. Procura no crear reglas que se referencian circularmente, porque puedes crear un [loop infinito](https://es.wikipedia.org/wiki/Bucle_infinito).

#### Corregir errores

Puede que, si creas una gramática compleja, al generar un texto nuevo veas que el programa no funciona. Esto probablemente se deba a que hay una referencia a una regla que no existe. No desesperes, es difícil llevar la cuenta de todas las ramas una vez el árbol se hace más y más grande. Para solucionarlo, Aventura te mostrará el origen de tu error en la consola con un mensaje como este:

`Se intentó expandir desde la regla "colr", pero no se pudo encontrar`

¡Ajá! Lo que este mensaje está diciendo es que no existe la regla "colr", así que tendría que revisar si está mal escrito el nombre de la regla o si debo crearla porque lo olvidé.

:exclamation: no sería imposible que tu programa tuviera otro tipo de error, pero este es sin duda el más común.

Para hacer un análisis general de tu gramática, y así encontrar todos los errores posibles de referencias a reglas que no existen, puedes usar la función **'probarGramatica'** (la función es encadenable, antes de expandir la gramática):

`const textoGenerado = aventura.fijarGramatica(gramatica).probarGramatica().expandirGramatica('frase');`

Así, Aventura te mostrará en la consola el origen de todos los errores en gramática con mensajes como este:

`Las siguientes reglas, que se referencian en "cualidad", no existen: clr`

#### Opciones avanzadas
##### Definir probabilidades en las opciones de una regla
Si quieres que alguna opción en una regla tenga más probabilidades de aparecer cuando se expande el texto final puedes crear una nueva propiedad llamada 'prob' en la *array* que representa la regla. Idealmente, cada opción debe tener un valor de probabilidad entre 0 y 1, y la suma de todos los valores deberá ser igual a 1:

```Javascript
const gramatica = {
    colores: ["verde", "azul", "rojo", "púrpura"]
};
gramatica.colores.prob = [0.1, 0.2, 0.1, 0.6];
```

En el ejemplo anterior, "púrpura" tendrá más probabilidad de aparecer que las demás opciones.

##### Transformar el texto definido por una regla
Puedes aplicar ciertas transformaciones al texto que se expande desde alguna regla. Por ejemplo, puedes poner en mayúsculas la primera letra de la cadena de texto o puedes poner en mayúsculas todas sus letras. Si es el caso, las tranformaciones se deben indicar dentro de un par de numerales '#' luego del nombre de una regla referenciada. Si quieres poner varias transformaciones, sepáralas con comas:

```Javascript
const gramatica = {
    frase: ["<animal#ALLCAPS#>"],
    animal: ["gato", "jirafa", "ardilla"]
}
const textoGenerado = aventura.fijarGramatica(gramatica).expandirGramatica('frase');
// Un resultado posible sería: "ARDILLA"
```

En el momento, las tranformaciones posibles son:
* Primera letra en mayúscula: CAPITALIZE
* Todas las letras en mayúscula: ALLCAPS

##### Crear nuevas reglas
Puedes crear nuevas reglas mientras tu gramática se expande. Esto es útil para fijar reglas que quieres producir generativamente pero que además usarás recurrentemente en tu nuevo texto. Por ejemplo, piensa en un personaje que aparece varias veces en una historia; quieres que su nombre se decida a partir de una lista de opciones, pero también quieres que, una vez se haya elegido al comienzo de la historia, se siga usando consistentemente en el resto de la historia. Las reglas nuevas se crean definiendo un nuevo nombre para la regla (encerrado en `$`), seguido de un set de subreglas, encerradas en paréntesis cuadrados: `[clave1:valor1,clave2,valor2...]`. Cada subregla debe especificarse en pares de clave-valor, y el conjunto de subreglas deben separarse por comas:

```Javascript
const gramatica = {
    frase: ["$heroe$[nombre:animal,atributo:adjetivo]Esta es la historia de una <heroe.nombre>. Debes saber que la <heroe.nombre> fue muy <heroe.atributo>"],
    animal: ["gata", "jirafa", "ardilla"],
    adjetivo: ["valiente", "poderosa", "inteligente"]
}
const textoGenerado = aventura.fijarGramatica(gramatica).expandirGramatica('frase');
// Un resultado posible puede ser: "Esta es la historia de una gata. Debes saber que la gata fue muy valiente"
```

Adicionalmente, si quieres que deje de estar disponible una opción una vez se elige puedes poner un signo "menos" antes de la clave `-clave:valor`. Esto lo eliminará de la array. Esta funcionalidad es útil, por ejemplo, si quieres elegir un nombre de personaje y no quieres que se use en otras partes que también aprovechen la misma lista de opciones.

### Texto generativo con Cadenas de Markov :floppy_disk:

#### Lo básico

Otro tipo de texto generativo que puedes crear con Aventura se estructura sobre la base de un sistema llamado *[Cadenas de Markov](https://es.wikipedia.org/wiki/Cadena_de_M%C3%A1rkov)*. En palabras menos rimbombantes, imagina que lees un texto completo y vas anotando qué probabilidad hay de que una palabra siga a otra. Por ejemplo, lees el texto "Un gato es un animal noble. Un gato es nobleza" y descubres que las probabilidades de las palabras que pueden seguir después de "Un" son estas: "gato" 67% de probabilidad aprox. (porque aparece dos veces), "animal" 33% de probabilidad aprox. (porque aparece una vez). Luego, teniendo las probabilidades de cada palabra, puedes escoger una semilla, es decir una primera palabra, y escoger palabras posibles que siguen a esa semilla, y así sucesivamente vas generando una cadena de palabras. Por eso, justamente, se llama una Cadenda de 
Markov.

Para lograr esto en Aventura primero debes generar un modelo de Markov que contenga las probabilidades usando la función `modeloMarkov`, pasando el archivo de texto que quieres analizar:

```JavaScript
  aventura.modeloMarkov("textoBase.txt")
```

Este análisis un poco de tiempo, no mucho. Así que la función devuelve una promesa. Luego, el modelo que devuelve la promesa lo puedes fijar a Aventura con la función `fijarMarkov`  y, una vez fijado, lo puedes usar para generar textos con la función `cadenaMarkov`. En `cadenaMarkov` debes pasar como argumentos el número de palabras que quieres generar y la semilla de la que parte la cadena:

```JavaScript
aventura.modeloMarkov("textoBase.txt").then(modelo => {
  const textoGenerado = aventura.fijarMarkov(modelo).cadenaMarkov(100, 'semilla');
  console.log(textoGenerado);
});
```

Es así de simple.

Sin embargo, aquí cabe añadir que, de hecho, un modelo de Markov puede generarse no solo con una palabra sino con una secuencia de palabras. Es lo que en teoría llaman un n-grama. Por ejemplo: 'gato' o 'el' son unigramas, mientras que 'el gato' o 'gato negro' son bigramas. La n en n-grama es el número de palabras que se usan para generar el modelo. Entonces, en Aventura podemos generar un modelo con diferentes n-gramas pasando n como segundo argumento en `modeloMarkov`. Dicho esto, es importante que la semilla sea también un n-grama del mismo tamaño que se definió para el modelo:

```JavaScript
aventura.modeloMarkov("textoBase.txt", 2).then(modelo => {
  const textoGenerado = aventura.fijarMarkov(modelo).cadenaMarkov(100, 'semilla viva');
  console.log(textoGenerado);
});
```

Cuando Aventura no encuentra la semilla en el modelo, simplemente escoge una semilla válida al azar.

#### Guardar el modelo

Si pasas como tercer argumento de `modeloMarkov` el booleano `true`, entonces Aventura guardará el modelo en un archivo .json. Ese modelo puedes usarlo después usando la función `cargarJSON` de Aventura:

```JavaScript
aventura.cargarJSON("./modeloMarkov.json").then(modelo => {
  const textoGenerado = aventura.fijarMarkov(modelo).cadenaMarkov(100, 'semilla viva');
  console.log(textoGenerado);
});
```

#### Analizar el modelo

Una opción adicional que ofrece este sistema consiste en hacer una visualización muy simple de la distribución de probabilidades en la consola con la función encadenable `modeloMarkov`:

```JavaScript
aventura.cargarJSON("./modeloMarkov.json").then(modelo => {
  const textoGenerado = aventura.fijarMarkov(modelo)
    .probarDistribucion() // Probar la distribución con esta función
    .cadenaMarkov(100, 'semilla viva');
  console.log(textoGenerado);
});
```

Así se puede tener una idea muy general de la variedad del texto original. Si la mayoría de la distribución está en el número 1 eso quiere decir que el texto no es muy diverso, y por lo tanto el texto generado será muy parecido al original. Por el contrario, si la distribución es mayor por los números cercanos al 0 entonces el texto original es más diverso y por lo tanto el texto generado también lo será.

## Historias interactivas basadas en texto :alien:

### Lo básico

Aventura te permite crear [Historias interactivas basadas en texto](https://es.wikipedia.org/wiki/Aventura_conversacional), en las que debes tomar decisiones que cambian el rumbo de la historia. Aventura produce una interfaz muy simple que permite navegar una historia interactiva de este tipo y controla el camino de decisiones que siguen tus lectores. Aunque viene con unos ajustes por defecto, el estilo de tal interfaz es muy personalizable si conoces los fundamentos [CSS](https://developer.mozilla.org/es/docs/Web/CSS).

Para estructurar una aventura interactiva debes declarar un objeto que contendrá las especificaciones de las escenas de tu aventura. Cada escena será también un objeto en el que debes definir cosas como: qué texto aparecerá cuando tu lectora llegue a esa escena, qué opciones tendrá para decidir cómo continuará la historia, qué mensaje aparecerá luego de la decisión, e incluso, opcionalmente, qué imágenes mostrar en cada escena.

Hay, básicamente, dos tipos de escena:

Una **escena simple**, que solo muestra un texto y un botón de continuar (o de 'continue', si configuraste la librería en inglés) con el que se puede pasar a otra escena. O que muestra solo un texto y ningún botón (por ejemplo, una escena que representa un final de la historia).

Esta es la estructura de un par de objetos de escena simple en un objeto de escenas:

```Javascript
const escenas = {
  inicio: {
    texto: "Érase una vez un círculo aplastado", // aquí va el texto de la escena
    escena: "final" // este es el nombre de la siguiente escena
  },
  final: {
    texto: "Parece que la historia formó una elipsis",
    sinSalida: true
  }
}
```

Para mostrar la interfaz que permite navegar la historia, primero debes pasar las escenas a tu instancia de Aventura por medio de la función **fijarEscenas**:

`aventura.fijarEscenas(escenas);`

Y además debes iniciar la aventura con **iniciarAventura**, pasando como argumento el nombre de la escena inicial:

`aventura.iniciarAventura('inicio');`

O, convenientemente, puedes encadenar las dos funciones en una sola línea:

`aventura.fijarEscenas(escenas).iniciarAventura('inicio');`

El otro tipo de escena es una **escena con opciones**. Aquí, igual que con la escena simple, debes especificar un texto, pero también debes definir una lista de opciones. La lista debe contener objetos con el texto de los botones que explican las decisiones, opcionalmente un texto que se presentará luego de tomar la decisión, y la escena a la que llevará haber tomado la decisión:

```Javascript
const escenas = {
  inicio: {
    texto: "Érase una vez un círculo...", // aquí va el texto de la escena
    opciones: [
      {
        btn: "dejar tranquilo",
        texto: "dejas al círculo en paz", // esto es opcional, si se pone, la interfaz mostrará una escena intermedia con este texto
        escena: "final1"
      },
      {
        btn: "aplastar", // Este es el texto del botón en esta decisión
        texto: "...aplastamiento activado...",  // Este es el texto que se mostrará luego de presionar el botón
        escena: "final2" // Esta es la escena a la que dirige
      }
    ]
  },
  final1: {
    texto: "Perfecto, un final redondo",
    sinSalida: true
  },
  final2: {
    texto: "Parece que la historia formó una elipsis",
    sinSalida: true
  }
}
```

Por supuesto, estas escenas son un ejemplo sencillo, útil para explicar los fundamentos básicos de la librería, pero tú puedes hacer cosas mucho más complejas, con un número mayor de escenas.

### Corregir errores

Puede que, si creas una historia compleja, al iniciar la interfaz veas que alguna escena no funciona. Esto probablemente se debe a que la escena referenciada en realidad no existe. No desesperes, es difícil llevar la cuenta de todas las escenas, porque la historia puede volverse muy enredada fácilmente. Para solucionar el problema, puedes usar la función **probarEscenas** (la función es encadenable):

`aventura.fijarEscenas(escenas).probarEscenas().iniciarAventura('inicio');`

Así, Aventura te mostrará el origen de tu error en la consola con un mensaje como este:

`Las siguientes escenas no llevan a ningún lado: introduccion => inici`

Esto quiere decir que hay que revisar si está mal escrito el nombre de la escena o si no existe la escena referenciada. En el caso del ejemplo, para la escena referenciada en 'introduccion' falta una letra, porque la escena se llama 'inicio'.

:exclamation: Si, intencionalmente, quieres que una escena no lleve a ningún lado (como puede ser el caso con una escena final), para evitar el mensaje de error pon lo siguiente en los parámetros de la escena: `sinSalida: true`.

### Historias interactivas - opciones avanzadas

#### ¡Añade imágenes!
:surfer: También puedes añadir imágenes a tus escenas definiendo el parámetro 'imagen' para establecer el *path* o camino de una imagen en la carpeta de tu proyecto, tanto en tus escenas como en los subobjetos de decisión:

```Javascript
const escenas = {
  inicio: {
    texto: "Érase una vez un círculo...", // aquí va el texto de la escena
    imagen: "./circulo.jpg",
    opciones: [
      {
        btn: "dejar tranquilo",
        texto: "dejas al círculo en paz",
        imagen: "./circulo.jpg",
        escena: "final1"
      },
      {
        btn: "aplastar", // Este es el texto del botón en esta decisión
        texto: "...aplastamiento activado...",  // Este es el texto que se mostrará luego de presionar el botón
        imagen: "./circuloaplastado.jpg",
        escena: "final2" // Esta es la escena a la que dirige
      }
    ]
  },
  final1: {
    texto: "Perfecto, un final redondo",
    imagen: "./circulo.jpg",
    sinSalida: true
  },
  final2: {
    texto: "Parece que la historia formó una elipsis",
    imagen: "./circuloaplastado.jpg",
    sinSalida: true
  }
}
```

#### Usar texto generativo en las historias
Esto es una función poderosa, puedes combinar el texto generativo que produces con una gramática junto con el desarrollo de tu historia. Para hacerlo, debes primero pasar tanto una gramática a tu instancia de Aventura como tus escenas. Así, tus escenas pueden contener *strings* que incluyen referencias a las reglas de la gramática. Aunque esto complica las cosas, es muy útil para crear historias en las que las decisiones de tus lectores no solo afectan el desarrollo de la historia sino que también modifican el propio texto que leerán en las escenas, sea porque se genera uno nuevo con cada nueva ejecución de la historia, sea porque las propias decisiones crean nuevas reglas dentro de la gramática. Para entenderlo mejor, aquí dejo un ejemplo concreto:

```Javascript
const gramatica = {
  atributos: ["valiente", "esperanzada", "impaciente", "escurridiza"],
  verde: ["verdosísimo", "verdoláceo", "verdístico"],
  amarillo: ["amarillento", "amarillisísimo", "amarillito"],
  azul: ["azulado", "azuuul", "ultramarino"]
}

const escenas = {
  portada: {
    texto: 
    `$ardilla$[atributo:atributos]LA ARDILLA <ardilla.atributo#ALLCAPS#>
Una historia increíble`,
    escena: 'introduccion'
  },
  introduccion: {
    texto:"Te voy a contar la historia de una ardilla muy <ardilla.atributo>...",
    escena: 'inicio'
  },
  inicio: {
    texto:
    `La ardilla tenía un pelaje bonito de color...`,
    opciones: [
      {
        btn:"Verde",
        escena: "fin",
        texto: "$ardilla$[color:verde]Por supuesto, de color <ardilla.color>"
      },
      {
        btn:"Azul",
        escena: "fin",
        texto: "$ardilla$[color:azul]Por supuesto, de color <ardilla.color>"
      },
      {
        btn:"Amarillo",
        escena: "fin",
        texto: "$ardilla$[color:amarillo]Por supuesto, de color <ardilla.color>"
      }
    ]
  },
  fin: {
    texto:"Se acabó la historia",
    escena: "creditos"
  },
  creditos: {
    texto: 
    `Esta historia fue escrita por:
    Sergio Rodríguez Gómez
    2020`,
    sinSalida: true
  }
}

aventura.fijarGramatica(gramatica).fijarEscenas(escenas).iniciarAventura('portada');
```

## Configuración personalizada
Puedes cambiar algunas opciones si pasas un objeto de configuración cuando creas una nueva instancia de Aventura:

```Javascript
const config = {
      typewriterSpeed: 50,
      defaultCSS: true,
      adventureContainer: undefined,
      igramaFormat: 'png',
      sceneCallback: (s) => { return s }
    }
const aventura = new Aventura('es',config);
```
Las opciones son:

##### Escoger un contenedor
Puedes ubicar tu historia en el lugar que quieras en tu proyecto si defines un elemento html contenedor para la interfaz. Para eso, pon el nombre del *id* contenedor en el parámetro **adventureContainer**.

##### Cambiar la velocidad de la máquina de escribir
Para cambiar la velocidad del efecto de máquina de escribir pon como parámetro de **typewriterSpeed** en el objeto de configuración el valor que quieras. El valor por defecto es 50, es decir, una nueva letra cada 50 milisegundos.
Si el valor de **typewriterSpeed** es 0, se desactiva el efecto y el texto aparece de inmediato.

##### Cambiar el formato del Igrama
Para cancelar el formato por defecto del igrama, pasa `png` o `gif` en el parámetro **igramaFormat**. El formato por defecto es .png.

##### Código personalizado en las escenas
Puedes ejecutar código personalizado en las escenas con el parámetro **igramaFormat** que define un callback que se ejecuta cada vez que se cambia de escena en la historia interactiva. Este callback devuelve la escena que se está presentando.

##### Sobreescribir el estilo de la interfaz
Para cancelar el estilo por defecto de la interfaz, pasa `false` en el parámetro **defaultCSS**. Puedes personalizar el estilo como quieras. Como referencia, este es el estilo por defecto de la interfaz:

```CSS
/* Contenedor general */

#storygeneraldiv {
  box-sizing: border-box;
  margin: auto;
  max-width: 600px;
}

/* Contenedor de la historia */

#storydiv {
  box-sizing: border-box;
  border: solid black 1px;
}

/* Párrafo de texto */

.storyp {
  box-sizing: border-box;
  min-height: 40px;
  font-size: 18px;
  padding: 0px 10px;
  font-family: 'Courier New', Courier, monospace;
}

/* Botón de opciones */

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

/* Imagen */

.storyimage {
  max-width: 100%;
  max-height: 70vh;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

/* Área clickeable en la imagen */

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

/* Configuración para dispositivos pequeños */

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
    background: white;
    font-size: 10vw;
  }
}
```

## Resumen rápido
(? quiere decir opcional)

General:

* Crear instancia: `const aventura = new Aventura(?idioma, ?configuracion);`
  
---

Texto generativo con Gramáticas Libres de Contexto:

* Fijar gramática: `fijarGramática(gramatica);`
* Evaluar estructura de la gramática: `probarGramatica(?gramatica);`
* Expandir gramática: `expandirGramática(raiz);`

---

* Referencia a regla: `<regla>`
* Referencia con transformación: `<regla#TRANSFORMACIÓN#>`
* Nueva regla: `$nombre$[clave:subregla]`

---

Texto generativo con Cadenas de Markov:

* Generar modelo: `cargarJSON(camino);` Devuelve promesa
* Cargar modelo: `cargarJSON(camino, ?n, ?guardarModelo);` Devuelve promesa 
* Fijar modelo: `fijarMarkov(modelo);` 
* Probar distribución: `probarDistribucion();` 
* Generar Texto: `cadenaMarkov(n, semilla);`

---

Historia interactiva:

* Pasar escenas: `fijarEscenas(escenas);`
* Mostrar interfaz de aventura: `inciarAventura(escenaDeInicio);`
* Evaluar estructura de escenas: `probarEscenas(?escenas);`

---

* Escena simple: `{texto, ?escena, ?imagen, ?sinSalida: escenaFinal}`
* Escena con opciones:
```
{
  texto,
  ?imagen,
  opciones: [
    {
      btn,
      ?texto,
      escena,
      ?imagen,
      ?igrama
    }
    ?...
  ]
}
```

## Ejemplos
* Un ejemplo de un generador de poemas: [Demostración](https://srsergiorodriguez.github.io/autopoeta/) / [Gramática](https://github.com/srsergiorodriguez/autopoeta/blob/master/docs/assets/autopoetadb.json)

* Un ejemplo de una historia interactiva con imágenes: [Demostración](https://preview.p5js.org/ssergiorodriguezz/present/aOlzMjUk-) / [Código](https://editor.p5js.org/ssergiorodriguezz/sketches/aOlzMjUk-)

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
v2.3.6

(c) Sergio Rodríguez Gómez @srsergiorodriguez

Esta librería está amparada bajo una [licencia MIT](./LICENSE)

2022

##### Colaboradores
@perropulgoso
