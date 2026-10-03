import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        interactions: fileURLToPath(new URL('./src/interactions.ts', import.meta.url)),
        writer: fileURLToPath(new URL('./src/writer.tsx', import.meta.url)),
        page: fileURLToPath(new URL('./src/page.ts', import.meta.url)),
        'latex-editor': fileURLToPath(new URL('./src/LatexBlockEditor.tsx', import.meta.url)),
        'code-editor': fileURLToPath(new URL('./src/CodeMirrorEditor.tsx', import.meta.url)),
      },
      formats: ['es'],
      cssFileName: 'writer',
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: (id) => id.startsWith('@milkdown/') || id.startsWith('@codemirror/') || id.startsWith('@lezer/') || id === 'katex' || id === 'react' || id === 'react/jsx-runtime' || id === 'react-dom',
    },
  },
});
