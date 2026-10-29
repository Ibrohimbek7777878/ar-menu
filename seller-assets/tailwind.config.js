/**
 * Tailwind CSS 3.4.17 sozlamasi — klassik Seller/Admin paneli (base.html merosxo'rlari) uchun.
 *
 * `theme` / `darkMode` bloki backend/templates/base.html ichidagi (oldin brauzerda JIT ishlagan)
 * `tailwind.config = {...}` dan AYNAN ko'chirilgan. Ko'rinish o'zgarmasligi uchun shuni qo'lda o'zgartirmang:
 * dizayn tokenlari o'zgarsa, ikkala joyni (base.html dagi `cdn` zaxira yo'li va shu fayl) birga yangilang.
 *
 * Qurish: `npm run build` (README.md ga qarang). Natija: ../backend/static/seller/seller.css (git'ga commit qilinadi).
 */
module.exports = {
  darkMode: 'class',
  // base.html dan meros oladigan (yoki unga include qilinadigan) shablonlar + Python tomondan beriladigan sinflar
  content: [
    '../backend/templates/base.html',
    '../backend/templates/403.html',
    '../backend/templates/base_map.html',
    '../backend/templates/{seller,admin,customer,courier,payments,components}/**/*.html',
    // Seller shablonlaridan statik faylga chiqarilgan JS (dinamik yig'iladigan sinflar shu yerda bo'lishi mumkin)
    '../backend/static/seller/**/*.js',
    // Python'dan shablonga uzatiladigan sinflar (finance/views.py: badge_bg, header_bg; payments/views.py: bg_gradient va h.k.)
    '../backend/**/*.py',
    '!../backend/venv/**',
    '!../backend/staticfiles/**',
    '!../backend/**/migrations/**',
    '!../backend/**/test*.py',
    '!../backend/**/tests/**',
  ],
  // Brauzerda dinamik yig'iladigan / bazadan keladigan sinflar uchun (kod skanerlanganda ko'rinmaydi)
  safelist: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        primary: { DEFAULT: '#16a34a', dark: '#15803d', foreground: '#ffffff' },
        brand: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
          800: '#166534', 900: '#14532d',
        },
        ink: '#241E1A',
        background: '#F6F3EE',
        foreground: '#241E1A',
        muted: '#756A5E',
        card: '#FEFBF6',
        border: '#E2D9CC',
        sand: '#EFE9DF',
        accent: '#dcfce7',
        accentOrange: '#f97316',
      },
      screens: {
        '3xl': '1920px',
        '4k': '2560px',
      },
      borderRadius: { xl: '1rem', '2xl': '1.5rem', '3xl': '2rem' },
      boxShadow: {
        soft: '0 2px 14px rgba(60, 45, 30, .06)',
        lift: '0 12px 32px rgba(60, 45, 30, .09)',
      },
    },
  },
}
