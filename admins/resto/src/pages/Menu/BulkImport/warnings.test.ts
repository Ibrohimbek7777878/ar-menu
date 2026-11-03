import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import { WARNING_ORDER } from './rows.ts';
import { WARNING_SEVERITY, countAttention, isWarningCode, rowTone, warningSeverity, warningText, warningTexts } from './warnings.ts';
import type { WarningCode } from './types.ts';

const texts = restoUz.bulkImport.warnings;
const ALL_CODES = Object.keys(WARNING_SEVERITY) as WarningCode[];

test('har bir ogohlantirish kodi uchun odam tilida matn bor (xom kod ko\'rinmaydi)', () => {
  for (const code of ALL_CODES) {
    const text = warningText(code, texts);
    assert.ok(text.length > 3, `${code} uchun matn yo'q`);
    assert.notEqual(text, code);
    assert.doesNotMatch(text, /_/, `${code} matnida xom kod bor`);
  }
});

test('kodlar ro\'yxati bir xil: jiddiylik jadvali, tartib va matnlar', () => {
  assert.deepEqual([...WARNING_ORDER].sort(), [...ALL_CODES].sort());
  assert.deepEqual(Object.keys(texts).sort(), [...ALL_CODES].sort());
});

test('shartnomadagi matnlar: ogohlantirish ma\'nolari', () => {
  assert.match(warningText('price_missing', texts), /Narx topilmadi/);
  assert.match(warningText('price_small', texts), /ming/);
  assert.match(warningText('name_exists', texts), /shunday nom bor/);
  assert.match(warningText('duplicate_in_file', texts), /Takror/);
  assert.match(warningText('category_new', texts), /Yangi bo'lim/);
  assert.match(warningText('low_confidence', texts), /Ishonchsiz/);
});

test('noma\'lum kod matn bermaydi', () => {
  assert.equal(warningText('something_new', texts), '');
  assert.equal(warningText('__proto__', texts), '');
  assert.equal(isWarningCode('constructor'), false);
  assert.equal(isWarningCode('price_small'), true);
  assert.deepEqual(warningTexts(['price_small', 'nope', 'price_small'], texts), [texts.price_small]);
});

test('jiddiylik: narx yo\'q xato, bo\'lim yangi faqat ma\'lumot', () => {
  assert.equal(warningSeverity('price_missing'), 'error');
  assert.equal(warningSeverity('price_small'), 'warn');
  assert.equal(warningSeverity('name_exists'), 'warn');
  assert.equal(warningSeverity('category_new'), 'info');
});

test('qator rangi: xira / qizil / sariq / oddiy', () => {
  assert.equal(rowTone(['price_missing', 'price_small'], true), 'error');
  assert.equal(rowTone(['price_small'], true), 'warn');
  assert.equal(rowTone(['category_new'], true), 'ok');
  assert.equal(rowTone([], true), 'ok');
  assert.equal(rowTone(['price_missing'], false), 'muted');
});

test('countAttention: faqat xato va ogohlantirish, faqat ma\'lumot hisoblanmaydi', () => {
  assert.equal(
    countAttention([
      { include: true, warnings: [] },
      { include: true, warnings: ['category_new'] },
      { include: true, warnings: ['price_small'] },
      { include: true, warnings: ['price_missing'] },
      { include: false, warnings: ['price_missing'] },
    ]),
    2,
  );
});
