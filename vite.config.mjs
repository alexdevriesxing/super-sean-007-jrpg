import { defineConfig } from 'vite';

export default defineConfig({
  root: 'super_sean_007_full_project_wired',
  base: './',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/build/[name]-[hash].js',
        chunkFileNames: 'assets/build/[name]-[hash].js',
        assetFileNames: 'assets/build/[name]-[hash][extname]'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
});
