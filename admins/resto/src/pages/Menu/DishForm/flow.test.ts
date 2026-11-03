/**
 * Rasm o'qish javobidan forma holatigacha butun zanjir (interpretParse -> matchCategory -> formReducer).
 * Alohida modullar o'z testlarida tekshirilgan; bu yerda ular birga to'g'ri ishlashi ko'riladi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCategory } from './categoryMatch.ts';
import { emptyFields, formReducer, initialFormState, readBadges } from './formState.ts';
import type { FormState } from './formState.ts';
import { interpretParse } from './parseResult.ts';
import type { ParseResponse } from '../BulkImport/types.ts';

const categories = [
  { id: 7, name: 'Milliy taomlar' },
  { id: 8, name: 'Ichimliklar' },
];

const apply = (state: FormState, response: ParseResponse) => {
  const outcome = interpretParse(response);
  if (outcome.kind !== 'dish' && outcome.kind !== 'menu_single') return { state, outcome };
  const next = formReducer(state, { type: 'autofill', dish: outcome.dish, match: matchCategory(outcome.dish.category, categories) });
  return { state: next, outcome };
};

const row = (over: Record<string, unknown> = {}) => ({
  row_id: 'r1',
  name: 'Palov',
  price: null,
  category: 'milliy TAOMLAR',
  description: "Guruch, sabzi, go'sht",
  image_token: 'tok-1',
  ...over,
});

test('taom surati: bo\'sh forma to\'ladi, narx so\'raladi, rasm kodi qaytadi', () => {
  const start = initialFormState(emptyFields(), 'default');
  const { state, outcome } = apply(start, { kind: 'dish_photo', rows: [row()] } as ParseResponse);
  assert.equal(outcome.kind, 'dish');
  assert.equal(outcome.kind === 'dish' ? outcome.token : '', 'tok-1');
  assert.equal(state.fields.name, 'Palov');
  assert.equal(state.fields.category, '7');
  assert.equal(state.fields.price, '');
  assert.equal(state.priceHint, true);
  assert.deepEqual(readBadges(state), { name: true, price: false, category: true, description: true });
});

test('taom surati: egasi yozgan nom va narx saqlanadi, bo\'sh tavsif va kategoriya to\'ladi', () => {
  let start = initialFormState(emptyFields(), 'default');
  start = formReducer(start, { type: 'edit', field: 'name', value: "To'y oshi" });
  start = formReducer(start, { type: 'edit', field: 'price', value: '55000' });
  const { state } = apply(start, { kind: 'dish_photo', rows: [row()] } as ParseResponse);
  assert.equal(state.fields.name, "To'y oshi");
  assert.equal(state.fields.price, '55000');
  assert.equal(state.fields.description, "Guruch, sabzi, go'sht");
  assert.equal(state.priceHint, false);
});

test('menyu surati, 1 qator: nom + narx + kategoriya to\'ladi, rasm kodi hisobga olinmaydi', () => {
  const start = initialFormState(emptyFields(), 'default');
  const { state, outcome } = apply(start, {
    kind: 'menu',
    rows: [row({ name: "Lag'mon", price: 38000, category: 'Ichimliklar', image_token: null })],
  } as ParseResponse);
  assert.equal(outcome.kind, 'menu_single');
  assert.equal(state.fields.name, "Lag'mon");
  assert.equal(state.fields.price, '38000');
  assert.equal(state.fields.category, '8');
  assert.equal(state.priceHint, false);
});

test('menyu surati, ko\'p qator: forma o\'zgarmaydi, "Ommaviy qo\'shish"ga o\'tish taklif qilinadi', () => {
  const start = initialFormState(emptyFields(), 'default');
  const { state, outcome } = apply(start, {
    kind: 'menu',
    rows: [row({ image_token: null }), row({ row_id: 'r2', name: 'Manti', image_token: null }), row({ row_id: 'r3', name: 'Somsa', image_token: null })],
  } as ParseResponse);
  assert.deepEqual(outcome, { kind: 'menu_many', count: 3 });
  assert.equal(state, start);
});

test('o\'qib bo\'lmadi (qator yo\'q): forma o\'zgarmaydi', () => {
  const start = initialFormState(emptyFields(), 'default');
  const { state, outcome } = apply(start, { kind: 'menu', rows: [] });
  assert.deepEqual(outcome, { kind: 'nothing' });
  assert.equal(state, start);
});

test('menyuda yo\'q kategoriya: maydon bo\'sh qoladi, taklif paydo bo\'ladi', () => {
  const start = initialFormState(emptyFields(), 'default');
  const { state } = apply(start, { kind: 'dish_photo', rows: [row({ category: 'Salatlar' })] } as ParseResponse);
  assert.equal(state.fields.category, '');
  assert.equal(state.categorySuggestion, 'Salatlar');
});
