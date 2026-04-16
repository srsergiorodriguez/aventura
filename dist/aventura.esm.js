class Aventura {
  constructor(lang = 'en', options = {}) {
    this.lang = (lang === 'en' || lang === 'es') ? lang : 'en';
    this.options = options;
    
    // Bilingual wrappers (we will expand this later)
    this.fijarGramatica = this.setGrammar;
  }

  setGrammar(grammar) {
    console.log("Grammar set:", grammar);
  }
}

export { Aventura };
