export function buildMarkovModel(text, ngram = 1, separator = " ") {
  // Clean the text
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