import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JPEG_QUALITY, MAX_IMAGE_SIDE, fitWithin, jpegFileName } from './imageResize.ts';

test('fitWithin: 1600 dan kichik rasm o\'zgarmaydi (kattalashtirilmaydi)', () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600, scaled: false });
  assert.deepEqual(fitWithin(1600, 1200), { width: 1600, height: 1200, scaled: false });
  assert.deepEqual(fitWithin(1600, 1600), { width: 1600, height: 1600, scaled: false });
});

test('fitWithin: telefon surati 1600 px gacha, nisbat saqlanadi', () => {
  // 4000x3000 (12 MP)
  assert.deepEqual(fitWithin(4000, 3000), { width: 1600, height: 1200, scaled: true });
  // vertikal: 3000x4000
  assert.deepEqual(fitWithin(3000, 4000), { width: 1200, height: 1600, scaled: true });
  // 4032x3024 (iPhone)
  assert.deepEqual(fitWithin(4032, 3024), { width: 1600, height: 1200, scaled: true });
  // 1601x1000 -> uzun tomon 1600, qisqasi nisbat bo'yicha yaxlitlanadi (999.4 -> 999)
  const edge = fitWithin(1601, 1000);
  assert.equal(edge.width, 1600);
  assert.equal(edge.height, 999);
  assert.equal(edge.scaled, true);
});

test('fitWithin: juda cho\'zinchoq rasmda ham tomon kamida 1 px', () => {
  const panorama = fitWithin(16000, 10);
  assert.equal(panorama.width, 1600);
  assert.equal(panorama.height, 1);
});

test('fitWithin: boshqa chegara va noto\'g\'ri o\'lcham', () => {
  assert.deepEqual(fitWithin(2000, 1000, 1000), { width: 1000, height: 500, scaled: true });
  assert.throws(() => fitWithin(0, 100), RangeError);
  assert.throws(() => fitWithin(100, -1), RangeError);
  assert.throws(() => fitWithin(Number.NaN, 100), RangeError);
});

test('standart qiymatlar: 1600 px va JPEG 0.85', () => {
  assert.equal(MAX_IMAGE_SIDE, 1600);
  assert.equal(JPEG_QUALITY, 0.85);
});

test('jpegFileName: kengaytma almashadi, xavfli belgilar tozalanadi', () => {
  assert.equal(jpegFileName('IMG_001.HEIC'), 'IMG_001.jpg');
  assert.equal(jpegFileName('menyu.png'), 'menyu.jpg');
  assert.equal(jpegFileName('a/b\\c.webp'), 'a_b_c.jpg');
  assert.equal(jpegFileName(''), 'rasm.jpg');
  assert.equal(jpegFileName('.png'), 'rasm.jpg');
});
