// Crea un objeto que contenga las escenas de tu historia
let escenas = {
  cover: {
    title: "La aventura del pulgar del ingeniero",
    subtitle: "Basado en una historia de Sherlock Holmes\npor Arthur Conan Doyle",
  },
  intro:{
    text: "A la casa de Sherlock Holmes en Baker Street llega Watson acompañado por un hombre con la mano vendada. Sherlock, interesado en el caso, los recibe y le pide al hombre, llamado Victor Hartherley, que cuente su historia:"
  },
  start: {
    text: "-Soy un ingeniero hidráulico -dice Hartherley-, pero, a pesar de mi profesión, no tengo mucho dinero. Sin embargo, hace apenas un día viene un hombre que se presenta como Lisander Stark y me ofrece un trabajo. Dice que me paga cincuenta guineas por hacerlo, pero me dice insistentemente que debo guardar absoluto silencio sobre el tipo de trabajo que me ofrecerá.\n-¿Lo promete? -dice él-",
    optionA: "Sí",
    optionB: "No",
    sceneA: "trabajo",
    sceneB: "end",
    messageA: "El señor Stark se alegra y decide contarme en qué consiste el encargo.",
    messageB: "El señor Stark, muy decepcionado, me dice que me largue... Ahora que lo pienso, me habrían venido bien las cincuenta guineas."
  },
  trabajo: {
    text: "-Pues bien -dice Stark- resulta que tengo una finca y por casualidad descubrí que el suelo tiene un pequeño yacimiento de tierra de batán. Usted sabe que esa tierra es muy escasa aquí en Londres, así que decidí explotarla para ganar un poco de dinero. No obstante, me di cuenta de que parte del yacimiento está en las fincas aledañas, así que instalé una bomba para extraer el batán de los vecinos sin que se den cuenta. El problema es que la bomba se me dañó, y por eso quiero que la revise. ¿Qué dice?",
    optionA: "Aceptar",
    optionB: "Negarse",
    sceneA: "trabajar",
    sceneB: "ataque",
    messageA: "-¡Qué bien! -dice Stark-, entonces lo espero esta noche en la estación de Paddington para que vayamos a Eyford, el pueblo donde está mi finca.",
    messageB: "—¡Le dije que es un asunto secreto!, ahora no me queda otra que matarlo -grita Stark-"
  },
  ataque: {
    text: "Stark saca una pistola y me apunta, yo decido...",
    optionA: "Huir",
    optionB: "Atacar",
    sceneA: "end",
    sceneB: "end",
    messageA: "Stark me persigue y a gritos llama a la policía. Cuando me atrapan me acusa de estar asaltando su casa, ahora debo conseguir un abogado defensor que me ayude con el caso.",
    messageB: "Stark dispara y me da justo en el pulgar, y por eso tengo la mano vendada. Tengo miedo de encontrármelo de nuevo."
  },
  trabajar: {
    text: "En la noche, tomamos el tren a Eyford y llegamos a una casa grande. Stark me lleva a un cuarto y me pide que espere un momento. Una vez sale, al rato, una mujer asustada y temblorosa entra al cuarto y me dice:\n-¡Huya! ¡No sabe lo que le puede suceder! No se quede aquí, no es bueno quedarse aquí.\nYo decido...",
    optionA: "Huir",
    optionB: "Quedarme",
    sceneA: "huir",
    sceneB: "quedarse",
    messageA: "La cara de horror de la mujer me convence de que debo huir. Así que abro la ventana y me asomo para salir.",
    messageB: "Aunque está afectada, no le hago caso a la mujer. Parece loca."
  },
  huir: {
    text: "En esas, aparece Stark junto con otro hombre. Yo, con medio cuerpo asomado por la ventana, decido",
    optionA: "Salir", 
    optionB: "Devolverme",
    sceneA: "end",
    sceneB: "regreso",
    messageA: "Brinco y me agarro del borde de la ventana. Mientras empujo mi cuerpo para salir, Stark y su secuaz cierran la ventana con fuerza, y me hieren la mano. Sin embargo, logro salir.\n Ahora necesito esconderme por un rato, señor Holmes, pero necesito que me ayude a averiguar quiénes son esos hombres.",
    messageB: "—Qué calor hace acá —digo—. A pesar de que la noche está helada.\n Stark me mira con sospecha."
  },
  quedarse: {
    text: "La mujer me insiste, se ve desesperada, me fijo bien y tiene un moretón en el ojo. Ella sale corriendo por la puerta.",
    optionA: "Huir",
    optionB: "Quedarme",
    sceneA: "regreso",
    sceneB: "regreso",
    messageA: "Veo que hay una ventana por la que podría escapar. Me acerco, pero justo llega Stark con otro hombre.",
    messageB: "Me quedo esperando en el cuarto, veo muchas cajas acumuladas, Stark regresa acompañado de otro hombre."
  },
  regreso: {
    text: "—Este es el señor Ferguson, mi secretario y administrador —dice Stark—. Vamos a ver la máquina.\n—Espere me pongo mi sombrero —replico—.\nNo se preocupe, que la máquina está dentro de la casa —constesta—.\nMe parece muy extraño que tengan una máquina para extraer minerales dentro de la casa, pero Stark me explica que solo la usan para comprimir el material. Como no tengo alternativa, los sigo.\n\nLlegamos a un cuartito cuadrado, en el que apenas cabemos Stark y yo.\n—Estamos dentro de la prensa hidráulica, como puede ver —dice él—. Si alguien accionara el mecanismo sería bastante desagradable para nosotros aquí adentro; el techo bajaría y nos aplastaría. ¿Puede revisar qué causa que haya perdido potencia? Lo esperamos afuera.",
    optionA: "Revisar cilindros",
    optionB: "Revisar palancas",
    sceneA: "solucion",
    sceneB: "revision",
    messageA: "Con la lámpara de aceite reviso los cilindros laterales, veo que una de las bandas de caucho que rodea un cabezal está vencida, y eso produce una pequeña fuga de agua.",
    messageB: "Con la lámpara de aceite reviso las palancas de control, parece que por aquí todo está en orden. Aún así, me parece extraño que necesiten una máquina tan potente para comprimir un poco de tierra y que tengan una plancha metálica en el piso."
  },
  solucion: {
    text: "—Señor Stark, veo que al menos un problema es una pequeña fuga de agua —digo—, lo que debe hacer es reemplazar una correa dañada.\nStark parece complacido.\n—¡Gracias! Lo arreglaremos lo más pronto posible. ¿Eso es todo?\nYo decido",
    optionA: "Revisar palancas",
    optionB: "Decir, 'sí, es todo'",
    sceneA: "cuestionamiento",
    sceneB: "pago",
    messageA: "Reviso las palancas de control, parece que por aquí todo está en orden. No obstante, es extraño que utilicen una máquina tan potente para comprimir tierra.",
    messageB: "-Eso es todo -digo-. Si no me necesitan para nada más, le agradezco que me dé la cincuenta guineas y partiré para mi casa."
  },
  revision: {
    text: "—Hasta el momento, todo en orden, Señor Stark -digo-. Déjeme hacer otras revisiones.\nStark asiente con la cabeza.",
    optionA: "Revisar cilindros",
    optionB: "Revisar piso",
    sceneA: "cuestionamiento",
    sceneB: "cuestionamiento",
    messageA: "Con la lámpara de aceite reviso los cilindros laterales, veo que una de las bandas de caucho que rodea un cabezal está vencida, y eso produce una pequeña fuga de agua. Encontré el problema.\nNo obstante, es extraño que utilicen una máquina tan potente para comprimir tierra. Además, el piso es metálico y las paredes del cuarto son de madera, no es una constucción adecuada para minería.",
    messageB: "Reviso el piso, es metálico. Además las paredes del cuarto son de madera, no es una constucción adecuada para extraer materiales, me están ocultando algo.\nMientras estoy agachado noto que hay una gotera. Son los cilintros, tienen una fuga porque una correa está dañada, encontré el problema."
  },
  cuestionamiento: {
    text:"—Además de la correa dañada, la máquina está en buen estado —digo—.\nMe ronda por la cabeza la pregunta acerca de los fines reales de la máquina. Es claro que no la usan para comprimir tierra. Stark y su compinche no parecen de confiar.\n¿Debería preguntarles para qué quieren usar la máquina realmente?",
    optionA: "Preguntar",
    optionB: "Disimular",
    sceneA: "pregunta",
    sceneB: "pago",
    messageA: "—Solo tengo una pregunta, Señor Stark -digo con firmeza, disimulando el miedo-. ¿Por qué necesitan una máquina con tanta fuerza y este piso metálico para una labor tan sencilla como aplanar un poco de tierra?",
    messageB: "-Mi trabajo está cumplido. Le pido amablemente que me dé mi paga y me iré de inmediato."
  },
  pago: {
    text:"—Aquí tiene, cincuenta guineas -dice Stark-.\nMe dispongo a contar los billetes y noto que tienen un color extraño. ¡Son falisificaciones!\n\nEn ese momento todo toma claridad para mí. Stark y su compinche imprimen billetes falsos, como los que intentan usar para pagarme, pero, como la máquina está dañada, solo pueden producir impresiones de mala calidad. \nDecido...",
    optionA: "Enfrentarlos",
    optionB: "Resignarme e irme",
    sceneA: "confrontacion",
    sceneB: "confrontacion",
    messageA: "—No puedo recibir estos billetes, son falsos, y es evidente que los hicieron ustedes mismos con la máquina que me pidieron revisar.",
    messageB: "-Mil gracias por el pago. Ahora me despido.\nStark, me detiene. -No puedo dejar que se vaya -dice-. Sé que usted ya descubrió nuestras intenciones, y no podemos darnos el lujo de dejar cabos sueltos."
  },
  pregunta: {
    text: "Con la pregunta, Stark se pone rojo de ira y me empuja al interior del cuarto. Oigo un chasquido que me hiela la sangre, la máquina empieza a funcionar y el techo comienza a bajar lentamente. Si no hago algo pronto quedaré aplastado.",
    optionA: "Gritar",
    optionB: "Revisar el cuarto",
    sceneA: "inutil",
    sceneB: "puerta",
    messageA: "—Mis gritos son ahogados por las paredes de madera del cuarto.",
    messageB: "-Reviso el cuarto, está rodeado por paredes de madera vieja. Veo que hay una luz a través de una de las láminas, es una puerta de escape."
  },
  inutil: {
    text:"El techo se acerca cada vez más...",
    optionA:"Gritar",
    optionB: "Revisar el cuarto",
    sceneA: "puerta",
    sceneB: "puerta",
    messageA: "—Es una situación desesperada. Grito tan fuerte que alguien llega en mi ayuda y me abre la puerta.",
    messageB: "-Reviso el cuarto, está rodeado por paredes de madera vieja. Veo que hay una luz a través de una de las láminas, es una puerta de escape."
  },
  puerta: {
    text: "Al salir, veo que la mujer que encontré más temprano volvió para ayudarme. Me insiste en que la siga. \n¿Debería confiar?",
    optionA: "Confiar",
    optionB: "Huir",
    sceneA: "escape",
    sceneB: "confrontacion",
    messageA: "Sigo a la mujer, ella me indica una ventana por la puedo escapar.",
    messageB: "Decido, huir. Camino por los pasillos de la casa, pero parece un laberinto. Justo cuando estoy cerca de lo que parece una salida, Stark aparece."
  },
  escape: {
    text: "Mientras me subo a la ventana regresa Stark y agarra a la mujer. Ella me dice que la deje y que escape.",
    optionA: "Ayudarla",
    optionB: "Escapar",
    sceneA: "end",
    sceneB: "end",
    messageA: "No puedo dejarla a su suerte. Así que desde el borde de la ventana me abalanzo sobre, Stark. Él cae al suelo y la mujer logra liberarse. Stark toma un cuchillo y me hiere varias veces. En la mano pero también en el abdomen.\nYa no me queda mucho tiempo, señor Holmes, las heridas que Stark me causó no tienen vuelta atrás, pero le pido invetigue mi historia y que haga justicia.",
    messageB: "Decido escapar. Stark golpea a la mujer y la tira contra el suelo. Luego, intenta agarrarme para que no baje por la ventana. Yo logro colgarme del borde y el avienta el marco de la ventana. Caigo, al suelo, casi ileso, excepto por mi pulgar, que se desprendió por el ventanazo.\nSeñor Holmes, investigue el caso, por favor, estoy seguro que si encuentran mi dedo servirá como prueba para ajusticiar a los criminales."
  },
  confrontacion: {
    text: "Stark toma un hacha y se abalanza contra mí. Tomo un candelabro para defenderme.",
    optionA: "Golpear con candelabro",
    optionB: "Lanzar candelabro",
    sceneA: "end",
    sceneB: "end",
    messageA: "Agito el candelabro con todas mis fuerzas, y Stark hace lo mismo con el hacha. Logro pegarle en la rodilla, pero, en el intento, el hacha me roza la mano y me corta el pulgar. Aprovecho la oportunidad para huir, Stark, herido, no puede seguirme.\nAhora tengo que ocultarme por un tiempo, señor Holmes, pero le pido que me ayude a desenmascarar a estos estafadores.",
    messageB: "Lanzo el candelabro a la cara de Stark. Pero tiene buenos reflejos y logra esquivarlo. Estoy perdido. Stark blande el hacha como un loco para todas partes. Solo atino a cubrirme, me alcanza una mano. Mi pulgar sale volando.\nStark se acerca furioso, pero pisa el pulgar y se resbala. Cae encima del hacha.\n Vengo, señor Holmes, a que me ayude a defender mi caso. No quiero que la policía piense que fue un homicidio."
  },
  end: {
    text: "Has completado la historia... ¿Crees que pudo haber tomado un rumbo diferente? Si quieres, prueba de nuevo."
  },
  credits: {
    text: "Este juego fue hecho por:",
    authors: ["Sergio Rodríguez Gómez"],
    year: 2019
  }
}

// Crea una instancia de Aventura, en español
const aventura = new Aventura('es');
// Pasa las escenas a la librería
aventura.setScenes(escenas);
// Escoge la interfaz
aventura.domAdventure();
//aventura.promptAdventure();