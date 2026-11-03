import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import type { FailureKind } from './errors.ts';

const walk = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walk(v, out));
  return out;
};

const bulkTexts = walk(restoUz.bulkImport);
const settingsTexts = walk([
  restoUz.settingsPage.menuImportTitle,
  restoUz.settingsPage.menuImportAiLabel,
  restoUz.settingsPage.menuImportAiHint,
  restoUz.settingsPage.menuImportAiOptions,
]);

test('ommaviy qo\'shish matnlarida texnik so\'zlar ko\'rinmaydi', () => {
  const jargon = /\b(parse|parsing|token|batch|commit|submission|payload|endpoint|json|api|ocr|row_id|mode)\b/i;
  for (const text of [...bulkTexts, ...settingsTexts]) {
    assert.doesNotMatch(text, jargon, `"${text}" ichida texnik so'z bor`);
    assert.doesNotMatch(text, /\b(csv|kds|slug)\b/i, `"${text}" ichida taqiqlangan so'z bor`);
  }
});

test('ommaviy qo\'shish matnlari bo\'sh emas', () => {
  assert.ok(bulkTexts.length > 100);
  for (const text of bulkTexts) assert.ok(text.trim().length > 0);
});

test('xato matnlari: barcha xato turlari uchun matn bor', () => {
  const kinds: FailureKind[] = [
    'network', 'aborted', 'too_large', 'unsupported', 'nothing', 'rate_limited',
    'ai_unavailable', 'forbidden', 'not_found', 'invalid', 'server', 'other',
  ];
  assert.deepEqual(Object.keys(restoUz.bulkImport.failures).sort(), [...kinds].sort());
});

test('talab qilingan asosiy matnlar', () => {
  const t = restoUz.bulkImport;
  assert.equal(t.openButton, "Ommaviy qo'shish");
  assert.equal(t.done.undo, 'Oxirgi importni qaytarish');
  assert.equal(t.images.empty, 'Hech narsa topilmadi — boshqa nom yozing');
  assert.match(t.images.down, /Internet qidiruvi hozir ishlamayapti/);
  assert.equal(t.done.goToMenu, "Menyuga o'tish");
  assert.equal(restoUz.settingsPage.menuImportAiLabel, "Menyuni AI orqali o'qish");
  assert.match(restoUz.settingsPage.menuImportAiHint, /uchinchi tomonga yuborilmaydi/);
  assert.match(restoUz.settingsPage.menuImportAiHint, /lokal usullar/);
});

test('ko\'rsatma matni: nimalar o\'qiladi va nimalar yo\'q, qanday tuzatish', () => {
  const input = restoUz.bulkImport.input;
  for (const word of ['.xlsx', '.docx', 'PDF', '.txt']) assert.ok(input.helpSupported.includes(word), word);
  for (const word of ['.xls', '.doc', '.sdocx']) assert.ok(input.helpNotSupported.includes(word), word);
  const tips = input.helpTips.join(' ');
  assert.match(tips, /Boshqacha saqlash/);
  assert.match(tips, /Samsung Notes/);
  assert.match(tips, /Ulashish/);
  assert.match(tips, /Nusxa olish/);
});
