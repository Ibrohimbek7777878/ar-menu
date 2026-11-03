import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPLEMENT_KINDS, complementDishes, similarDishes } from '../src/utils/recommendations.ts';
import type { DishKind, Product } from '../src/types/dish.ts';

let nextId = 1;
const dish = (name: string, category_id: number, category_kind: DishKind | undefined, extra: Partial<Product> = {}): Product => ({
  id: nextId++, name, price: 10000, category_id, category_kind, ...extra,
});

const osh = dish('Osh', 1, 'main');
const lagmon = dish("Lag'mon", 1, 'main');
const manti = dish('Manti', 1, 'main', { is_popular: true });
const salat1 = dish('Achchiq', 2, 'salad');
const salat2 = dish('Yangi salat', 2, 'salad', { is_popular: true });
const tort = dish('Tort', 3, 'dessert');
const choy = dish("Ko'k choy", 4, 'drink');
const pitsa = dish('Pitsa', 5, 'other');
const noKind = dish('Noma\'lum', 6, undefined);
const all = [osh, lagmon, manti, salat1, salat2, tort, choy, pitsa, noKind];

test('similarDishes: faqat shu bo\'lim, o\'zi chiqmaydi, Hit oldinda, qolgani menyu tartibida', () => {
  assert.deepEqual(similarDishes(osh, all).map((p) => p.name), ['Manti', "Lag'mon"]);
  assert.deepEqual(similarDishes(manti, all).map((p) => p.name), ['Osh', "Lag'mon"]);
});

test('similarDishes: bo\'limsiz taom yoki yolg\'iz taom uchun bo\'sh ro\'yxat; limit ishlaydi', () => {
  assert.deepEqual(similarDishes({ id: 999, name: 'X', price: 1 }, all), []);
  assert.deepEqual(similarDishes(tort, all), []);
  assert.equal(similarDishes(osh, all, 1).length, 1);
});

test('complementDishes: asosiy taom -> salatlar (Hit oldinda)', () => {
  assert.deepEqual(complementDishes(osh, all).map((p) => p.name), ['Yangi salat', 'Achchiq']);
});

test('complementDishes: salat -> shirinliklar, shirinlik -> ichimliklar, ichimlik -> shirinliklar', () => {
  assert.deepEqual(complementDishes(salat1, all).map((p) => p.name), ['Tort']);
  assert.deepEqual(complementDishes(tort, all).map((p) => p.name), ["Ko'k choy"]);
  assert.deepEqual(complementDishes(choy, all).map((p) => p.name), ['Tort']);
});

test('complementDishes: "boshqa" turi, turi noma\'lum yoki mos taom yo\'q bo\'lsa bo\'sh', () => {
  assert.deepEqual(complementDishes(pitsa, all), []);
  assert.deepEqual(complementDishes(noKind, all), []);
  assert.deepEqual(complementDishes(osh, [osh, lagmon]), []);
});

test('complementDishes: o\'zi va turi yo\'q taomlar tavsiyaga tushmaydi; limit ishlaydi', () => {
  assert.ok(!complementDishes(salat1, [salat1, noKind]).includes(salat1));
  assert.equal(complementDishes(osh, all, 1).length, 1);
});

test('qoida jadvali: hech bir tur o\'zini tavsiya qilmaydi', () => {
  for (const [kind, targets] of Object.entries(COMPLEMENT_KINDS)) assert.ok(!targets.includes(kind as DishKind), kind);
});
