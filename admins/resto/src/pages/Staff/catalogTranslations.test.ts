/**
 * Ruxsatlar katalogi serverda (`backend/web/capabilities.py`) o'zbekcha matn bilan yoziladi va panelga shu holda keladi.
 * Ru/en tarjimalari `i18n/{ru,en}/staff-profile.ts` da kalit sifatida o'sha matn bilan turadi. Serverda nom/tushuntirish/guruh
 * o'zgarsa yoki yangi ruxsat qo'shilsa va tarjima yangilanmasa, panel ruscha/inglizcha rejimda o'sha qatorni o'zbekcha ko'rsatadi:
 * bu test shuni darhol ushlaydi. Fayl topilmasa (faqat frontend yig'ilgan bo'lsa) o'tkazib yuboriladi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharedRu from '../../../../shared/src/i18n/ru.ts';
import sharedEn from '../../../../shared/src/i18n/en.ts';

const CAPABILITIES_PY = path.resolve(import.meta.dirname, '../../../../../backend/web/capabilities.py');
const I18N = path.resolve(import.meta.dirname, '../../i18n');

type Dict = Record<string, string>;

async function loadDict(lang: 'ru' | 'en'): Promise<Dict> {
  const dir = path.join(I18N, lang);
  const merged: Dict = {};
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.ts') && n !== 'index.ts')) {
    const mod = await import(pathToFileURL(path.join(dir, name)).href);
    Object.assign(merged, mod.default as Dict);
  }
  return merged;
}

/** Python satr literali (""-lar ichida) -> matn. Katalogda faqat qo'sh tirnoqli satrlar ishlatiladi. */
function catalogTexts(source: string): string[] {
  const texts: string[] = [];
  for (const m of source.matchAll(/'(?:label|description)':\s*"((?:\\.|[^"\\])*)"/g)) texts.push(m[1]);
  const groups = source.match(/GROUPS\s*=\s*\{([\s\S]*?)\n\}/);
  if (groups) for (const m of groups[1].matchAll(/'[\w]+':\s*"((?:\\.|[^"\\])*)"/g)) texts.push(m[1]);
  return [...new Set(texts)];
}

for (const lang of ['ru', 'en'] as const) {
  test(`ruxsatlar katalogi matnlari ${lang} tilida tarjima qilingan`, async (t) => {
    if (!fs.existsSync(CAPABILITIES_PY)) {
      t.skip('backend/web/capabilities.py topilmadi');
      return;
    }
    const texts = catalogTexts(fs.readFileSync(CAPABILITIES_PY, 'utf8'));
    assert.ok(texts.length >= 20, `katalog matnlari kam topildi (${texts.length}): regex buzilgan bo'lishi mumkin`);
    const dict = { ...(lang === 'ru' ? sharedRu : sharedEn), ...(await loadDict(lang)) };
    const missing = texts.filter((text) => !(text in dict) || !dict[text].trim());
    assert.deepEqual(missing, [], `${lang}: tarjimasiz katalog matnlari. i18n/${lang}/staff-profile.ts ga qo'shing`);
  });
}
