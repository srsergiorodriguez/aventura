export async function loadJSON(path) {
  const response = await fetch(path);
  return await response.json();
}

export function saveJSON(obj, filename) {
  // Ensure this only runs in a browser environment
  if (typeof window === 'undefined') return; 
  
  const a = document.createElement("a");
  const file = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  a.href = URL.createObjectURL(file);
  a.download = filename.endsWith('.json') ? filename : filename + '.json';
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export function getRandomPick(arr) {
  // Fallback if no valid probabilities
  if (!arr.prob || !Array.isArray(arr.prob) || arr.prob.length !== arr.length) {
    const index = Math.floor(Math.random() * arr.length);
    return { element: arr[index], index };
  }

  const totalWeight = arr.prob.reduce((sum, weight) => sum + weight, 0);
  const randomThreshold = Math.random() * totalWeight;

  let weightAccumulator = 0;
  for (let i = 0; i < arr.length; i++) {
    weightAccumulator += arr.prob[i];
    if (randomThreshold <= weightAccumulator) {
      return { element: arr[i], index: i };
    }
  }

  return { element: arr[arr.length - 1], index: arr.length - 1 };
}

export function applyTransforms(text, transforms) {
  let result = text;
  
  for (const t of transforms) {
    if (t === 'ALLCAPS') {
      result = result.toUpperCase();
    } else if (t === 'CAPITALIZE') {
      // Capitalizes the first letter of the string
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
  }
  
  return result;
}