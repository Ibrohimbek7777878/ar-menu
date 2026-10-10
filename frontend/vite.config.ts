import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: process.env.BUILD_TO_DJANGO
      ? path.resolve(import.meta.dirname, '../backend/static/react')
      : 'dist',
    emptyOutDir: true,
    rollupOptions: process.env.BUILD_TO_DJANGO
      ? {
          output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name].[ext]',
          },
        }
      : {},
  },
})
