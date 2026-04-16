import terser from '@rollup/plugin-terser';

export default {
  // We will create this file in the next step. It will import all the smaller modules.
  input: 'src/index.js', 
  output: [
    {
      file: 'dist/aventura.js',
      format: 'iife',
      name: 'Aventura', // This exposes the class globally in the browser
    },
    {
      file: 'dist/aventura.min.js',
      format: 'iife',
      name: 'Aventura',
      plugins: [terser()] // Minifies this specific output
    },
    {
      file: 'dist/aventura.esm.js',
      format: 'es', // ES Module format for modern frameworks
    }
  ]
};