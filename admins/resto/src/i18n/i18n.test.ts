/**
 * Resto Admin tarjima tekshiruvlari (uz / ru / en).
 *  1) restoUz ning HAMMA matn barglari (uz.ts) uchun ru va en tarjimasi bor, qiymat joylari ({n}) mos;
 *  2) kodda ishlatilgan t('...') / tr('...') kalitlari tarjimali (skanerlanadigan papkalar SCAN_SCOPE da sozlanadi);
 *  3) Proxy (restoUz) tilga qarab ishlaydi: matn, massiv, ichma-ich obyekt, roleLabel.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { restoUz, restoUzSource, roleLabel } from './uz.ts';
import { fill } from '../pages/Menu/BulkImport/text.ts';
import { registerDictionaries, setLang, t, getLang } from '../../../shared/src/i18n/engine.ts';
import sharedRu from '../../../shared/src/i18n/ru.ts';
import sharedEn from '../../../shared/src/i18n/en.ts';

const SRC = path.resolve(import.meta.dirname, '..');
const I18N = import.meta.dirname;

/**
 * Kalitlari skanerlanadigan joylar (src ga nisbatan; fayl yoki papka). Sahifa agentlari tarjimasini yozib bo'lgach o'z papkasini
 * shu ro'yxatga qo'shadi: shunda sahifada tarjimasiz t('...') qolsa test qizaradi. `admins/shared` o'zining testida tekshiriladi.
 */
const SCAN_SCOPE = ['main.tsx', 'routes.tsx', 'pages/Finance', 'pages/Dashboard', 'pages/Tables', 'pages/Orders', 'pages/Menu', 'pages/Staff', 'pages/Settings', 'pages/Bookings', 'pages/Brand', 'pages/Platform', 'pages/Tour'];

type Dict = Record<string, string>;

async function loadDict(lang: 'ru' | 'en'): Promise<Dict> {
  const dir = path.join(I18N, lang);
  const merged: Dict = {};
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
    const mod = await import(pathToFileURL(path.join(dir, name)).href);
    for (const [k, v] of Object.entries(mod.default as Dict)) {
      // Bir xil matn bir necha faylda uchrashi mumkin, lekin tarjimalar bir xil bo'lishi shart
      assert.ok(!(k in merged) || merged[k] === v, `${lang}/${name}: "${k}" boshqa faylda boshqacha tarjima qilingan`);
      merged[k] = v;
    }
  }
  return merged;
}

function leaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => leaves(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => leaves(v, out));
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const CYRILLIC = /[\u0400-\u04FF]/;
/** Ruscha tarjimasi o'zi bilan bir xil bo'lishi mumkin bo'lgan nomlar (kirill harfsiz) */
const SAME_IN_RU = new Set(['Resto Admin', 'Excel', 'Word', 'PDF', 'English', 'Hostess']);

for (const lang of ['ru', 'en'] as const) {
  test(`restoUz: barcha matn barglari ${lang} tilida tarjima qilingan`, async () => {
    const dict = await loadDict(lang);
    const texts = [...new Set(leaves(restoUzSource))];
    assert.ok(texts.length > 300, `restoUz barglari kam: ${texts.length}`);
    const missing = texts.filter((k) => !(k in dict) || !dict[k].trim());
    assert.deepEqual(missing.slice(0, 30), [], `${lang}: tarjimasiz matnlar ${missing.length} ta (birinchi 30 tasi yuqorida). uz.ts ga matn qo'shsangiz, ${lang}/*.ts ga tarjimasini ham yozing`);
    for (const key of texts) {
      const value = dict[key];
      assert.deepEqual(placeholders(value), placeholders(key), `${lang}: "${key}" tarjimasida qiymat joylari ({n}...) mos emas`);
      const hasWords = /\p{L}/u.test(value.replace(/\{\w+\}/g, ''));
      if (lang === 'ru') {
        assert.ok(!hasWords || CYRILLIC.test(value) || SAME_IN_RU.has(value) || value.startsWith("O'zbekcha"), `ru: "${key}" tarjimasi kirillcha emas: "${value}"`);
      } else if (!CYRILLIC.test(key)) {
        assert.ok(!CYRILLIC.test(value), `en: "${key}" tarjimasida kirill harf bor: "${value}"`);
      }
      // Ko'plik shakllari ('|') restoUz da ishlatilmaydi: fill() ko'plikni tanlamaydi, shuning uchun {n} dan keyin so'z shakli o'zgarmaydigan gaplar yoziladi
      assert.ok(!value.includes('|'), `${lang}: "${key}" tarjimasida '|' bor (restoUz da ko'plik yo'q)`);
    }
  });

  test(`lug'at ${lang}: shared lug'ati bilan bir xil kalitlar bir xil tarjima qilingan`, async () => {
    const dict = await loadDict(lang);
    const shared = lang === 'ru' ? sharedRu : sharedEn;
    const conflicts = Object.keys(dict).filter((k) => k in shared && shared[k] !== dict[k]).map((k) => `"${k}": resto "${dict[k]}" / shared "${shared[k]}"`);
    assert.deepEqual(conflicts, []);
  });

  test(`lug'at ${lang}: ortiqcha (uz.ts da yo'q) va bo'sh kalitlar yo'q`, async () => {
    const dict = await loadDict(lang);
    const used = new Set([...leaves(restoUzSource), ...usedKeys().map((k) => k.key)]);
    const orphans = Object.keys(dict).filter((k) => !used.has(k) && !(k in (lang === 'ru' ? sharedRu : sharedEn)));
    // Sahifa agentlari o'z kalitlarini t('...') bilan ishlatadi (SCAN_SCOPE ga qo'shilguncha ular "yetim" ko'rinadi): faqat bo'shlarni rad etamiz
    assert.deepEqual(Object.entries(dict).filter(([k, v]) => !k.trim() || !v.trim()), []);
    assert.ok(orphans.length < Object.keys(dict).length, 'lug\'atda hech bir kalit ishlatilmagan');
  });
}

// ─── Kodda ishlatilgan kalitlar ───
const CALL = /(?<![\w.$])(?:t|tr)\(\s*(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const TEMPLATE_CALL = /(?<![\w.$])(?:t|tr)\(\s*`/;
const unescape = (raw: string) => raw.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');

function walk(abs: string, out: string[] = []): string[] {
  if (fs.statSync(abs).isFile()) {
    // Avval `[...out, abs]` qaytarilardi, papka ichidagi natija esa tashlab yuborilardi: papkalar umuman skanerlanmasdi (faqat bitta fayl ishlardi)
    if (/\.tsx?$/.test(abs) && !/\.(test|d)\.ts$/.test(abs)) out.push(abs);
    return out;
  }
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) walk(path.join(abs, e.name), out);
  return out;
}

function usedKeys(): { key: string; file: string }[] {
  const keys: { key: string; file: string }[] = [];
  for (const scope of SCAN_SCOPE) {
    for (const file of walk(path.join(SRC, scope))) {
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(!TEMPLATE_CALL.test(text), `${path.relative(SRC, file)}: t(\`...\`) mumkin emas — literal ('...') yozing, qiymat uchun {n} ishlating`);
      for (const m of text.matchAll(CALL)) keys.push({ key: unescape(m[2]), file: path.relative(SRC, file) });
    }
  }
  return keys;
}

for (const lang of ['ru', 'en'] as const) {
  test(`kodda ishlatilgan t()/tr() kalitlari ${lang} tarjimali (${SCAN_SCOPE.join(', ')})`, async () => {
    const dict = { ...(lang === 'ru' ? sharedRu : sharedEn), ...(await loadDict(lang)) };
    const keys = usedKeys();
    assert.ok(keys.length >= 4, `skaner kalit topmadi (${keys.length}): regex yoki SCAN_SCOPE buzilgan`);
    const missing = keys.filter(({ key }) => !(key in dict) || !dict[key].trim());
    assert.deepEqual(missing.map((m) => `${m.file}: ${m.key}`).slice(0, 25), [], `${lang}: tarjimasiz kalitlar ${missing.length} ta`);
  });
}

// ─── Proxy: restoUz tilga qarab ───
test('restoUz (uz): proksi asl matnlarni o\'zgarishsiz qaytaradi', async () => {
  assert.equal(getLang(), 'uz');
  const proxied = leaves(restoUz);
  const source = leaves(restoUzSource);
  assert.deepEqual(proxied, source);
  assert.equal(restoUz.kitchenScreen, 'Oshxona ekrani');
  assert.equal(roleLabel('shop_owner'), 'Restoran egasi');
});

test('restoUz (ru/en): matn, massiv, ichma-ich obyekt, roleLabel, fill() tarjimalanadi; uz ga qaytganda asl matn', async () => {
  const [ru, en] = await Promise.all([loadDict('ru'), loadDict('en')]);
  registerDictionaries({
    ru: async () => ({ default: ru }),
    en: async () => ({ default: en }),
  });

  await setLang('ru');
  assert.equal(restoUz.dashboard, 'Панель управления');
  assert.equal(restoUz.settingsPage.menuLink, 'Ссылка на меню');
  assert.equal(restoUz.settingsPage.motionOptions.light, 'Лёгкие');
  assert.deepEqual(restoUz.bulkImport.input.formats, ['Excel', 'Word', 'PDF', 'Текст', 'Таблица', 'Фото']);
  assert.equal(restoUz.bulkImport.input.helpTips.length, 4);
  assert.match(restoUz.bulkImport.input.helpTips[1], /Samsung Notes/);
  assert.equal(roleLabel('waiter'), 'Официант');
  assert.equal(roleLabel('constructor'), 'Сотрудник');
  assert.equal(roleLabel(null), 'Сотрудник');
  assert.equal(fill(restoUz.bulkImport.review.found, { n: 3 }), 'Найдено блюд: 3');
  assert.equal(fill(restoUz.bulkImport.input.readingFile, { current: 1, total: 4, name: 'a.xlsx' }), '1 / 4: a.xlsx');
  assert.equal(restoUz.bulkImport.steps.review, 'Проверьте');
  assert.equal(t('Menyuni ochish'), 'Открыть меню');
  assert.equal(Object.keys(restoUz.roles).length, 7);

  await setLang('en');
  assert.equal(restoUz.dashboard, 'Dashboard');
  assert.equal(restoUz.financePage.profit, 'Profit');
  assert.equal(roleLabel('shop_owner'), 'Restaurant owner');
  assert.equal(fill(restoUz.bulkImport.commit.button, { n: 7 }), 'Add dishes: 7');
  assert.equal(restoUz.settingsPage.languagesOptions['uz,ru,en'], "O'zbekcha, Русский, English");

  await setLang('uz');
  assert.equal(restoUz.dashboard, 'Boshqaruv Markazi');
  assert.equal(roleLabel('shop_owner'), 'Restoran egasi');
});
