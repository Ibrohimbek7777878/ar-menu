import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import {
  FILE_ACCEPT,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_SOURCE_BYTES,
  classifyFile,
  fileExtension,
  formatBytes,
} from './files.ts';

const file = (name: string, size = 1000, type = '') => ({ name, size, type });

test('fileExtension', () => {
  assert.equal(fileExtension('Menyu.XLSX'), 'xlsx');
  assert.equal(fileExtension('a.b.c.pdf'), 'pdf');
  assert.equal(fileExtension('README'), '');
});

test('qo\'llab-quvvatlanadigan hujjatlar va rasmlar', () => {
  for (const name of ['m.xlsx', 'm.csv', 'm.txt', 'm.docx', 'm.pdf']) {
    assert.deepEqual(classifyFile(file(name)), { ok: true, kind: 'document' }, name);
  }
  for (const [name, type] of [
    ['IMG_1.jpg', 'image/jpeg'],
    ['a.PNG', 'image/png'],
    ['a.webp', 'image/webp'],
    ['kamera', 'image/jpeg'],
    ['rasm.heic', ''],
  ] as const) {
    assert.deepEqual(classifyFile(file(name, 1000, type)), { ok: true, kind: 'image' }, name);
  }
});

test('eski va yopiq formatlar aniq sabab bilan rad etiladi', () => {
  assert.deepEqual(classifyFile(file('narx.xls')), { ok: false, reason: 'legacy', legacy: 'excel' });
  assert.deepEqual(classifyFile(file('narx.doc')), { ok: false, reason: 'legacy', legacy: 'word' });
  assert.deepEqual(classifyFile(file('eslatma.sdocx')), { ok: false, reason: 'legacy', legacy: 'samsung' });
  assert.deepEqual(classifyFile(file('eslatma.memo')), { ok: false, reason: 'legacy', legacy: 'samsung' });
  assert.deepEqual(classifyFile(file('m.pages')), { ok: false, reason: 'legacy', legacy: 'apple' });
  assert.deepEqual(classifyFile(file('m.numbers')), { ok: false, reason: 'legacy', legacy: 'apple' });
  assert.deepEqual(classifyFile(file('m.exe')), { ok: false, reason: 'unsupported' });
  assert.deepEqual(classifyFile(file('noextension')), { ok: false, reason: 'unsupported' });
});

test('har bir eski format uchun maslahat matni bor', () => {
  const legacy = restoUz.bulkImport.fileProblems.legacy;
  for (const kind of ['excel', 'word', 'samsung', 'apple', 'other'] as const) {
    assert.ok(legacy[kind].length > 10, kind);
  }
  assert.match(legacy.samsung, /Ulashish/);
  assert.match(legacy.excel, /Boshqacha saqlash/);
});

test('hajm chegaralari: hujjat 10 MB, rasm kichraytiriladi shuning uchun kattaroq ruxsat', () => {
  assert.equal(classifyFile(file('m.xlsx', MAX_DOCUMENT_BYTES)).ok, true);
  assert.deepEqual(classifyFile(file('m.xlsx', MAX_DOCUMENT_BYTES + 1)), { ok: false, reason: 'too_large' });
  assert.deepEqual(classifyFile(file('m.pdf', MAX_DOCUMENT_BYTES + 1)), { ok: false, reason: 'too_large' });
  // telefon surati 10 MB dan katta bo'lishi mumkin: brauzerda kichraytiriladi
  assert.deepEqual(classifyFile(file('foto.jpg', 15 * 1024 * 1024, 'image/jpeg')), { ok: true, kind: 'image' });
  assert.deepEqual(classifyFile(file('foto.jpg', MAX_IMAGE_SOURCE_BYTES + 1, 'image/jpeg')), { ok: false, reason: 'too_large' });
});

test('bo\'sh fayl rad etiladi', () => {
  assert.deepEqual(classifyFile(file('m.xlsx', 0)), { ok: false, reason: 'empty' });
});

test('FILE_ACCEPT: hujjatlar va rasm (telefonda galereya ham)', () => {
  for (const part of ['.xlsx', '.csv', '.txt', '.docx', '.pdf', 'image/*']) {
    assert.ok(FILE_ACCEPT.split(',').includes(part), part);
  }
});

test('formatBytes', () => {
  assert.equal(formatBytes(500), '1 KB');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(12 * 1024 * 1024 + 300 * 1024), '12,3 MB');
});
