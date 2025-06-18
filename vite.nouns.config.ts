import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: 'dist/nouns',
    emptyOutDir: true,
    assetsDir: '.',
    assetsInlineLimit: 4096000,
    rollupOptions: {
      input: {
        nouns: path.resolve(__dirname, 'AINounsAgent.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'nouns.css'
          }
          return '[name][extname]'
        },
      },
    },
  },
})
