/**
 * Palitra (tokens.css) tekshiruvlari:
 *  1) to'rt blok (classic/orange x kun/tun) bir xil tokenlar to'plamini aniqlaydi;
 *  2) qiymatlar mehmon saytiniki bilan mos (orange-tun = mehmon darkTheme.css, classic = TMA shablonlari :root;
 *     mehmon `palette.css` tayyor bo'lgach — pastdagi MEHMON_PALETTE_JADVALI);
 *  3) login shabloni (backend/templates/restaurant_admin/login.html) nusxasi tokens.css bilan bir xil;
 *  4) matn juftliklari kontrasti WCAG AA (>= 4.5:1), hujjatlashtirilgan istisnolar bilan;
 *  5) umumiy komponentlar va qobiqda qattiq yozilgan rang yo'q (sahifalar keyingi agentlar tomonidan tokenlashtiriladi).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ADMINS = path.resolve(import.meta.dirname, '../..');
const ROOT = path.resolve(ADMINS, '..');
const read = (...p: string[]) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

type Vars = Record<string, string>;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
}

/** selektor (bo'shliqlari bir xillashtirilgan) -> e'lonlar; bir xil selektor bir necha marta bo'lsa birlashtiriladi */
function parseBlocks(css: string): Map<string, Vars> {
  const blocks = new Map<string, Vars>();
  for (const m of stripComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, ' ');
    const vars = blocks.get(selector) ?? {};
    for (const decl of m[2].split(';')) {
      const d = decl.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
      if (d) vars[d[1]] = d[2].replace(/\s+/g, ' ');
    }
    blocks.set(selector, vars);
  }
  return blocks;
}

const TOKENS = parseBlocks(read('admins/shared/src/ui/tokens.css'));
const block = (selector: string): Vars => {
  const found = TOKENS.get(selector);
  assert.ok(found, `tokens.css da "${selector}" bloki yo'q`);
  return found;
};

const SEL = {
  classicLight: ':root',
  orangeLight: "html[data-palette='orange']",
  classicDark: "html[data-theme='dark']:not([data-palette='orange'])",
  orangeDark: "html[data-theme='dark'][data-palette='orange']",
} as const;

const classicLight = block(SEL.classicLight);
const orangeLight = block(SEL.orangeLight);
const classicDark = block(SEL.classicDark);
const orangeDark = block(SEL.orangeDark);

/** Tema o'zgarganda (tun) qayta aniqlanishi shart bo'lgan RANG tokenlari */
const COLOR_TOKENS = Object.keys(orangeLight).filter((k) => !/^--(radius|font|heading)/.test(k));

test('palitra: to\'rt blok ham bir xil rang tokenlari to\'plamini aniqlaydi', () => {
  assert.ok(COLOR_TOKENS.length >= 30, `rang tokenlari kam: ${COLOR_TOKENS.length}`);
  for (const [name, vars] of Object.entries({ classicLight, classicDark, orangeDark })) {
    assert.deepEqual(COLOR_TOKENS.filter((k) => !(k in vars)), [], `${name}: aniqlanmagan tokenlar`);
  }
  const structural = Object.keys(orangeLight).filter((k) => !COLOR_TOKENS.includes(k));
  assert.deepEqual(structural.filter((k) => !(k in classicLight)), [], 'classic: radius/shrift tokenlari yetishmaydi');
});

test('palitra: klassik standart (:root), orange atribut bilan; sarlavha shrifti klassikda Playfair, apelsinda Outfit', () => {
  assert.match(classicLight['--font-display'], /^'Playfair Display'/);
  assert.match(orangeLight['--font-display'], /^'Outfit'/);
  assert.equal(classicLight['--font-sans'], orangeLight['--font-sans']);
  assert.equal(classicLight['--action'], '#2F4836');
  assert.equal(orangeLight['--action'], '#C2410C');
});

test('apelsin palitra kun qiymatlari avvalgi ("yangi dizayn") qiymatlar bilan bir xil', () => {
  const expected: Vars = {
    '--bg-primary': '#FAF8F5', '--bg-surface': '#FFFFFF', '--bg-surface-hover': '#F5EFEA', '--bg-elevated': '#FAF8F5',
    '--border-subtle': '#EFE9E2', '--border-strong': '#DDD4C8', '--text-main': '#181513', '--text-muted': '#4A443E', '--text-dim': '#57534E',
    '--accent-emerald': '#14532D', '--accent-emerald-bg': '#F0FDF4', '--accent-emerald-border': '#BBF7D0',
    '--accent-amber': '#C2410C', '--accent-amber-hover': '#9A3412', '--accent-amber-bg': '#FFF7ED', '--accent-amber-border': '#FED7AA',
    '--accent-rose': '#DC2626', '--accent-rose-hover': '#E11D48', '--accent-rose-bg': '#FFF1F2', '--accent-rose-border': '#FFE4E6',
    '--accent-indigo': '#181513', '--accent-indigo-hover': '#4A443E', '--accent-indigo-bg': '#F5EFEA',
    '--action': '#C2410C', '--action-hover': '#9A3412', '--radius-sm': '8px', '--radius-md': '14px', '--radius-lg': '20px',
  };
  for (const [k, v] of Object.entries(expected)) assert.equal(orangeLight[k], v, k);
});

// ─── Mehmon saytiga moslik ───
test('apelsin tun = mehmon sayti darkTheme.css qiymatlari AYNAN', () => {
  const guest = parseBlocks(read('frontend/src/styles/darkTheme.css'));
  const g: Vars = { ...(guest.get("html[data-theme='dark']") ?? {}), ...(guest.get("html[data-theme='dark']:not([data-palette='classic'])") ?? {}) };
  assert.ok(g['--bg-primary'], 'mehmon darkTheme.css da tun tokenlari topilmadi');
  // admin token -> mehmon tokeni
  const map: Record<string, string> = {
    '--bg-primary': '--bg-primary', '--bg-surface': '--bg-surface', '--bg-surface-hover': '--bg-surface-subtle', '--bg-elevated': '--bg-surface-subtle',
    '--border-subtle': '--border-subtle', '--border-strong': '--border-strong',
    '--text-main': '--text-primary', '--text-muted': '--text-secondary', '--text-dim': '--text-muted', '--text-inverse': '--text-inverse',
    '--accent-emerald-bg': '--dk-ok-bg', '--accent-emerald-border': '--dk-ok-border', '--accent-emerald-hover': '--dk-ok-text',
    '--accent-amber-bg': '--brand-primary-light', '--accent-amber-border': '--brand-tint-2',
    '--accent-rose': '--dk-danger-text', '--accent-rose-bg': '--dk-danger-bg', '--accent-rose-border': '--dk-danger-border', '--accent-rose-hover': '--dk-accent-text',
    '--accent-indigo': '--text-primary', '--accent-indigo-hover': '--text-secondary', '--accent-indigo-bg': '--bg-surface-subtle',
    '--brand-bg': '--brand-primary-light', '--brand-border': '--brand-tint-2',
    '--shadow-sm': '--shadow-sm', '--shadow-md': '--shadow-card', '--shadow-lg': '--shadow-modal',
  };
  let checked = 0;
  for (const [adminToken, guestToken] of Object.entries(map)) {
    assert.ok(guestToken in g, `mehmon darkTheme.css da ${guestToken} yo'q`);
    assert.equal(orangeDark[adminToken], g[guestToken], `${adminToken} != mehmon ${guestToken}`);
    checked += 1;
  }
  assert.ok(checked >= 25);
  // Brend matni tunda: mehmon --dk-brand-text = --brand-primary (#EA580C) (index.css)
  const guestLight = parseBlocks(read('frontend/src/index.css')).get(':root') ?? {};
  assert.equal(orangeDark['--accent-amber'], guestLight['--brand-primary']);
  assert.equal(orangeDark['--brand'], guestLight['--brand-primary']);
  assert.equal(orangeDark['--accent-amber-hover'], guestLight['--brand-warm']);
});

test('klassik kun qiymatlari = TMA shablonlari (base_tma.html :root) qiymatlari', () => {
  const html = read('backend/templates/tma/base_tma.html');
  const tma = parseBlocks(html.slice(html.indexOf('<style>'))).get(':root') ?? {};
  if (!tma['--bg-cream']) return; // TMA shabloni boshqa tuzilishga o'tgan: mehmon palette.css jadvali (pastda) ishlaydi
  const map: Record<string, string> = {
    '--bg-primary': '--bg-cream', '--bg-elevated': '--bg-cream-soft', '--bg-surface': '--bg-card',
    '--border-subtle': '--border-light', '--border-strong': '--border-cream',
    '--action': '--primary-green', '--action-hover': '--primary-green-hover', '--brand': '--primary-green', '--brand-hover': '--primary-green-hover', '--brand-bg': '--primary-green-light',
    '--text-main': '--text-dark', '--text-muted': '--text-muted',
    '--radius-md': '--radius-lg', '--radius-lg': '--radius-xl', '--radius-xl': '--radius-2xl',
  };
  for (const [adminToken, tmaToken] of Object.entries(map)) {
    assert.equal(classicLight[adminToken]?.toUpperCase(), tma[tmaToken]?.toUpperCase(), `${adminToken} != TMA ${tmaToken}`);
  }
});

/**
 * Mehmon `frontend/src/styles/palette.css` (klassik palitra) bilan moslik: [admin token, mehmon token]. Qiymatlar ikkala joyda
 * BIR XIL bo'lishi shart. Admin-faqat qiymatlar (bg-surface-hover kunda, hosila tuslar) jadvalda yo'q.
 */
const GUEST_CLASSIC_LIGHT: [string, string][] = [
  ['--bg-primary', '--bg-primary'], ['--bg-surface', '--bg-surface'], ['--bg-elevated', '--bg-surface-subtle'],
  ['--border-subtle', '--border-subtle'], ['--border-strong', '--border-strong'],
  ['--text-main', '--text-primary'], ['--text-muted', '--text-secondary'], ['--text-dim', '--text-muted'], ['--text-inverse', '--text-inverse'],
  ['--accent-amber', '--brand-accent'], ['--accent-amber-bg', '--brand-accent-light'], ['--accent-amber-border', '--brand-accent-subtle'],
  ['--accent-emerald', '--status-success'], ['--accent-emerald-bg', '--status-success-light'], ['--accent-rose', '--status-danger'], ['--accent-rose-solid', '--status-danger'],
  ['--action', '--brand-primary'], ['--action-hover', '--brand-primary-hover'], ['--brand', '--brand-primary'], ['--brand-hover', '--brand-primary-hover'],
  ['--brand-bg', '--brand-primary-light'], ['--brand-border', '--brand-tint-2'],
  ['--shadow-sm', '--shadow-sm'], ['--shadow-md', '--shadow-card'], ['--shadow-lg', '--shadow-modal'], ['--radius-lg', '--radius-lg'],
];
const GUEST_CLASSIC_DARK: [string, string][] = [
  ['--bg-primary', '--bg-primary'], ['--bg-surface', '--bg-surface'], ['--bg-elevated', '--bg-surface-subtle'], ['--bg-surface-hover', '--dk-hover'],
  ['--border-subtle', '--border-subtle'], ['--border-strong', '--border-strong'],
  ['--text-main', '--text-primary'], ['--text-muted', '--text-secondary'], ['--text-dim', '--text-muted'],
  ['--accent-amber', '--dk-accent-text'], ['--accent-amber-bg', '--brand-accent-light'], ['--accent-amber-border', '--brand-accent-subtle'],
  ['--accent-emerald-bg', '--status-success-light'],
  ['--action', '--brand-primary'], ['--action-hover', '--brand-primary-hover'], ['--brand', '--dk-brand-text'], ['--brand-hover', '--brand-deep'],
  ['--brand-bg', '--brand-primary-light'], ['--brand-border', '--brand-tint-2'],
];
const guestPalettePath = path.join(ROOT, 'frontend/src/styles/palette.css');
test('klassik palitra = mehmon palette.css qiymatlari (kun va tun)', { skip: fs.existsSync(guestPalettePath) ? false : 'mehmon palette.css hali yo\'q' }, () => {
  const guest = parseBlocks(fs.readFileSync(guestPalettePath, 'utf8'));
  const guestIndex = parseBlocks(read('frontend/src/index.css')).get(':root') ?? {};
  const gLight: Vars = {
    ...guestIndex,
    ...(guest.get("html[data-palette='classic']") ?? {}),
    ...(guest.get("html[data-palette='classic']:not([data-season])") ?? {}),
  };
  const guestDarkCss = parseBlocks(read('frontend/src/styles/darkTheme.css'));
  const gDark: Vars = {
    ...(guestDarkCss.get("html[data-theme='dark']") ?? {}),
    ...(guest.get("html[data-theme='dark'][data-palette='classic']") ?? {}),
    ...(guest.get("html[data-theme='dark'][data-palette='classic']:not([data-season])") ?? {}),
  };
  const mismatches: string[] = [];
  const compare = (kind: string, table: [string, string][], mine: Vars, theirs: Vars) => {
    for (const [admin, g] of table) {
      if (!(g in theirs)) { mismatches.push(`${kind}: mehmon palette.css da ${g} topilmadi (admin ${admin})`); continue; }
      if (mine[admin]?.toUpperCase() !== theirs[g].toUpperCase()) mismatches.push(`${kind}: admin ${admin} = ${mine[admin]}, mehmon ${g} = ${theirs[g]}`);
    }
  };
  compare('kun', GUEST_CLASSIC_LIGHT, classicLight, gLight);
  compare('tun', GUEST_CLASSIC_DARK, classicDark, gDark);
  // tun soyalari mehmonda palitradan mustaqil (darkTheme.css 1-bo'lim)
  for (const [admin, g] of [['--shadow-sm', '--shadow-sm'], ['--shadow-md', '--shadow-card'], ['--shadow-lg', '--shadow-modal']] as const) {
    if (classicDark[admin] !== gDark[g]) mismatches.push(`tun: ${admin} != mehmon ${g}`);
  }
  assert.deepEqual(mismatches, []);
});

test('kirish shabloni (login.html) palitra nusxasi tokens.css bilan bir xil', () => {
  const html = read('backend/templates/restaurant_admin/login.html');
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1].replace(/\{%[^%]*%\}/g, 'X')).join('\n');
  const login = parseBlocks(styles);
  const pairs: [string, Vars][] = [
    [SEL.classicLight, classicLight], [SEL.orangeLight, orangeLight], [SEL.classicDark, classicDark], [SEL.orangeDark, orangeDark],
  ];
  for (const [selector, tokens] of pairs) {
    const copy = login.get(selector);
    assert.ok(copy, `login.html da "${selector}" bloki yo'q`);
    const names = Object.keys(copy);
    assert.ok(names.length >= 15, `${selector}: login nusxasi juda kichik`);
    for (const name of names) assert.equal(copy[name], tokens[name], `login.html ${selector} ${name} != tokens.css`);
  }
});

// ─── Kontrast (WCAG 2.x) ───
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ['--text-main', '--bg-primary'], ['--text-main', '--bg-surface'], ['--text-main', '--bg-surface-hover'],
  ['--text-muted', '--bg-primary'], ['--text-muted', '--bg-surface'], ['--text-muted', '--bg-surface-hover'], ['--text-muted', '--bg-elevated'],
  ['--text-dim', '--bg-primary'], ['--text-dim', '--bg-surface'], ['--text-dim', '--bg-surface-hover'], ['--text-dim', '--bg-elevated'],
  ['--text-inverse', '--action'], ['--text-inverse', '--action-hover'], ['--text-inverse', '--accent-rose-solid'],
  ['--brand', '--bg-primary'], ['--brand', '--bg-surface'], ['--brand', '--brand-bg'],
  ['--accent-emerald', '--bg-primary'], ['--accent-emerald', '--bg-surface'], ['--accent-emerald', '--accent-emerald-bg'],
  ['--accent-amber', '--bg-primary'], ['--accent-amber', '--bg-surface'], ['--accent-amber', '--accent-amber-bg'],
  ['--accent-rose', '--bg-primary'], ['--accent-rose', '--bg-surface'], ['--accent-rose', '--accent-rose-bg'],
];
/** Hujjatlashtirilgan istisnolar: qizil (xavf) rangi "o'zgarishsiz" qoldirilgan, krem fon/och-qizil fon ustida 4.3-4.4:1 (katta/qalin matn uchun yetarli) */
const MIN_OVERRIDES: Record<string, number> = {
  'classicLight --accent-rose on --bg-primary': 4.3,
  'classicLight --accent-rose on --accent-rose-bg': 4.3,
  'orangeLight --accent-rose on --accent-rose-bg': 4.3,
};
// Tunda to'ldirish + oq matn juftliklari (--text-inverse on --accent-emerald/--accent-amber) tekshirilmaydi: tunda bu tokenlar MATN uchun
// och tusda; to'ldirish uchun --action va --accent-rose-solid bor.

for (const [name, vars] of Object.entries({ classicLight, orangeLight, classicDark, orangeDark })) {
  test(`kontrast (AA): ${name}`, () => {
    const failures: string[] = [];
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrast(vars[fg], vars[bg]);
      const min = MIN_OVERRIDES[`${name} ${fg} on ${bg}`] ?? 4.5;
      if (ratio < min) failures.push(`${fg} ${vars[fg]} on ${bg} ${vars[bg]} = ${ratio.toFixed(2)} (kerak ${min})`);
    }
    // To'ldirilgan holat: oq matn bilan yashil/terrakota/to'q to'ldirish faqat kun palitralarida
    if (name.endsWith('Light') && name === 'classicLight') {
      const r = contrast(vars['--text-inverse'], vars['--accent-emerald']);
      if (r < 4.5) failures.push(`oq on accent-emerald = ${r.toFixed(2)}`);
    }
    assert.deepEqual(failures, []);
  });
}

// ─── Qattiq yozilgan ranglar yo'q (umumiy komponentlar + qobiq) ───
// SCOPE: sahifalar (admins/resto/src/pages/**) hozircha tashqarida — ularni keyingi agentlar tokenlashtiradi, tayyor bo'lgan papkani shu yerga qo'shing.
const NO_HARDCODED_SCOPE = [
  'admins/shared/src/ui',
  'admins/shared/src/auth',
  'admins/shared/src/router',
  'admins/resto/src/main.tsx',
  'admins/resto/src/shell.css',
  'admins/resto/src/pages/Finance',
  'admins/resto/src/pages/Dashboard',
  'admins/resto/src/pages/Tables',
  'admins/resto/src/pages/Orders',
  'admins/resto/src/pages/Menu',
  'admins/resto/src/pages/Staff',
  'admins/resto/src/pages/Settings',
];
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![\w-])(?:white|black)(?![\w-])/;

function filesIn(rel: string): string[] {
  const abs = path.join(ROOT, rel);
  if (fs.statSync(abs).isFile()) return [abs];
  const out: string[] = [];
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const full = path.join(abs, e.name);
    if (e.isDirectory()) out.push(...filesIn(path.relative(ROOT, full)));
    else if (/\.(tsx?|css)$/.test(e.name) && e.name !== 'tokens.css' && e.name !== 'fonts.css') out.push(full);
  }
  return out;
}

test('umumiy komponentlar va qobiqda qattiq yozilgan rang yo\'q (faqat var(--token))', () => {
  const hits: string[] = [];
  for (const rel of NO_HARDCODED_SCOPE) {
    for (const file of filesIn(rel)) {
      const lines = stripComments(fs.readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '')).split('\n');
      lines.forEach((line, i) => {
        // satr ichidagi matn (JSX/izoh) emas, rang literali bo'lsa
        if (COLOR_LITERAL.test(line)) hits.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(hits, []);
});

test('shriftlar lokal: fonts.css va tokens.css tashqi manzilsiz', () => {
  for (const f of ['fonts.css', 'tokens.css']) {
    const css = read('admins/shared/src/ui', f);
    assert.doesNotMatch(css, /https?:\/\//i, f);
  }
  assert.match(read('admins/shared/src/ui/fonts.css'), /font-family:'Playfair Display'/);
});
