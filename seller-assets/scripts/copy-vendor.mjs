// Tashqi (CDN) aktivlarni node_modules dan ../backend/static/vendor/ ga ko'chiradi va fonts.css ni yaratadi.
// Ishga tushirish: `npm run build:vendor`. Natija git'ga commit qilinadi (CI/production'da npm kerak emas).
//
// Shriftlar oldin Google Fonts'dan quyidagicha yuklangan edi (base.html, `SELLER_ASSETS=cdn` yo'lida hamon shunday):
//   Fraunces:opsz,wght@9..144,400;600;700  +  Inter:wght@400;500;600  +  Material Icons / Material Icons Outlined
// Ko'rinish pikselgacha bir xil qolishi uchun: (1) fayllar bayt-bayt Google bilan bir xil (@fontsource-variable va
// `material-icons` npm paketlari Google'ning o'sha fayllarini tarqatadi), (2) @font-face e'lonlari Google CSS'idagidek —
// aynan o'sha og'irliklar (400/500/600 va 400/600/700) va unicode-range'lar. Shuning uchun 700/800 og'irlikdagi Inter matni
// avvalgidek 600 yuzida chiziladi (haqiqiy 700 kerak bo'lsa — fonts.css dagi Inter og'irliklarini 100 900 oralig'iga o'zgartiring).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const nm = path.join(root, 'node_modules')
const staticDir = path.resolve(root, '..', 'backend', 'static')
const alpineOut = path.join(staticDir, 'vendor', 'alpine')
const fontsOut = path.join(staticDir, 'vendor', 'fonts')

const pkgVersion = (name) => JSON.parse(fs.readFileSync(path.join(nm, name, 'package.json'), 'utf8')).version
fs.mkdirSync(alpineOut, { recursive: true })
fs.mkdirSync(fontsOut, { recursive: true })

// 1) Alpine.js (CDN'dagi `alpinejs@3.x.x/dist/cdn.min.js` bilan bayt-bayt bir xil)
const alpineVer = pkgVersion('alpinejs')
fs.copyFileSync(path.join(nm, 'alpinejs', 'dist', 'cdn.min.js'), path.join(alpineOut, `alpine-${alpineVer}.min.js`))

// 2) Shrift fayllari (faqat ishlatiladigan subsetlar: latin, latin-ext, cyrillic, cyrillic-ext; Fraunces'da kirill yo'q)
const copies = [
  ['@fontsource-variable/inter', 'files/inter-latin-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'files/inter-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'files/inter-cyrillic-wght-normal.woff2'],
  ['@fontsource-variable/inter', 'files/inter-cyrillic-ext-wght-normal.woff2'],
  ['@fontsource-variable/fraunces', 'files/fraunces-latin-opsz-normal.woff2'],
  ['@fontsource-variable/fraunces', 'files/fraunces-latin-ext-opsz-normal.woff2'],
  ['material-icons', 'iconfont/material-icons.woff2'],
  ['material-icons', 'iconfont/material-icons-outlined.woff2'],
]
for (const [pkg, rel] of copies) fs.copyFileSync(path.join(nm, pkg, rel), path.join(fontsOut, path.basename(rel)))
fs.copyFileSync(path.join(nm, '@fontsource-variable/inter', 'LICENSE'), path.join(fontsOut, 'LICENSE-inter-OFL.txt'))
fs.copyFileSync(path.join(nm, '@fontsource-variable/fraunces', 'LICENSE'), path.join(fontsOut, 'LICENSE-fraunces-OFL.txt'))
fs.copyFileSync(path.join(nm, 'material-icons', 'LICENSE'), path.join(fontsOut, 'LICENSE-material-icons-Apache2.txt'))

// 3) fonts.css — e'lonlar Google Fonts CSS'idan (unicode-range'lar ham) olingan
const R = {
  'cyrillic-ext': 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
}
const face = (family, weight, file, range, display = 'swap') =>
  `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:${display};src:url(${file}) format('woff2')${range ? `;unicode-range:${range}` : ''}}`
let css = `/* Lokal shriftlar (Google Fonts / Material Icons CDN o'rniga). scripts/copy-vendor.mjs yaratadi — qo'lda tahrirlamang. */\n`
css += `/* Inter ${pkgVersion('@fontsource-variable/inter')}: matn shrifti. Og'irliklar Google CSS'idagidek 400/500/600 (bitta o'zgaruvchan fayl). font-display: swap */\n`
for (const sub of ['cyrillic-ext', 'cyrillic', 'latin-ext', 'latin'])
  for (const w of [400, 500, 600]) css += face('Inter', w, `inter-${sub}-wght-normal.woff2`, R[sub]) + '\n'
css += `/* Fraunces ${pkgVersion('@fontsource-variable/fraunces')}: sarlavha shrifti (opsz+wght o'qlari). Og'irliklar 400/600/700. font-display: swap */\n`
for (const sub of ['latin-ext', 'latin'])
  for (const w of [400, 600, 700]) css += face('Fraunces', w, `fraunces-${sub}-opsz-normal.woff2`, R[sub]) + '\n'
css += `/* Material Icons ${pkgVersion('material-icons')}: IKONKA shriftlari uchun font-display: block (swap bo'lsa yuklanguncha ligatura matni — "shopping_cart" — ko'rinib qolardi) */\n`
css += face('Material Icons', 400, 'material-icons.woff2', '', 'block') + '\n'
css += face('Material Icons Outlined', 400, 'material-icons-outlined.woff2', '', 'block') + '\n'
const iconClass = (cls, fam) =>
  `.${cls}{font-family:'${fam}';font-weight:normal;font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:'liga';-webkit-font-smoothing:antialiased}`
css += iconClass('material-icons', 'Material Icons') + '\n' + iconClass('material-icons-outlined', 'Material Icons Outlined') + '\n'
fs.writeFileSync(path.join(fontsOut, 'fonts.css'), css)
console.log(`vendor tayyor: alpine ${alpineVer}, fonts.css (${css.length} bayt)`)
