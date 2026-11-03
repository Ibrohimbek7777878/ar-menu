import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCategory } from './categoryMatch.ts';
import {
  emptyFields,
  formReducer,
  initialFormState,
  isFormDirty,
  readBadges,
} from './formState.ts';
import type { FormState } from './formState.ts';
import type { ParsedDish } from './types.ts';

const categories = [
  { id: 1, name: 'Milliy taomlar' },
  { id: 2, name: 'Ichimliklar' },
];

const dish = (over: Partial<ParsedDish> = {}): ParsedDish => ({
  name: 'Palov',
  description: 'Guruch, sabzi, mol go\'shti',
  category: 'Milliy taomlar',
  price: null,
  ...over,
});

const autofill = (state: FormState, parsed: ParsedDish) =>
  formReducer(state, { type: 'autofill', dish: parsed, match: matchCategory(parsed.category, categories) });

const fresh = (category = '', source: 'default' | 'tab' | 'user' = 'default') =>
  initialFormState({ ...emptyFields(), category }, source);

test('autofill: bo\'sh maydonlar to\'ldiriladi va belgilanadi', () => {
  const next = autofill(fresh(), dish());
  assert.equal(next.fields.name, 'Palov');
  assert.equal(next.fields.description, "Guruch, sabzi, mol go'shti");
  assert.equal(next.fields.category, '1');
  assert.equal(next.categorySource, 'ai');
  assert.deepEqual(readBadges(next), { name: true, price: false, category: true, description: true });
});

test('autofill: egasi yozgan maydonga tegilmaydi', () => {
  let state = fresh();
  state = formReducer(state, { type: 'edit', field: 'name', value: "To'y oshi" });
  state = formReducer(state, { type: 'edit', field: 'description', value: 'Mening tavsifim' });
  state = formReducer(state, { type: 'edit', field: 'price', value: '55000' });
  const next = autofill(state, dish({ price: 40000 }));
  assert.equal(next.fields.name, "To'y oshi");
  assert.equal(next.fields.description, 'Mening tavsifim');
  assert.equal(next.fields.price, '55000');
  assert.deepEqual(next.autoFilled.name, undefined);
  assert.deepEqual(readBadges(next).name, false);
});

test('autofill: faqat bo\'sh maydon to\'ldiriladi, qolganlari o\'z holicha qoladi', () => {
  let state = fresh();
  state = formReducer(state, { type: 'edit', field: 'name', value: "To'y oshi" });
  const next = autofill(state, dish());
  assert.equal(next.fields.name, "To'y oshi");
  assert.equal(next.fields.description, "Guruch, sabzi, mol go'shti");
});

test('autofill: bo\'shliqdan iborat maydon bo\'sh hisoblanadi', () => {
  let state = fresh();
  state = formReducer(state, { type: 'edit', field: 'name', value: '   ' });
  assert.equal(autofill(state, dish()).fields.name, 'Palov');
});

test('autofill: tizim to\'ldirgan, egasi tegmagan qiymat yangi rasm bilan almashadi', () => {
  const first = autofill(fresh(), dish({ name: 'Palov' }));
  const second = autofill(first, dish({ name: 'Lag\'mon', description: 'Cho\'zma lag\'mon', category: 'Ichimliklar' }));
  assert.equal(second.fields.name, "Lag'mon");
  assert.equal(second.fields.description, "Cho'zma lag'mon");
  assert.equal(second.fields.category, '2');
});

test('autofill: egasi o\'zgartirgan qiymat keyingi rasmda ham saqlanadi', () => {
  let state = autofill(fresh(), dish({ name: 'Palov' }));
  state = formReducer(state, { type: 'edit', field: 'name', value: 'Palov (katta)' });
  const next = autofill(state, dish({ name: 'Lag\'mon' }));
  assert.equal(next.fields.name, 'Palov (katta)');
});

test('belgi: egasi qiymatni o\'zgartirsa yo\'qoladi', () => {
  let state = autofill(fresh(), dish());
  assert.equal(readBadges(state).name, true);
  state = formReducer(state, { type: 'edit', field: 'name', value: 'Palov ' });
  assert.equal(readBadges(state).name, false);
  assert.equal(readBadges(state).description, true);
});

test('kategoriya: forma o\'zi qo\'ygan boshlang\'ich kategoriya rasmdan topilgan kategoriya bilan almashadi', () => {
  const next = autofill(fresh('2', 'default'), dish());
  assert.equal(next.fields.category, '1');
});

test('kategoriya: egasi tanlagan yoki menyu lentasidagi kategoriyaga tegilmaydi', () => {
  const chosen = formReducer(fresh('2', 'default'), { type: 'set_category', id: '2' });
  assert.equal(autofill(chosen, dish()).fields.category, '2');
  assert.equal(autofill(fresh('2', 'tab'), dish()).fields.category, '2');
  assert.equal(autofill(fresh('2', 'user'), dish()).fields.category, '2');
  assert.equal(autofill(fresh('2', 'tab'), dish({ category: 'Salatlar' })).categorySuggestion, null);
});

test('kategoriya: menyuda yo\'q nom taklif sifatida saqlanadi, maydon o\'zgarmaydi', () => {
  const next = autofill(fresh('', 'default'), dish({ category: 'Salatlar' }));
  assert.equal(next.fields.category, '');
  assert.equal(next.categorySuggestion, 'Salatlar');
});

test('kategoriya: taklif egasi kategoriya tanlagach yoki yopgach yo\'qoladi', () => {
  const suggested = autofill(fresh(), dish({ category: 'Salatlar' }));
  assert.equal(formReducer(suggested, { type: 'set_category', id: '1' }).categorySuggestion, null);
  assert.equal(formReducer(suggested, { type: 'dismiss_category_suggestion' }).categorySuggestion, null);
});

test('kategoriya: keyingi rasmda kategoriya aytilmasa eski taklif yo\'qoladi', () => {
  const suggested = autofill(fresh(), dish({ category: 'Salatlar' }));
  assert.equal(autofill(suggested, dish({ category: '' })).categorySuggestion, null);
});

test('narx: rasmdan narx topilmasa ishora yoqiladi, yozilgach o\'chadi', () => {
  let state = autofill(fresh(), dish());
  assert.equal(state.priceHint, true);
  state = formReducer(state, { type: 'edit', field: 'price', value: '4' });
  assert.equal(state.priceHint, false);
});

test('narx: egasi narx yozgan bo\'lsa ishora chiqmaydi', () => {
  let state = fresh();
  state = formReducer(state, { type: 'edit', field: 'price', value: '45000' });
  assert.equal(autofill(state, dish()).priceHint, false);
});

test('narx: menyu suratidagi bitta qatorning narxi bo\'sh maydonga yoziladi', () => {
  const next = autofill(fresh(), dish({ price: 45000 }));
  assert.equal(next.fields.price, '45000');
  assert.equal(next.priceHint, false);
  assert.equal(readBadges(next).price, true);
});

test('autofill: bo\'sh o\'qish natijasi (nom ham, narx ham yo\'q) hech narsani buzmaydi', () => {
  const empty: ParsedDish = { name: '', description: '', category: '', price: null };
  const next = autofill(fresh('2', 'default'), empty);
  assert.equal(next.fields.name, '');
  assert.equal(next.fields.category, '2');
  assert.equal(next.priceHint, true);
});

test('edit: boshqa maydonlar o\'zgarmaydi va avvalgi holat o\'zgartirilmaydi (immutabillik)', () => {
  const state = fresh();
  const next = formReducer(state, { type: 'edit', field: 'prepMinutes', value: '25' });
  assert.equal(state.fields.prepMinutes, '15');
  assert.equal(next.fields.prepMinutes, '25');
  assert.equal(next.fields.name, '');
});

test('isFormDirty: boshlang\'ich holatda toza, o\'zgargach iflos', () => {
  const initial = { ...emptyFields(), category: '3' };
  assert.equal(isFormDirty(initial, initial), false);
  assert.equal(isFormDirty({ ...initial, name: 'a' }, initial), true);
  assert.equal(isFormDirty({ ...initial, category: '' }, initial), true);
  assert.equal(isFormDirty({ ...initial, prepMinutes: '20' }, initial), true);
});
