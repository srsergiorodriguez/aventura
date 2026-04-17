import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.js', 
  output: [
    {
      file: 'dist/aventura.js',
      format: 'iife',
      name: 'Aventura',
      exports: 'default'
    },
    {
      file: 'dist/aventura.min.js',
      format: 'iife',
      name: 'Aventura',
      exports: 'default',
      plugins: [terser()]
    },
    {
      file: 'dist/aventura.esm.js',
      format: 'es',
    }
  ]
};