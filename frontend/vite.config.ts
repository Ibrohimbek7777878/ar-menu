import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: process.env.VERCEL ? 'dist' : path.resolve(import.meta.dirname, '../backend/static/react'),
    emptyOutDir: true,
    rollupOptions: process.env.VERCEL
      ? {}
      : {
          output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name].[ext]',
          },
        },
  },
})
