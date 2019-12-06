let escenas = {
  cover: {
    title: "La aventura del pulgar del ingeniero",
    subtitle: "Basado en una historia de Sherlock Holmes\npor Arthur Conan Doyle"
  },
  intro:{
    text:"A la casa de Sherlock Holmes en Baker Street llega Watson acompañado por un hombre con la mano vendada. Sherlock, interesado en el caso, los recibe y le pide al hombre, llamado Victor Hartherley, que cuente su historia:"
  },
  start: {
    text:"-Soy un ingeniero hidráulico -dice Hartherley-, pero, a pesar de mi profesión, no tengo mucho dinero. Sin embargo, hace apenas un día viene un hombre que se presenta como Lisander Stark y me ofrece un trabajo. Dice que me paga cincuenta guineas por hacerlo, pero me dice inisistentemente que debo guardar absoluto silencio sobre el tipo de trabajo que me ofrecerá.\n-¿Lo promete? -dice él-",
    optionA:"Sí",
    optionB:"No",
    sceneA:"trabajo",
    sceneB:"end",
    messageA: "El señor Stark se alegra y decide contarme en qué consiste el encargo.",
    messageB: "El señor Stark, muy decepcionado, me dice que me largue... Ahora que lo pienso, me habrían venido bien las cincuenta guineas."
  },
  trabajo: {
    text:"-Pues bien -dice Stark- resulta que tengo una finca y por casualidad descubrí que el suelo tiene un pequeño yacimiento de tierra de batán. Usted sabe que esa tierra es muy escasa aquí en Londres, así que decidí explotarla para ganar un poco de dinero. No obstante, me di cuenta de que parte del yacimiento está en las fincas aledañas, así que instalé una bomba para extraer el batán de los vecinos sin que se den cuenta. El problema es que la bomba se me dañó, y por eso quiero que la revise. ¿Qué dice?",
    optionA:"Aceptar",
    optionB:"Negarse",
    sceneA:"trabajar",
    sceneB:"ataque",
    messageA: "-¡Qué bien! -dice Stark-, entonces lo espero esta noche en la estación de Paddington para que vayamos a Eyford, el pueblo donde está mi finca.",
    messageB: "—¡Le dije que es un asunto secreto!, ahora no me queda otra que matarlo -grita Stark-"
  },
  ataque: {
    text:"Stark saca una pistola y me apunta, yo decido...",
    optionA:"Huir",
    optionB:"Atacar",
    sceneA:"end",
    sceneB:"end",
    messageA: "Stark me persigue y a gritos llama a la policía. Cuando me atrapan me acusa de estar asaltando su casa, ahora debo conseguir un abogado defensor que me ayude con el caso.",
    messageB: "Stark dispara y me da justo en el pulgar, y por eso tengo la mano vendada."
  },
  trabajar: {
    text:"En la noche, tomamos el tren a Eyford y llegamos a una casa grande. Stark me lleva a un cuarto y me pide que espere un momento. Una vez sale, al rato, una mujer asustada y temblorosa entra al cuarto y me dice:\n-¡Huya! ¡No sabe lo que le puede suceder! No se quede aquí, no es bueno quedarse aquí.\nYo decido...",
    optionA:"Huir",
    optionB:"Quedarme",
    sceneA:"huir",
    sceneB:"quedarse",
    messageA: "La cara de horror de la mujer me convence de que debo huir. Así que abro la ventana y saco los pies.",
    messageB: "Aunque está afectada, no le hago caso a la mujer. Parece loca."
  },
  huir: {
    text:"La mujer me insiste, parece desesperada, me fijo bien y tiene un moretón en el ojo.",
    optionA:"Huir",
    optionB:"Quedarme",
    sceneA:"huir",
    sceneB:"quedarse",
    messageA: "La cara de horror de la mujer me convence que debo huir. Así que abro la ventana y saco los pies.",
    messageB: "Aunque está afectada, no le hago caso a la mujer. Parece loca."
  },
  quedarse: {
    text:"La mujer me insiste, parece desesperada, me fijo bien y tiene un moretón en el ojo. Ella sale corriendo por la puerta.",
    optionA:"Huir",
    optionB:"Quedarme",
    sceneA:"regreso",
    sceneB:"regreso",
    messageA: "Veo que hay una ventana por la que podría escapar. Me acerco, pero justo llega Stark.",
    messageB: "Me quedo esperando en el cuarto, veo muchas cajas acumuladas, Stark regresa."
  },
  regreso: {
    text:"La mujer me insiste, parece desesperada, me fijo bien y tiene un moretón en el ojo. Ella sale corriendo por la puerta.",
    optionA:"Huir",
    optionB:"Quedarme",
    sceneA:"regreso",
    sceneB:"regreso",
    messageA: "Veo que hay una ventana por la que podría escapar. Me acerco, pero justo llega Stark.",
    messageB: "Me quedo esperando en el cuarto, veo muchas cajas acumuladas, Stark regresa."
  },
  end: {
    text:"Has completado la historia... ¿Crees que pudo haber tomado un rumbo diferente? Si quieres, prueba de nuevo."
  },
  credits: {
    text: "Este juego fue hecho por:",
    authors: ["Sergio Rodríguez Gómez"],
    year: 2019
  }
}

let grammar = {
  config: ["$heroe$<art:articulos,raza:razas,atributo:atributos><inicio>"],
  inicio: ["<heroe.art#CAPITALIZE#> <heroe.atributo> <heroe.raza> se dirige al <lugares>. ¿Ya dije que era <heroe.atributo>?"],
  razas: ["gata","mazorca","ballena","hormiga","avellana"],
  atributos: ["valiente","esperanzada","impaciente","escurridiza"],
  articulos: ["una"],
  lugares: ["castillo Woghntocz","infierno","centro de esgrima"]
}

const aventura = new Aventura('es');
aventura.setScenes(escenas);
// let newstyle = `
//       #storydiv {
//         border: solid black 1px;
//         background: green;
//       }`;
aventura.domAdventure();
// aventura.overrideStyle(newstyle);
//aventura.promptAdventure();
//console.log(aventura);

// aventura.setGrammar(grammar);
// let texto = aventura.developGrammar("config");
// console.log(texto);