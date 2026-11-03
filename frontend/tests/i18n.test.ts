import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { LANGS, langFromTag, parseEnabledLangs, pluralIndex, translate } from '../src/i18n/core.ts';
import { parseThemePref, parseThemeSetting, resolveTheme } from '../src/utils/guestTheme.ts';

const SRC = path.resolve(import.meta.dirname, '../src');

test('translate: kalit topilmasa o\'zbekcha matn qaytadi, qiymatlar o\'rniga qo\'yiladi', () => {
  assert.equal(translate('ru', {}, 'Savat'), 'Savat');
  assert.equal(translate('ru', { 'Salom, {name}': 'Привет, {name}' }, 'Salom, {name}', { name: 'Ali' }), 'Привет, Ali');
  assert.equal(translate('uz', {}, 'Savatda {n} ta', { n: 3 }), 'Savatda 3 ta');
  assert.equal(translate('ru', {}, 'Kerakli {x}', { n: 1 }), 'Kerakli {x}');
});

test('ko\'plik: rus 1/2-4/5+ (11-14 istisno), ingliz 1/boshqa, o\'zbek doim bitta shakl', () => {
  const forms = { k: '{n} блюдо|{n} блюда|{n} блюд' };
  const pick = (n: number) => translate('ru', forms, 'k', { n });
  assert.equal(pick(1), '1 блюдо');
  assert.equal(pick(2), '2 блюда');
  assert.equal(pick(4), '4 блюда');
  assert.equal(pick(5), '5 блюд');
  assert.equal(pick(11), '11 блюд');
  assert.equal(pick(12), '12 блюд');
  assert.equal(pick(21), '21 блюдо');
  assert.equal(pick(22), '22 блюда');
  assert.equal(pick(111), '111 блюд');
  assert.equal(pluralIndex('en', 1), 0);
  assert.equal(pluralIndex('en', 0), 1);
  assert.equal(pluralIndex('en', 2), 1);
  assert.equal(pluralIndex('uz', 7), 0);
  assert.equal(translate('en', { k: '{n} dish|{n} dishes' }, 'k', { n: 2 }), '2 dishes');
});

test('til kodlari: server ro\'yxati, Telegram/brauzer teglari', () => {
  assert.deepEqual(parseEnabledLangs('uz,ru'), ['uz', 'ru']);
  assert.deepEqual(parseEnabledLangs(' RU , ru , xx '), ['ru']);
  assert.deepEqual(parseEnabledLangs(undefined), [...LANGS]);
  assert.deepEqual(parseEnabledLangs('xx'), [...LANGS]);
  assert.equal(langFromTag('ru-RU'), 'ru');
  assert.equal(langFromTag('uz_Latn'), 'uz');
  assert.equal(langFromTag('en'), 'en');
  assert.equal(langFromTag('de'), null);
  assert.equal(langFromTag(undefined), null);
});

test('mavzu: sozlama, tanlov va tizim mavzusidan amaldagi mavzu', () => {
  assert.equal(parseThemeSetting('night'), 'night');
  assert.equal(parseThemeSetting('xx'), 'day');
  assert.equal(parseThemeSetting(undefined), 'day');
  assert.equal(parseThemePref('auto'), 'auto');
  assert.equal(parseThemePref('off'), null);
  assert.equal(resolveTheme('day', true), 'light');
  assert.equal(resolveTheme('night', false), 'dark');
  assert.equal(resolveTheme('auto', true), 'dark');
  assert.equal(resolveTheme('auto', false), 'light');
});

// ─── Tarjima to'liqligi: kodda ishlatilgan har bir kalitning ru va en tarjimasi bor ───
// Xodim panellari (KDS, moliya, ofitsiant, hostess, admin) hozircha qamrovda emas.
const STAFF = /[\\/](KDSPage|FinancePage|WaiterPanelPage|HostessDeskPage|AdminDashboardPage|QRGeneratorModal|PhotogrammetryStudioModal|StaffNavHeader|showcase)[\\/]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name.name) && !/\.d\.ts$/.test(name.name)) out.push(full);
  }
  return out;
}

const CALL = /(?<![\w.$])(?:t|tr)\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const TEMPLATE_CALL = /(?<![\w.$])(?:t|tr)\(\s*`/;

function unescape(raw: string): string {
  return raw.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');
}

function usedKeys(): { key: string; file: string }[] {
  const keys: { key: string; file: string }[] = [];
  for (const file of walk(SRC)) {
    if (STAFF.test(file) || file.includes(`${path.sep}i18n${path.sep}`)) continue;
    const text = fs.readFileSync(file, 'utf8');
    assert.ok(!TEMPLATE_CALL.test(text), `${path.relative(SRC, file)}: t(\`...\`) mumkin emas — literal ('...') yozing, qiymat uchun {n} ishlating`);
    for (const m of text.matchAll(CALL)) keys.push({ key: unescape(m[2]), file: path.relative(SRC, file) });
  }
  return keys;
}

async function loadDict(lang: 'ru' | 'en'): Promise<Record<string, string>> {
  const dir = path.join(SRC, 'i18n', lang);
  const merged: Record<string, string> = {};
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
    const mod = await import(path.join(dir, name));
    for (const [k, v] of Object.entries(mod.default as Record<string, string>)) {
      // Bir xil matn ikki faylda uchrashi mumkin (umumiy so'zlar), lekin tarjimalar bir xil bo'lishi shart
      assert.ok(!(k in merged) || merged[k] === v, `${lang}/${name}: "${k}" kaliti boshqa faylda boshqacha tarjima qilingan`);
      merged[k] = v;
    }
  }
  return merged;
}

for (const lang of ['ru', 'en'] as const) {
  test(`tarjima to'liqligi: ${lang}`, async () => {
    const dict = await loadDict(lang);
    const missing = usedKeys().filter(({ key }) => !(key in dict) || !dict[key].trim());
    assert.deepEqual(
      missing.map((m) => `${m.file}: ${m.key}`).slice(0, 25),
      [],
      `${lang} tarjimasi yo'q kalitlar: ${missing.length} ta (birinchi 25 tasi yuqorida)`,
    );
  });
}

test('tarjima lug\'atlari: qiymat joylari ({n}) va ko\'plik shakllari o\'zbekcha kalit bilan mos', async () => {
  for (const lang of ['ru', 'en'] as const) {
    const dict = await loadDict(lang);
    for (const [key, value] of Object.entries(dict)) {
      const need = [...key.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      const have = [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      for (const name of need) assert.ok(have.includes(name), `${lang}: "${key}" tarjimasida {${name}} yo'q`);
      assert.ok(!/\{\w+\}/.test(value) || need.length > 0, `${lang}: "${key}" kalitida yo'q qiymat joyi tarjimada bor`);
    }
  }
});

import { categoryName, dishDescription, dishName, localizeMeasure } from '../src/utils/dishText.ts';

test('taom nomi/tavsifi: tarjima bo\'lsa shu, bo\'sh bo\'lsa o\'zbekcha', () => {
  const dish = { name: 'Palov', name_ru: 'Плов', description: 'Mazali', desc_en: 'Tasty' };
  assert.equal(dishName(dish, 'uz'), 'Palov');
  assert.equal(dishName(dish, 'ru'), 'Плов');
  assert.equal(dishName(dish, 'en'), 'Palov'); // name_en yo'q -> o'zbekcha
  assert.equal(dishDescription(dish, 'ru'), 'Mazali');
  assert.equal(dishDescription(dish, 'en'), 'Tasty');
  assert.equal(dishName({ name: 'Somsa', name_ru: '   ' }, 'ru'), 'Somsa');
  assert.equal(categoryName({ name: 'Salatlar', name_en: 'Salads' }, 'en'), 'Salads');
  assert.equal(dishDescription({}, 'ru'), '');
});

test('o\'lchov matni: birlik so\'zi tilga o\'giriladi, raqam o\'zgarmaydi', () => {
  assert.equal(localizeMeasure('620 kkal', 'ru'), '620 ккал');
  assert.equal(localizeMeasure('~15 daq', 'en'), '~15 min');
  assert.equal(localizeMeasure('350 g', 'ru'), '350 г');
  assert.equal(localizeMeasure('350 g', 'uz'), '350 g');
  assert.equal(localizeMeasure(undefined, 'ru'), '');
  assert.equal(localizeMeasure('1,5 kg', 'ru'), '1,5 кг');
});
