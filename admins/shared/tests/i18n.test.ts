import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LANGS, isLang, pluralIndex, translate } from '../src/i18n/core.ts';
import { translate as guestTranslate, pluralIndex as guestPluralIndex } from '../../../frontend/src/i18n/core.ts';
import { UZ_MONTHS } from '../src/format/date.ts';
import { commonUzSource } from '../src/i18n/uz.ts';
import ruDict from '../src/i18n/ru.ts';
import enDict from '../src/i18n/en.ts';

const SRC = path.resolve(import.meta.dirname, '../src');

test('translate: kalit topilmasa o\'zbekcha matn qaytadi, qiymatlar o\'rniga qo\'yiladi', () => {
  assert.equal(translate('ru', {}, 'Saqlash'), 'Saqlash');
  assert.equal(translate('ru', { 'Salom, {name}': 'Привет, {name}' }, 'Salom, {name}', { name: 'Ali' }), 'Привет, Ali');
  assert.equal(translate('uz', {}, '{n} ta', { n: 3 }), '3 ta');
  assert.equal(translate('ru', {}, 'Kerakli {x}', { n: 1 }), 'Kerakli {x}');
});

test('translate: Object.prototype kalitlari lug\'at deb o\'qilmaydi', () => {
  assert.equal(translate('ru', {}, 'constructor'), 'constructor');
  assert.equal(translate('ru', {}, 'toString'), 'toString');
});

test('ko\'plik: rus 1/2-4/5+ (11-14 istisno), ingliz 1/boshqa, o\'zbek doim bitta shakl', () => {
  const forms = { k: '{n} блюдо|{n} блюда|{n} блюд' };
  const pick = (n: number) => translate('ru', forms, 'k', { n });
  assert.deepEqual([1, 2, 4, 5, 11, 12, 21, 22, 111].map(pick), ['1 блюдо', '2 блюда', '4 блюда', '5 блюд', '11 блюд', '12 блюд', '21 блюдо', '22 блюда', '111 блюд']);
  assert.equal(translate('en', { k: '{n} dish|{n} dishes' }, 'k', { n: 2 }), '2 dishes');
});

test('mehmon ilovasi bilan bir xil: translate va pluralIndex natijalari teng', () => {
  const dict = { a: 'A {n}', b: '{n} x|{n} y|{n} z', c: 'Salom {name}' };
  for (const lang of LANGS) {
    for (const n of [0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 21, 22, 25, 100, 101, 111, -1]) {
      assert.equal(pluralIndex(lang, n), guestPluralIndex(lang, n), `${lang} ${n}`);
      assert.equal(translate(lang, dict, 'b', { n }), guestTranslate(lang, dict, 'b', { n }), `b ${lang} ${n}`);
    }
    assert.equal(translate(lang, dict, 'c', { name: 'Ali' }), guestTranslate(lang, dict, 'c', { name: 'Ali' }));
    assert.equal(translate(lang, dict, 'yo\'q'), guestTranslate(lang, dict, 'yo\'q'));
  }
  assert.ok(isLang('ru') && !isLang('de'));
});

// ─── engine (soxta document/localStorage bilan) ───
test('engine: ro\'yxatdan o\'tgan lug\'at, setLang, saqlash, <html lang>, uz ga qaytish', async () => {
  const attrs: Record<string, string> = {};
  const store = new Map<string, string>();
  const g = globalThis as Record<string, unknown>;
  g.document = { documentElement: Object.defineProperty({}, 'lang', { get: () => attrs.lang, set: (v: string) => { attrs.lang = v; } }) };
  g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
  const engine = await import('../src/i18n/engine.ts');

  engine.registerDictionaries({
    ru: async () => ({ default: { 'Test matni': 'Тестовый текст', '{n} ta': '{n} шт' } }),
  });
  store.set('guliston.lang', 'ru');
  assert.equal(await engine.initLang(), 'ru');
  assert.equal(attrs.lang, 'ru');
  assert.equal(engine.t('Test matni'), 'Тестовый текст');
  assert.equal(engine.t('Saqlash'), 'Сохранить', 'shared lug\'ati o\'zi ulangan');
  assert.equal(engine.t('{n} ta', { n: 4 }), '4 шт');
  assert.equal(engine.t('Lug\'atda yo\'q'), 'Lug\'atda yo\'q');

  let notified = 0;
  const off = engine.subscribe(() => { notified += 1; });
  await engine.setLang('en'); // en manbasi yo'q (faqat shared) -> shared inglizcha, qolgani o'zbekcha
  assert.equal(engine.getLang(), 'en');
  assert.equal(store.get('guliston.lang'), 'en');
  assert.equal(engine.t('Saqlash'), 'Save');
  assert.equal(engine.t('Test matni'), 'Test matni');
  assert.equal(notified, 1);

  await engine.setLang('uz');
  assert.equal(engine.t('Saqlash'), 'Saqlash');
  assert.equal(attrs.lang, 'uz');
  await engine.setLang('uz'); // o'zgarmadi: xabar yuborilmaydi
  assert.equal(notified, 2);
  off();
});

test('engine: buzuq saqlangan til -> o\'zbekcha', async () => {
  const store = new Map<string, string>([['guliston.lang', 'de']]);
  (globalThis as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem() {} };
  const engine = await import('../src/i18n/engine.ts');
  assert.equal(await engine.initLang(), 'uz');
});

test('translated(): matn barglari tarjima, qolgani o\'zi; identifikatsiya barqaror; massiv va ichma-ich ishlaydi', async () => {
  const engine = await import('../src/i18n/engine.ts');
  const { translated } = await import('../src/i18n/translated.ts');
  engine.registerDictionaries({
    ru: async () => ({ default: { Saqlash: 'Сохранить', Yopish: 'Закрыть', 'Bitta': 'Один', 'Ikki': 'Два' } }),
  });
  const fn = () => 'Saqlash';
  const source = { a: 'Saqlash', n: 5, nested: { b: 'Yopish', list: ['Bitta', 'Ikki'], deeper: { c: 'Saqlash' } }, fn, nul: null, rec: { 'uz,ru': 'Saqlash' } as Record<string, string> };
  const proxy = translated(source);

  await engine.setLang('uz');
  assert.equal(proxy.a, 'Saqlash');
  await engine.setLang('ru');
  assert.equal(proxy.a, 'Сохранить');
  assert.equal(proxy.n, 5);
  assert.equal(proxy.nul, null);
  assert.equal(proxy.nested.b, 'Закрыть');
  assert.equal(proxy.nested.deeper.c, 'Сохранить');
  assert.deepEqual(proxy.nested.list.map((x) => x), ['Один', 'Два']);
  assert.equal(proxy.nested.list.length, 2);
  assert.ok(Array.isArray(proxy.nested.list));
  assert.equal(proxy.nested.list.join('+'), 'Один+Два');
  assert.equal(proxy.rec['uz,ru'], 'Сохранить');
  assert.equal(proxy.fn, fn, 'funksiya o\'zgarishsiz');
  assert.equal(proxy.nested, proxy.nested, 'bir xil proksi (React deps)');
  assert.deepEqual(Object.entries(proxy.nested.deeper), [['c', 'Сохранить']]);
  assert.equal(JSON.stringify(proxy.nested.list), '["Один","Два"]');
  assert.ok('a' in proxy && Object.prototype.hasOwnProperty.call(proxy, 'nested'));
  assert.equal(source.a, 'Saqlash', 'asl obyekt o\'zgarmaydi');
  await engine.setLang('uz');
  assert.equal(proxy.nested.list[0], 'Bitta');
});

// ─── shared lug'atlari to'liqligi ───
function leaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => leaves(v, out));
  return out;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

const CALL = /(?<![\w.$])(?:t|tr)\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const unescape = (raw: string) => raw.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

function sharedKeys(): { key: string; file: string }[] {
  const keys: { key: string; file: string }[] = [];
  for (const file of walk(SRC)) {
    // engine/core o'zida t('...') namunalari izohlarda bor; lug'at fayllari esa kalit manbasi
    if (/[\\/]i18n[\\/](engine|core|translated|ru|en)\.ts$/.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!/(?<![\w.$])(?:t|tr)\(\s*`/.test(text), `${path.relative(SRC, file)}: t(\`...\`) mumkin emas — literal yozing`);
    for (const m of text.matchAll(CALL)) keys.push({ key: unescape(m[2]), file: path.relative(SRC, file) });
  }
  return keys;
}

const CYRILLIC = /[\u0400-\u04FF]/;
for (const [lang, dict] of [['ru', ruDict], ['en', enDict]] as const) {
  test(`shared tarjimalari to'liq: ${lang}`, () => {
    const needed = new Set<string>([...leaves(commonUzSource), ...UZ_MONTHS, ...sharedKeys().map((k) => k.key)]);
    const missing = [...needed].filter((k) => !(k in dict) || !dict[k].trim());
    assert.deepEqual(missing, [], `${lang}: tarjimasiz kalitlar`);
    for (const [key, value] of Object.entries(dict)) {
      const need = [...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      const have = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      assert.deepEqual(have, need, `${lang}: "${key}" tarjimasida qiymat joylari mos emas`);
      const hasWords = /\p{L}/u.test(value.replace(/\{\w+\}/g, ''));
      if (lang === 'ru') assert.ok(!hasWords || CYRILLIC.test(value), `ru: "${key}" tarjimasi kirillcha emas`);
      else assert.ok(!CYRILLIC.test(value), `en: "${key}" tarjimasida kirill harf bor`);
    }
  });
}
