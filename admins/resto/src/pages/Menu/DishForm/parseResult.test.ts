import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DISH_DESCRIPTION_MAX, DISH_NAME_MAX, interpretParse } from './parseResult.ts';
import type { ParseResponse } from '../BulkImport/types.ts';

const row = (over: Record<string, unknown> = {}) => ({
  row_id: 'r1',
  name: 'Palov',
  price: null,
  category: 'Milliy taomlar',
  description: "Guruch, sabzi, go'sht",
  image_token: null,
  ...over,
});

test('dish_photo: bitta qator va rasm kodi taom sifatida qaytadi', () => {
  const outcome = interpretParse({
    kind: 'dish_photo',
    rows: [row({ image_token: 'abc123', price: null })],
  } as ParseResponse);
  assert.deepEqual(outcome, {
    kind: 'dish',
    token: 'abc123',
    dish: { name: 'Palov', description: "Guruch, sabzi, go'sht", category: 'Milliy taomlar', price: null },
  });
});

test('dish_photo: nom o\'qilmagan bo\'lsa ham rasm kodi saqlanadi (rasm baribir taom surati)', () => {
  const outcome = interpretParse({ kind: 'dish_photo', rows: [row({ name: '', image_token: 'tok' })] } as ParseResponse);
  assert.equal(outcome.kind, 'dish');
  assert.equal(outcome.kind === 'dish' ? outcome.token : '', 'tok');
  assert.equal(outcome.kind === 'dish' ? outcome.dish.name : 'x', '');
});

test('dish_photo: qator yo\'q yoki rasm kodi yo\'q bo\'lsa ham taom natijasi (kod null)', () => {
  const noRows = interpretParse({ kind: 'dish_photo', rows: [] });
  assert.deepEqual(noRows, { kind: 'dish', token: null, dish: { name: '', description: '', category: '', price: null } });
  const noToken = interpretParse({ kind: 'dish_photo', rows: [row({ image_token: '' })] } as ParseResponse);
  assert.equal(noToken.kind === 'dish' ? noToken.token : 'x', null);
});

test('dish_photo: qiymatlar tozalanadi va server chegarasiga kesiladi', () => {
  const outcome = interpretParse({
    kind: 'dish_photo',
    rows: [row({ name: `  ${'N'.repeat(300)}  `, description: 'D'.repeat(6000), category: '  Salat   lar ' })],
  } as ParseResponse);
  assert.equal(outcome.kind, 'dish');
  if (outcome.kind !== 'dish') return;
  assert.equal(outcome.dish.name.length, DISH_NAME_MAX);
  assert.equal(outcome.dish.description.length, DISH_DESCRIPTION_MAX);
  assert.equal(outcome.dish.category, 'Salat lar');
});

test('dish_photo: noto\'g\'ri narx (manfiy, nol, matn) e\'tiborsiz qoladi', () => {
  const bad = interpretParse({ kind: 'dish_photo', rows: [row({ price: -5 })] } as ParseResponse);
  assert.equal(bad.kind === 'dish' ? bad.dish.price : 'x', null);
  const zero = interpretParse({ kind: 'dish_photo', rows: [row({ price: 0 })] } as ParseResponse);
  assert.equal(zero.kind === 'dish' ? zero.dish.price : 'x', null);
  const text = interpretParse({ kind: 'dish_photo', rows: [row({ price: '45000' })] } as ParseResponse);
  assert.equal(text.kind === 'dish' ? text.dish.price : 'x', null);
});

test('menu, 1 qator: nom, narx va kategoriya olinadi; rasm kodi hisobga olinmaydi', () => {
  const outcome = interpretParse({
    kind: 'menu',
    rows: [row({ name: 'Lag\'mon', price: 38000, image_token: 'ignored' })],
  } as ParseResponse);
  assert.deepEqual(outcome, {
    kind: 'menu_single',
    dish: { name: "Lag'mon", description: "Guruch, sabzi, go'sht", category: 'Milliy taomlar', price: 38000 },
  });
});

test('menu, ko\'p qator: ommaviy qo\'shishga yo\'naltiriladi va taomlar soni aytiladi', () => {
  const outcome = interpretParse({
    kind: 'menu',
    rows: [row({ row_id: 'r1' }), row({ row_id: 'r2', name: 'Manti' }), row({ row_id: 'r3', name: 'Somsa' })],
  } as ParseResponse);
  assert.deepEqual(outcome, { kind: 'menu_many', count: 3 });
});

test('menu: nomsiz qatorlar sanalmaydi', () => {
  const one = interpretParse({ kind: 'menu', rows: [row({ name: '  ' }), row({ row_id: 'r2', name: 'Osh' })] } as ParseResponse);
  assert.equal(one.kind, 'menu_single');
  const none = interpretParse({ kind: 'menu', rows: [row({ name: '' })] } as ParseResponse);
  assert.deepEqual(none, { kind: 'nothing' });
});

test('hech narsa o\'qilmagan javoblar -> nothing', () => {
  assert.deepEqual(interpretParse({ kind: 'menu', rows: [] }), { kind: 'nothing' });
  assert.deepEqual(interpretParse({ rows: [] }), { kind: 'nothing' });
  assert.deepEqual(interpretParse(null), { kind: 'nothing' });
  assert.deepEqual(interpretParse(undefined), { kind: 'nothing' });
  assert.deepEqual(interpretParse({ rows: 'xato' } as unknown as ParseResponse), { kind: 'nothing' });
});

test('kind kelmagan eski javob: bitta qator va rasm kodi bo\'lsa taom surati', () => {
  const dishy = interpretParse({ rows: [row({ image_token: 'tok' })] } as ParseResponse);
  assert.equal(dishy.kind, 'dish');
  const menuish = interpretParse({ rows: [row(), row({ row_id: 'r2', name: 'Osh' })] } as ParseResponse);
  assert.deepEqual(menuish, { kind: 'menu_many', count: 2 });
});

test('menu, 1 qator, lekin faqat OCR topgan (AI o\'chiq): ishonchsiz, hech narsa to\'ldirilmaydi', () => {
  const outcome = interpretParse({ kind: 'menu', engine: 'ocr', rows: [row({ name: 'ASDF 12', image_token: null })] } as ParseResponse);
  assert.deepEqual(outcome, { kind: 'nothing' });
});

test('menu, ko\'p qator OCR dan bo\'lsa ham ommaviy qo\'shishga yo\'naltiriladi (haqiqiy qog\'oz menyu)', () => {
  const outcome = interpretParse({
    kind: 'menu',
    engine: 'ocr',
    rows: [row({ image_token: null }), row({ row_id: 'r2', name: 'Manti', image_token: null })],
  } as ParseResponse);
  assert.deepEqual(outcome, { kind: 'menu_many', count: 2 });
});

test('menu, 1 qator AI dan bo\'lsa to\'ldiriladi', () => {
  const outcome = interpretParse({ kind: 'menu', engine: 'ai', rows: [row({ name: 'Osh', image_token: null })] } as ParseResponse);
  assert.equal(outcome.kind, 'menu_single');
});
