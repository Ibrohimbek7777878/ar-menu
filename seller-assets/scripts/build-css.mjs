// Tailwind CSS (3.4.17) ni oldindan quradi: ../backend/static/seller/seller.css va finance_pdf.css.
// Ishga tushirish: `npm run build:css`. Natija git'ga commit qilinadi (CI/production'da npm kerak emas).
//
// Nega `tailwindcss --minify` emas: uning minifikatori (cssnano `colormin`) `rgb(249 247 242 / 0.9)` kabi yarim shaffof
// ranglarni 8 xonali hex'ga (#f9f7f2e6) aylantirib, alfani 1/255 qadamga yaxlitlaydi -> sidebar/header rangi
// 1 daraja o'zgardi (CDN bilan piksel farqi). Shuning uchun cssnano shu yerda `colormin`siz ishlatiladi.
// Avtoprefikslar (-webkit-backdrop-filter va h.k.) CDN bundle'dagidek qo'shiladi (browserslist: package.json).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root) // tailwind config ichidagi `content` yo'llari seller-assets/ ga nisbatan
const outDir = path.resolve(root, '..', 'backend', 'static', 'seller')
fs.mkdirSync(outDir, { recursive: true })

const input = fs.readFileSync(path.join(root, 'src', 'seller.input.css'), 'utf8')
const targets = [
  { config: 'tailwind.config.js', out: 'seller.css' },        // base.html merosxo'rlari (seller/admin/customer/courier...)
  { config: 'tailwind.pdf.config.js', out: 'finance_pdf.css' }, // seller/finance_pdf.html (standart tema)
]
const minify = !process.argv.includes('--no-minify')

for (const { config, out } of targets) {
  const cfgPath = path.join(root, config)
  const plugins = [tailwindcss(require(cfgPath)), autoprefixer()]
  if (minify) plugins.push(cssnano({ preset: ['default', { colormin: false }] }))
  const result = await postcss(plugins).process(input, { from: path.join(root, 'src', 'seller.input.css'), to: path.join(outDir, out) })
  fs.writeFileSync(path.join(outDir, out), result.css)
  console.log(`${out}: ${result.css.length} bayt`)
}
