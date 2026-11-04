import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SIDE, MAX_SOURCE_BYTES, checkImageFile, detectType, outputFileName, outputFormat } from './logoFile.ts';
import { fitWithin } from '../Menu/BulkImport/imageResize.ts';

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

test('detectType: brauzer turi ustun, bo\'sh bo\'lsa kengaytmadan', () => {
  assert.equal(detectType(file('a.png', 'image/png')), 'image/png');
  assert.equal(detectType(file('a.HEIC', '')), 'image/heic');
  assert.equal(detectType(file('rasm', '')), '');
  assert.equal(detectType(file('a.exe', '')), '');
});

test('checkImageFile: yaroqli rasmlar o\'tadi', () => {
  for (const f of [file('a.png', 'image/png'), file('a.jpg', 'image/jpeg'), file('a.webp', 'image/webp'), file('IMG.HEIC', ''), file('a.gif', 'image/gif')]) {
    assert.equal(checkImageFile(f), null, f.name);
  }
});

test('checkImageFile: bo\'sh, rasm emas, SVG, juda katta', () => {
  assert.equal(checkImageFile(file('a.png', 'image/png', 0)), 'empty');
  assert.equal(checkImageFile(file('a.pdf', 'application/pdf')), 'not_image');
  assert.equal(checkImageFile(file('a.txt', '')), 'not_image');
  assert.equal(checkImageFile(file('a.svg', 'image/svg+xml')), 'svg');
  assert.equal(checkImageFile(file('a.svg', '')), 'svg');
  assert.equal(checkImageFile(file('a.png', 'image/png', MAX_SOURCE_BYTES)), null, 'aynan chegara o\'tadi');
  assert.equal(checkImageFile(file('a.png', 'image/png', MAX_SOURCE_BYTES + 1)), 'too_big');
});

test('outputFormat: surat JPEG, qolgani PNG (shaffoflik saqlansin)', () => {
  assert.deepEqual(outputFormat(file('a.jpg', 'image/jpeg')), { mime: 'image/jpeg', ext: 'jpg', quality: 0.9 });
  assert.deepEqual(outputFormat(file('a.heic', '')), { mime: 'image/jpeg', ext: 'jpg', quality: 0.9 });
  assert.deepEqual(outputFormat(file('a.png', 'image/png')), { mime: 'image/png', ext: 'png' });
  assert.deepEqual(outputFormat(file('a.webp', 'image/webp')), { mime: 'image/png', ext: 'png' });
  assert.deepEqual(outputFormat(file('a', '')), { mime: 'image/png', ext: 'png' });
});

test('outputFileName: xavfsiz lotin nom', () => {
  const png = outputFormat(file('a.png', 'image/png'));
  assert.equal(outputFileName('Logo Final.PNG', png, 'logo'), 'logo-final.png');
  assert.equal(outputFileName('../../etc/passwd.png', png, 'logo'), 'etc-passwd.png');
  assert.equal(outputFileName('Гулистон.png', png, 'logo'), 'logo.png', 'lotin bo\'lmagan nom -> tur nomi');
  assert.equal(outputFileName('', png, 'favicon'), 'favicon.png');
  assert.equal(outputFileName('x'.repeat(100) + '.png', png, 'logo').length, 40 + 4);
  assert.equal(outputFileName('a.heic', outputFormat(file('a.heic', '')), 'logo'), 'a.jpg');
});

test('o\'lcham: logotip 512, favicon 256; kichigi kattalashtirilmaydi, nisbat saqlanadi', () => {
  assert.deepEqual(fitWithin(4000, 2000, MAX_SIDE.logo), { width: 512, height: 256, scaled: true });
  assert.deepEqual(fitWithin(1000, 1000, MAX_SIDE.favicon), { width: 256, height: 256, scaled: true });
  assert.deepEqual(fitWithin(300, 100, MAX_SIDE.logo), { width: 300, height: 100, scaled: false });
  assert.deepEqual(fitWithin(512, 512, MAX_SIDE.logo), { width: 512, height: 512, scaled: false });
  assert.deepEqual(fitWithin(5000, 1, MAX_SIDE.logo), { width: 512, height: 1, scaled: true }, 'juda ingichka rasm kamida 1 px');
});
