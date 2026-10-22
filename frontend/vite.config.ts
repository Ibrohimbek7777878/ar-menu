import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Django uchun build (BUILD_TO_DJANGO=1): fayllar /static/react/ ostida beriladi, nomlari hash'li (kontent o'zgarsa
// nom o'zgaradi — eski keshga tushmaydi), `.vite/manifest.json` Django shablonlariga kerakli nomlarni aytadi
// ({% react_css %} / {% react_js %}). Sahifalar alohida bo'laklarga bo'lingan (React.lazy) — preload yo'llari to'g'ri
// chiqishi uchun base ham /static/react/.
const toDjango = Boolean(process.env.BUILD_TO_DJANGO)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: toDjango ? '/static/react/' : '/',
  build: {
    outDir: toDjango ? path.resolve(import.meta.dirname, '../backend/static/react') : 'dist',
    emptyOutDir: true,
    manifest: true,
    // CSS bitta fayl, eski tartibda (src/styles/cssOrder.ts) — sinf nomlari to'qnashadigan joylarda ko'rinish o'zgarmasin
    cssCodeSplit: false,
  },
})
