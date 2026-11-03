import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasAnyImage, hasNewImage, imagePayload } from './imagePayload.ts';
import type { DishImage } from './types.ts';

const file = new File(['x'], 'palov.jpg', { type: 'image/jpeg' });

test('rasm yo\'q yoki hozirgi rasm: hech narsa yuborilmaydi', () => {
  const none: DishImage = { kind: 'none' };
  const current: DishImage = { kind: 'current', url: '/media/x.jpg', credit: '', sourceUrl: '' };
  for (const image of [none, current]) {
    assert.deepEqual(imagePayload(image), { token: null, file: null, fallbackFile: null });
  }
});

test('internetdan tanlangan rasm: faqat token', () => {
  const image: DishImage = { kind: 'internet', token: 'tok', previewUrl: '/p', credit: 'Muallif · CC BY', sourceUrl: '' };
  assert.deepEqual(imagePayload(image), { token: 'tok', file: null, fallbackFile: null });
});

test('egasining surati o\'qilgan bo\'lsa token yuboriladi, fayl zaxirada qoladi (qayta yuklash yo\'q)', () => {
  const image: DishImage = { kind: 'file', file, previewUrl: 'blob:1', token: 'read-token' };
  const payload = imagePayload(image);
  assert.equal(payload.token, 'read-token');
  assert.equal(payload.file, null);
  assert.equal(payload.fallbackFile, file);
});

test('egasining surati o\'qilmagan (AI o\'chiq/xato) bo\'lsa fayl o\'zi yuboriladi', () => {
  const image: DishImage = { kind: 'file', file, previewUrl: 'blob:1', token: null };
  const payload = imagePayload(image);
  assert.equal(payload.token, null);
  assert.equal(payload.file, file);
  assert.equal(payload.fallbackFile, null);
});

test('hasNewImage va hasAnyImage', () => {
  assert.equal(hasNewImage({ kind: 'none' }), false);
  assert.equal(hasNewImage({ kind: 'current', url: 'u', credit: '', sourceUrl: '' }), false);
  assert.equal(hasNewImage({ kind: 'file', file, previewUrl: 'b', token: null }), true);
  assert.equal(hasNewImage({ kind: 'internet', token: 't', previewUrl: '', credit: '', sourceUrl: '' }), true);
  assert.equal(hasAnyImage({ kind: 'none' }), false);
  assert.equal(hasAnyImage({ kind: 'current', url: 'u', credit: '', sourceUrl: '' }), true);
});
