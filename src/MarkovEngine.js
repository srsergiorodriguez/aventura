/**
 * MarkovEngine
 * Handles the generation, storage, and traversal of n-gram Markov Chains 
 * for procedural text generation.
 */
export default class MarkovEngine {
  constructor() {
    this.markov = {};
    this.markovSeparator = " ";
  }

  /**
   * Fetches a text file and builds a new Markov model.
   * @param {string} filename - The URL path to the source text file.
   * @param {number} ngram - The n-gram depth for the chain (default: 1).
   * @param {Function} saveJSONCallback - Optional callback to save the generated model.
   */
  async buildModel(filename, ngram = 1, saveJSONCallback = null) {
    const response = await fetch(filename);
    const text = await response.text();
    const model = this._buildMarkovModel(text, ngram, this.markovSeparator);
    
    if (saveJSONCallback) {
      const filenameParts = filename.split('/');
      const cleanName = filenameParts[filenameParts.length - 1].split('.')[0];
      saveJSONCallback(model, `${cleanName}_markovModel_${ngram}N.json`);
    }
    
    return model;
  }

  /**
   * Internal parser that calculates token frequencies and normalizes probabilities.
   */
  _buildMarkovModel(text, ngram = 1, separator = " ") {
    // Clean and normalize the source text
    let cleanedText = text.replace(/([,:.;])/g, " $1").replace(/[()\¿¡!?”“—-]/g, "").toLowerCase();
    
    const words = cleanedText.split(separator);
    const fragments = {};

    // Build the frequency map
    for (let i = 0; i < words.length - ngram; i++) {
      let f = "";
      for (let j = 0; j < ngram; j++) {
        f += j === 0 ? words[i + j] : " " + words[i + j];
      }

      if (fragments[f] === undefined) { fragments[f] = {} }
      const nextWord = words[i + ngram];

      if (fragments[f][nextWord] === undefined) {
        fragments[f][nextWord] = 1;
      } else {
        fragments[f][nextWord]++;
      }
    }

    // Calculate normalized probabilities
    const mProbs = {};
    for (let f of Object.keys(fragments)) {
      const keys = Object.keys(fragments[f]);
      mProbs[f] = { probs: [], grams: keys };

      let sum = 0;
      for (let i = 0; i < keys.length; i++) {
        sum += fragments[f][keys[i]];
      }
      for (let i = 0; i < keys.length; i++) {
        mProbs[f].probs[i] = fragments[f][keys[i]] / sum;
      }
    }

    return mProbs;
  }

  /**
   * Loads a pre-compiled JSON Markov model into the engine.
   */
  setModel(model) {
    this.markov = model;
    return this;
  }

  /**
   * Generates a console-based ASCII bar chart mapping the distribution 
   * of probabilities within the currently loaded model.
   */
  testDistribution() {
    if (!this.markov || Object.keys(this.markov).length === 0) {
      console.error("No Markov model loaded to test.");
      return this;
    }

    const distributions = {};
    const values = Object.values(this.markov);

    for (const v of values) {
      for (const p of v.probs) {
        const aprox = (Math.round(p / 0.05) * 0.05).toFixed(2);
        if (distributions[aprox] === undefined) distributions[aprox] = 1;
        else distributions[aprox]++;
      }
    }

    console.log("------------------------------------ DIST ------------------------------------");
    const max = Math.max(...Object.values(distributions));
    const sorted = Object.entries(distributions).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));
    
    for (const [aprox, count] of sorted) {
      const bar = "|".repeat(Math.ceil((count * 100) / max));
      console.log(`${aprox}... ${bar}`);
    }
    console.log("------------------------------------ DIST ------------------------------------");

    return this;
  }

  /**
   * Traverses the Markov model to generate a procedural text chain.
   * @param {number} chainLength - The total number of words to generate.
   * @param {string} seed - The starting n-gram.
   * @param {number} newLineProbability - Chance (0-1) to inject a line break after a period.
   */
  generateChain(chainLength, seed, newLineProbability = 0.1) {
    if (!this.markov || Object.keys(this.markov).length === 0) return "";

    let result = (seed === undefined || this.markov[seed] === undefined) ? this._randomMarkovWord() : seed;
    let currentGram = result;
  
    for (let chain = 0; chain < chainLength - 1; chain++) {
      let nextWord = this._getNextMarkov(this.markov[currentGram]);
      
      if (nextWord === undefined) {
        // Fallback: Pick a random node if the chain hits a dead end
        nextWord = this._getNextMarkov(this.markov[this._randomMarkovWord()]);
      }
      
      let tempList = currentGram.split(this.markovSeparator);
      tempList.push(nextWord);
      tempList = tempList.slice(1).join(this.markovSeparator);
      currentGram = tempList;
      
      result += `${this.markovSeparator}${nextWord}`;
    }
  
    return this._formatMarkov(result, newLineProbability);
  }

  _randomMarkovWord() {
    const keys = Object.keys(this.markov);
    const choice = Math.floor(Math.random() * keys.length);
    return keys[choice];
  }

  _getNextMarkov(data) {
    if (data === undefined) return undefined;
    const rnd = Math.random();
    let count = 0;
    for (let i = 0; i < data.probs.length; i++) {
      if (count <= rnd && rnd < count + data.probs[i]) {
        return data.grams[i];
      }
      count += data.probs[i];
    }
    return data.grams[data.grams.length - 1]; 
  }

  _formatMarkov(str, newLineProbability) {
    let formatted = str.replace(/ ([,:.;])/g, "$1");
    formatted = formatted.replaceAll(/([.]) ([\wáéíóú])/ig, (match, c1, c2) => {
      if (Math.random() < newLineProbability) return `.\n${c2.toUpperCase()}`;
      return `. ${c2.toUpperCase()}`;
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
}