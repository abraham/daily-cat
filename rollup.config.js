import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  input: resolve(__dirname, 'src/index.ts'),
  output: {
    file: 'public/index.js',
    format: 'umd',
    name: 'DailyCat',
  },
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
    }),
    copy({
      targets: [
        { src: 'assets/*', dest: 'public' }
      ]
    })
  ],
};
