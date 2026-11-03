import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_THEME_PREF, THEME_CHROME, THEME_STORAGE_KEY, parseThemePref, resolveTheme } from '../src/theme/core.ts';
// Mehmon saytidagi mantiq: ikkalasi bir kalitda va bir xil qoida bilan ishlashi kerak
import { parseThemePref as guestParse, resolveTheme as guestResolve } from '../../../frontend/src/utils/guestTheme.ts';

test('mavzu: tanlov + tizim mavzusi -> amaldagi mavzu', () => {
  assert.equal(resolveTheme('day', true), 'light');
  assert.equal(resolveTheme('night', false), 'dark');
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
});

test('mavzu: noma\'lum qiymat -> null, standart "Kun"', () => {
  assert.equal(parseThemePref('night'), 'night');
  assert.equal(parseThemePref('off'), null);
  assert.equal(parseThemePref(undefined), null);
  assert.equal(parseThemePref(7), null);
  assert.equal(DEFAULT_THEME_PREF, 'day');
});

test('mehmon sayti bilan bir xil: kalit va qoidalar', () => {
  assert.equal(THEME_STORAGE_KEY, 'guliston.theme');
  for (const pref of ['day', 'night', 'auto', 'off', '', null, undefined, 3, {}]) {
    assert.equal(parseThemePref(pref), guestParse(pref), `parse ${String(pref)}`);
  }
  for (const pref of ['day', 'night', 'auto'] as const) {
    for (const dark of [true, false]) assert.equal(resolveTheme(pref, dark), guestResolve(pref, dark), `${pref} ${dark}`);
  }
  assert.equal(THEME_CHROME.light, '#FFFFFF');
  assert.equal(THEME_CHROME.dark, '#1B1714');
});

// ─── Brauzer qismi (soxta document/localStorage/matchMedia bilan) ───
interface Env {
  attrs: Record<string, string>;
  meta: { content: string };
  store: Map<string, string>;
  systemDark: { value: boolean };
  fireSystemChange: () => void;
}

function installEnv(options: { storageThrows?: boolean } = {}): Env {
  const attrs: Record<string, string> = {};
  const meta = { content: '', setAttribute(k: string, v: string) { if (k === 'content') this.content = v; } };
  const store = new Map<string, string>();
  const systemDark = { value: false };
  let changeListener: (() => void) | null = null;
  const g = globalThis as Record<string, unknown>;
  g.document = {
    documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } },
    querySelector: (sel: string) => (sel === 'meta[name="theme-color"]' ? meta : null),
  };
  g.localStorage = options.storageThrows
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
  g.window = {
    matchMedia: () => ({
      get matches() { return systemDark.value; },
      addEventListener: (_: string, cb: () => void) => { changeListener = cb; },
    }),
  };
  return { attrs, meta, store, systemDark, fireSystemChange: () => changeListener?.() };
}

test('initTheme: saqlangan tanlovdan data-theme va theme-color qo\'yiladi', async () => {
  const env = installEnv();
  env.store.set(THEME_STORAGE_KEY, 'night');
  const theme = await import('../src/theme/theme.ts?t=1');
  assert.equal(theme.initTheme(), 'dark');
  assert.equal(env.attrs['data-theme'], 'dark');
  assert.equal(env.meta.content, THEME_CHROME.dark);
  assert.equal(theme.getThemePref(), 'night');
});

test('setThemePref: eslab qoladi, Avto tizim o\'zgarishiga ergashadi, buzuq qiymat -> Kun', async () => {
  const env = installEnv();
  const theme = await import('../src/theme/theme.ts?t=2'); // yangi modul nusxasi: "started" holati toza
  let calls = 0;
  const off = theme.subscribeTheme(() => { calls += 1; });

  env.store.set(THEME_STORAGE_KEY, 'garbage');
  assert.equal(theme.initTheme(), 'light');
  assert.equal(theme.getThemePref(), 'day');

  env.systemDark.value = true;
  theme.setThemePref('auto');
  assert.equal(env.store.get(THEME_STORAGE_KEY), 'auto');
  assert.equal(env.attrs['data-theme'], 'dark');

  env.systemDark.value = false;
  env.fireSystemChange(); // telefon mavzusi o'zgardi
  assert.equal(env.attrs['data-theme'], 'light');

  theme.setThemePref('day');
  env.systemDark.value = true;
  env.fireSystemChange(); // "Kun" tanlangan: tizim o'zgarishi ta'sir qilmaydi
  assert.equal(env.attrs['data-theme'], 'light');
  assert.ok(calls >= 4);
  off();
});

test('localStorage yopiq (maxfiy rejim): xato bermaydi, ish davom etadi', async () => {
  const env = installEnv({ storageThrows: true });
  const theme = await import('../src/theme/theme.ts?t=3');
  assert.equal(theme.initTheme(), 'light');
  assert.doesNotThrow(() => theme.setThemePref('night'));
  assert.equal(env.attrs['data-theme'], 'dark');
});
