import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendTranslations,
  emptyTranslations,
  filledLanguages,
  translationsFromProduct,
  TRANSLATION_FIELDS,
} from './translations.ts';

test('translationsFromProduct: yo\'q yoki to\'liq bo\'lmagan taom bo\'sh qiymat beradi', () => {
  assert.deepEqual(translationsFromProduct(null), emptyTranslations());
  assert.deepEqual(translationsFromProduct(undefined), emptyTranslations());
  assert.deepEqual(translationsFromProduct({ name_ru: 'Плов' }), { ...emptyTranslations(), name_ru: 'Плов' });
  assert.deepEqual(translationsFromProduct({ name_en: null }), emptyTranslations());
});

test('translationsFromProduct: to\'rtala maydonni o\'qiydi', () => {
  const v = translationsFromProduct({
    name_ru: 'Плов',
    name_en: 'Pilaf',
    description_ru: 'Рис и мясо',
    description_en: 'Rice and meat',
  });
  assert.equal(v.name_ru, 'Плов');
  assert.equal(v.name_en, 'Pilaf');
  assert.equal(v.description_ru, 'Рис и мясо');
  assert.equal(v.description_en, 'Rice and meat');
});

test('filledLanguages: faqat to\'ldirilgan tillar, bo\'sh joy hisobga olinmaydi', () => {
  assert.deepEqual(filledLanguages(emptyTranslations()), []);
  assert.deepEqual(filledLanguages({ ...emptyTranslations(), name_ru: '   ' }), []);
  assert.deepEqual(filledLanguages({ ...emptyTranslations(), description_en: 'Rice' }), ['en']);
  assert.deepEqual(filledLanguages({ ...emptyTranslations(), name_ru: 'Плов', name_en: 'Pilaf' }), ['ru', 'en']);
});

test('appendTranslations: bo\'sh maydon ham yuboriladi (tahrirlashda tozalash uchun), qiymat kesiladi', () => {
  const fd = new FormData();
  appendTranslations(fd, { ...emptyTranslations(), name_ru: '  Плов ', description_en: '' });
  for (const field of TRANSLATION_FIELDS) assert.ok(fd.has(field), `${field} yuborilmadi`);
  assert.equal(fd.get('name_ru'), 'Плов');
  assert.equal(fd.get('name_en'), '');
  assert.equal(fd.get('description_ru'), '');
  assert.equal(fd.get('description_en'), '');
});
