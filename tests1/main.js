// 1. Initialize Aventura
const aventura = new Aventura("es", {
  typewriterSpeed: 20, 
  igramaFormat: 'gif', // Change to 'gif' if you want to test MiniGif integration!
  theme: {
    background: 'red',
    text: '#222',
    buttonBorder: 'solid 2px #222',
    borderRadius: '4px'
  }
});

// 2. Load the Igrama JSON using your new utility wrapper
aventura.loadJSON('./igrama.json').then(igramaData => {
  
  // 3. Define a standard text grammar
  const textGrammar = {
    adjective: ["bizarre", "magnificent", "terrifying", "squishy", "geometric"]
  };

  // 4. Define the Interactive Scenes
  const scenes = {
    start: {
      text: "You wander into the digital gallery. There is a blank canvas on the wall, humming with computational energy.",
      options: [
        {
          btn: "Press the red button",
          text: "...calibrating the splines...",
          scene: "generation"
        },
        {
          btn: "Leave",
          scene: "leave"
        }
      ]
    },
    generation: {
      // We mix generative text with the generative image!
      text: "Behold! A truly <adjective> creation.",
      // This key tells the StoryUI to ask the IgramaEngine to draw this rule:
      igrama: "base", 
      scene: "end"
    },
    leave: {
      text: "Art is subjective anyway.",
      deadEnd: true
    },
    end: {
      text: "The machine powers down.",
      deadEnd: true
    }
  };

  // 5. Connect the pieces and start the adventure
  aventura.setGrammar(textGrammar)
          .setIgrama(igramaData)
          .setScenes(scenes)
          .startAdventure('start');
          
}).catch(err => console.error("Test failed:", err));