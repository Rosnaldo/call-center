
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src'],
  format: ['cjs', 'esm'],
  dts: true, // gera arquivos .d.ts
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  watch: false
});
