// Moliya va Boshqaruv paneli lug'atlaridagi ko'plik shakllari ('|') tekshiruvi:
// ru uchun 3 shakl (1 / 2-4 / 5+), en uchun 2 shakl; har shaklda {n} bo'lishi shart; o'zbekcha kalitda '|' bo'lmaydi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ruFinance from '../../i18n/ru/finance.ts';
import enFinance from '../../i18n/en/finance.ts';
import ruDashboard from '../../i18n/ru/dashboard.ts';
import enDashboard from '../../i18n/en/dashboard.ts';

const FORMS = { ru: 3, en: 2 } as const;
const dictionaries = { ru: { ...ruFinance, ...ruDashboard }, en: { ...enFinance, ...enDashboard } };

for (const lang of ['ru', 'en'] as const) {
  test(`${lang}: ko'plik shakllari soni va {n} joyi to'g'ri (finance, dashboard)`, () => {
    let plural = 0;
    for (const [key, value] of Object.entries(dictionaries[lang])) {
      assert.ok(!key.includes('|'), `kalitda '|' bo'lmasligi kerak: ${key}`);
      if (!value.includes('|')) continue;
      plural += 1;
      assert.ok(key.includes('{n}'), `"${key}": ko'plik faqat {n} bo'yicha tanlanadi`);
      const forms = value.split('|');
      assert.equal(forms.length, FORMS[lang], `${lang} "${key}": ${FORMS[lang]} ta shakl kerak`);
      for (const form of forms) assert.ok(form.includes('{n}'), `${lang} "${key}": har shaklda {n} bo'lishi kerak ("${form}")`);
    }
    assert.ok(plural >= 3, `ko'plik kalitlari topilmadi (${plural})`);
  });
}

test("ru va en lug'atlari bir xil kalitlar to'plamiga ega (finance, dashboard)", () => {
  assert.deepEqual(Object.keys(dictionaries.ru).sort(), Object.keys(dictionaries.en).sort());
});
