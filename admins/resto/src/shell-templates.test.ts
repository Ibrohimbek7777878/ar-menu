/**
 * Server shablonlari (resto.html — /ra/ qobig'i, restaurant_admin/login.html — kirish): kun/tun va til mexanizmi.
 *  - birinchi kadr skripti ilova mantiqi (shared/src/theme/core.ts) bilan bir xil natija beradi;
 *  - palitra atributi serverdan (`{% gulistan_palette %}`);
 *  - kirish sahifasida har bir matn 3 tilda; server xabarlari (view, login_guard) tarjimali.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { resolveTheme, THEME_CHROME, THEME_STORAGE_KEY } from '../../shared/src/theme/core.ts';
import { LANG_STORAGE_KEY } from '../../shared/src/i18n/engine.ts';

const BACKEND = path.resolve(import.meta.dirname, '../../../backend');
const readTemplate = (rel: string) => fs.readFileSync(path.join(BACKEND, 'templates', rel), 'utf8');

const RESTO = readTemplate('admins/resto.html');
const LOGIN = readTemplate('restaurant_admin/login.html');

/** Birinchi (head ichidagi, src'siz) inline skript matni */
function headScript(html: string): string {
  const m = html.match(/<script>\s*([\s\S]*?)<\/script>/);
  assert.ok(m, 'inline skript topilmadi');
  return m[1];
}

function runHeadScript(html: string, opts: { theme?: string | null; lang?: string | null; systemDark: boolean }) {
  const attrs: Record<string, string> = {};
  const meta = { content: '#FFFFFF', setAttribute(k: string, v: string) { if (k === 'content') this.content = v; } };
  const store: Record<string, string> = {};
  if (opts.theme) store[THEME_STORAGE_KEY] = opts.theme;
  if (opts.lang) store[LANG_STORAGE_KEY] = opts.lang;
  const sandbox = {
    localStorage: { getItem: (k: string) => store[k] ?? null },
    window: { matchMedia: () => ({ matches: opts.systemDark }) },
    document: {
      documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } },
      querySelector: (sel: string) => (sel === 'meta[name="theme-color"]' ? meta : null),
    },
  };
  vm.runInNewContext(headScript(html), sandbox);
  return { attrs, meta };
}

for (const [name, html] of [['resto.html', RESTO], ['login.html', LOGIN]] as const) {
  test(`${name}: birinchi kadr skripti ilova mantiqi bilan bir xil (kun/tun/avto x tizim mavzusi)`, () => {
    for (const theme of ['day', 'night', 'auto', 'garbage', null]) {
      for (const systemDark of [false, true]) {
        const pref = theme === 'night' || theme === 'auto' || theme === 'day' ? theme : 'day';
        const expected = resolveTheme(pref, systemDark);
        const { attrs, meta } = runHeadScript(html, { theme, systemDark });
        assert.equal(attrs['data-theme'], expected, `${String(theme)} / tizim ${systemDark ? 'tun' : 'kun'}`);
        assert.equal(meta.content, THEME_CHROME[expected]);
      }
    }
  });

  test(`${name}: saqlangan til <html lang> ga qo'yiladi, buzuq qiymat e'tiborsiz`, () => {
    assert.equal(runHeadScript(html, { lang: 'ru', systemDark: false }).attrs.lang, 'ru');
    assert.equal(runHeadScript(html, { lang: 'en', systemDark: false }).attrs.lang, 'en');
    assert.equal(runHeadScript(html, { lang: 'de', systemDark: false }).attrs.lang, undefined);
    assert.equal(runHeadScript(html, { lang: null, systemDark: false }).attrs.lang, undefined);
  });

  test(`${name}: palitra serverdan (data-palette) va json_tags yuklangan`, () => {
    assert.match(html, /<html[^>]*data-palette="\{% gulistan_palette %\}"/);
    assert.match(html, /\{% load [^%]*json_tags[^%]*%\}/);
  });

  test(`${name}: localStorage yopiq bo'lsa skript yiqilmaydi`, () => {
    const sandbox = {
      localStorage: { getItem() { throw new Error('blocked'); } },
      window: { matchMedia: () => { throw new Error('no'); } },
      document: { documentElement: { setAttribute() {} }, querySelector: () => null },
    };
    assert.doesNotThrow(() => vm.runInNewContext(headScript(html), sandbox));
  });
}

test('resto.html: tashqi manzilsiz, qattiq rangli sinf yo\'q', () => {
  assert.doesNotMatch(RESTO, /bg-\[#|text-slate/);
});

// ─── Kirish sahifasi ───
test('login.html: forma maydonlari va CSRF o\'zgarmagan (web testlari va e2e shularga tayanadi)', () => {
  assert.match(LOGIN, /name="username"/);
  assert.match(LOGIN, /name="password"/);
  assert.match(LOGIN, /\{% csrf_token %\}/);
  assert.match(LOGIN, /name="next"/);
  assert.match(LOGIN, /<button type="submit"/);
  assert.equal((LOGIN.match(/type="submit"/g) ?? []).length, 1, 'yagona submit tugmasi (e2e: button[type="submit"])');
  assert.match(LOGIN, /action="\{% url 'restaurant_admin_login' %\}"/);
});

test('login.html: har bir interfeys matni uz / ru / en da bor', () => {
  const keys = new Set([...LOGIN.matchAll(/data-i18n(?:-ph|-title|-aria)?="(\w+)"/g)].map((m) => m[1]));
  assert.ok(keys.size >= 9, `kalitlar kam: ${keys.size}`);
  const textBlock = LOGIN.slice(LOGIN.indexOf('var TEXT = {'), LOGIN.indexOf('var MESSAGES'));
  for (const key of keys) {
    const entry = textBlock.match(new RegExp(`\\b${key}:\\s*\\{([^}]*)\\}`));
    assert.ok(entry, `TEXT.${key} yo'q`);
    for (const lang of ['uz', 'ru', 'en']) assert.match(entry[1], new RegExp(`\\b${lang}:\\s*"[^"]+"`), `TEXT.${key}.${lang} yo'q`);
    assert.match(entry[1], /ru:\s*"[^"]*[Ѐ-ӿ]/, `TEXT.${key}.ru kirillcha emas`);
  }
});

test('login.html: serverning barcha foydalanuvchi xabarlari 3 tilda (view + login_guard)', () => {
  const view = fs.readFileSync(path.join(BACKEND, 'web/tma_views.py'), 'utf8');
  const start = view.indexOf('def restaurant_admin_login');
  const end = view.indexOf('def restaurant_admin_logout');
  const logout = view.slice(end, view.indexOf('\n\n\n', end));
  const body = view.slice(start, end) + logout;
  const literals = [...body.matchAll(/messages\.(?:error|warning|info|success)\(\s*request,\s*(["'])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2].replace(/\\'/g, "'"));
  const guard = fs.readFileSync(path.join(BACKEND, 'backend/login_guard.py'), 'utf8');
  const lock = guard.match(/LOCK_MESSAGE\s*=\s*"([^"]+)"/);
  assert.ok(lock, 'LOCK_MESSAGE topilmadi');
  literals.push(lock[1]);
  assert.ok(literals.length >= 4, `xabarlar topilmadi: ${literals.length}`);
  const from = LOGIN.indexOf('var MESSAGES');
  const block = LOGIN.slice(from, LOGIN.indexOf('var root =', from));
  for (const text of literals) {
    const key = text.replace(/"/g, '\\"');
    const at = block.indexOf(`"${key}"`);
    assert.ok(at >= 0, `login.html MESSAGES da tarjimasi yo'q: ${text}`);
    const entry = block.slice(at, block.indexOf('}', at));
    assert.match(entry, /ru:\s*"[^"]*[Ѐ-ӿ]/);
    assert.match(entry, /en:\s*"[^"]+"/);
  }
});
