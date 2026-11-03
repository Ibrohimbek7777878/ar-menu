import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import { fill } from './text.ts';

test('fill: belgilar to\'ldiriladi', () => {
  assert.equal(fill('{n} ta taomni qo\'shish', { n: 48 }), "48 ta taomni qo'shish");
  assert.equal(fill('{a} / {b}', { a: 1, b: 'x' }), '1 / x');
  assert.equal(fill('{n} ta, {n} ta', { n: 2 }), '2 ta, 2 ta');
});

test('fill: noma\'lum belgi o\'z holicha qoladi, prototip kalitlari o\'qilmaydi', () => {
  assert.equal(fill('{yoq}', {}), '{yoq}');
  assert.equal(fill('{constructor}', {}), '{constructor}');
});

test('tasdiqlash tugmasi matni shartnomadagidek: "48 ta taomni qo\'shish"', () => {
  assert.equal(fill(restoUz.bulkImport.commit.button, { n: 48 }), "48 ta taomni qo'shish");
});
