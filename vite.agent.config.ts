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
    outDir: 'dist/agent',
    emptyOutDir: true,
    assetsDir: '.',
    assetsInlineLimit: 4096000,
    rollupOptions: {
      input: {
        agent: path.resolve(__dirname, 'AIAgent.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'agent.css'
          }
          return '[name][extname]'
        },
      },
    },
  },
})
