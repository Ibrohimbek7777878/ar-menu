import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName } from '../BulkImport/rows.ts';
import { CATEGORY_NAME_MAX, cleanCategoryName, matchCategory, normalizeCategoryName } from './categoryMatch.ts';

const categories = [
  { id: 1, name: 'Milliy taomlar' },
  { id: 2, name: "Sho'rvalar" },
  { id: 3, name: 'Ichimliklar' },
];

test('normalizeCategoryName: ommaviy qo\'shishdagi normalizeName bilan bir xil natija beradi', () => {
  const samples = [
    "  Sho‘rvalar ",
    "Sho'rvalar",
    'SHOʻRVALAR',
    'Milliy   taomlar',
    'Ichimliklar ',
    'ＩＣＨＩＭＬＩＫＬＡＲ',
    '',
    "Go`sht taomlari",
  ];
  for (const sample of samples) assert.equal(normalizeCategoryName(sample), normalizeName(sample), sample);
});

test('matchCategory: nom registr, bo\'shliq va apostrofga qaramay mavjud kategoriyaga mos keladi', () => {
  assert.deepEqual(matchCategory('milliy  TAOMLAR', categories), { kind: 'existing', id: 1, name: 'Milliy taomlar' });
  assert.deepEqual(matchCategory('Sho‘rvalar', categories), { kind: 'existing', id: 2, name: "Sho'rvalar" });
  assert.deepEqual(matchCategory('  ichimliklar ', categories), { kind: 'existing', id: 3, name: 'Ichimliklar' });
});

test('matchCategory: mos kelmasa yangi kategoriya sifatida taklif qilinadi (toza nom bilan)', () => {
  assert.deepEqual(matchCategory('  Salatlar   va   gazaklar ', categories), { kind: 'new', name: 'Salatlar va gazaklar' });
});

test('matchCategory: bo\'sh, null va undefined -> none', () => {
  assert.deepEqual(matchCategory('', categories), { kind: 'none' });
  assert.deepEqual(matchCategory('   ', categories), { kind: 'none' });
  assert.deepEqual(matchCategory(null, categories), { kind: 'none' });
  assert.deepEqual(matchCategory(undefined, categories), { kind: 'none' });
});

test('matchCategory: kategoriyalar ro\'yxati bo\'sh bo\'lsa har qanday nom yangi', () => {
  assert.deepEqual(matchCategory('Desertlar', []), { kind: 'new', name: 'Desertlar' });
});

test('matchCategory: bir nechta mos kelsa birinchisi olinadi', () => {
  const dup = [
    { id: 10, name: 'Salat' },
    { id: 11, name: 'salat' },
  ];
  assert.deepEqual(matchCategory('SALAT', dup), { kind: 'existing', id: 10, name: 'Salat' });
});

test('cleanCategoryName: serverdagi 100 belgi chegarasiga kesiladi (aks holda yaratish 400 beradi)', () => {
  const long = 'a'.repeat(250);
  assert.equal(cleanCategoryName(long).length, CATEGORY_NAME_MAX);
  assert.equal(CATEGORY_NAME_MAX, 100);
  const match = matchCategory(long, categories);
  assert.equal(match.kind, 'new');
  assert.equal(match.kind === 'new' ? match.name.length : 0, 100);
});
