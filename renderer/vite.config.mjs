import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rendererDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rendererDir,
  base: './',
  plugins: [vue()],
  build: {
    outDir: path.resolve(rendererDir, 'dist'),
    emptyOutDir: true
  }
});
