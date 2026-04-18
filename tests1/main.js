const aventura = new Aventura("en", {
  typewriterSpeed: 15,
  adventureScroll: false, // Clean "page-turn" style for dashboards
  evalTags: true,         // Allows <br> tags in text
  vizWidth: 600,
  vizHeight: 400,
  vizImageSize: 60,
  igramaFormat: 'png', 
  theme: {
    background: '#1a1a1a',
    text: '#eeeeee',
    buttonBg: '#2a2a2a',
    buttonHoverBg: '#444444',
    buttonBorder: 'solid 1px #555',
    borderRadius: '6px',
    containerBorder: 'solid 1px #333'
  }
});

// ---------------------------------------------------------
// 2. DUMMY DATA SETUP
// ---------------------------------------------------------

// A. Text Grammar
const textGrammar = {
  animal: ["cyber-fox", "digital squirrel", "liminal capybara"],
  adjective: ["glitched", "magnificent", "recursive"]
};

// B. Igrama Grammar (A minimal, valid vector drawing)
const dummyIgrama = {
  metadata: { width: 300, height: 300, bg: "#1a1a1a" },
  grammar: {
    base: ["vector%%#00ffcc&4&50,50,250,250**#ff0055&4&250,50,50,250**#eeeeee&2&150,50,150,250%%"]
  }
};

// C. Mnemosyne Archive Data (Using placeholder image URLs)
const archiveData = [
  { ID: "A", IMGURL: "a.png", CONT: "The red artifact.", Year: 1980, Category: "Organic" },
  { ID: "B", IMGURL: "b.png", CONT: "The cyan artifact.", Year: 1995, Category: "Synthetic" },
  { ID: "C", IMGURL: "c.png", CONT: "The yellow artifact.", Year: 1990, Category: "Organic" },
  { ID: "D", IMGURL: "d.png", CONT: "The purple artifact.", Year: 2010, Category: "Synthetic" },
  { ID: "E", IMGURL: "e.png", CONT: "The blue artifact.", Year: 2020, Category: "Organic" }
];

// ---------------------------------------------------------
// 3. THE SCENES (The Orchestrator)
// ---------------------------------------------------------
const scenes = {
  // --- HUB ---
  start: {
    text: "Welcome to the **Aventura V3** Master Test Suite.<br>All systems are online. Choose a module to test:",
    options: [
      { btn: "Test Grammar & SVG Areas", scene: "test_story" },
      { btn: "Test Igrama Engine", scene: "test_igrama" },
      { btn: "Test Data Engine (Scatter)", scene: "test_scatter" },
      { btn: "Test Data Engine (Pack)", scene: "test_pack" }
    ]
  },

  // --- STORY & SVG AREAS TEST ---
  test_story: {
    text: "You encounter a <adjective> <animal>.<br>Click its left or right side to continue.",
    // A placeholder image that we will overlay with invisible SVG hitboxes
    image: "a.png",
    areas: [
      { x: 150, y: 100, w: 300, h: 200, btn: "LEFT", scene: "test_success" },
      { x: 450, y: 100, w: 300, h: 200, btn: "RIGHT", scene: "test_success" }
    ],
    options: [{ btn: "Back to Hub", scene: "start" }]
  },

  test_success: {
    text: "The <animal> nods in approval. SVG Click Areas are working!",
    options: [{ btn: "Back to Hub", scene: "start" }]
  },

  // --- IGRAMA TEST ---
  test_igrama: {
    text: "Generative Canvas rendering online.<br>Behold the mathematical splines!",
    igrama: "base", // Calls the dummyIgrama we defined above
    options: [
      { 
        btn: "Generate Another", 
        text: "Recalculating vectors...", 
        scene: "test_igrama" // Dynamic intermediate scene testing!
      },
      { btn: "Back to Hub", scene: "start" }
    ]
  },

  // --- DATA ENGINE TESTS ---
  test_scatter: {
    text: "Live D3 Physics Simulation: Year vs ID.",
    viz: {
      type: "scatter",
      filter: [],
      x: "Year",
      y: "ID"
    },
    options: [{ btn: "Back to Hub", scene: "start" }]
  },

  test_pack: {
    text: "Live D3 Hierarchical Packing: Grouped by Category.",
    viz: {
      type: "pack",
      filter: [],
      x: "Category",
      y: "Year"
    },
    options: [{ btn: "Back to Hub", scene: "start" }]
  }
};

// ---------------------------------------------------------
// 4. IGNITION
// ---------------------------------------------------------
try {
  aventura.setGrammar(textGrammar)
          .setIgrama(dummyIgrama)
          .setDataScenes(scenes, archiveData, ["Year", "Category"]) // Injects scenes & metadata
          .startAdventure('start');
  
  console.log("Aventura V3 Test Suite Booted Successfully.");
} catch (error) {
  console.error("Boot Failure:", error);
}