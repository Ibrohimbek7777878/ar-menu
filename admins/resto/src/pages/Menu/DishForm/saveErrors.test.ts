import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import { readSaveError } from './saveErrors.ts';

const texts = {
  fallback: "Saqlab bo'lmadi",
  network: "Internet bilan aloqa yo'q",
  labels: { name: 'Taom nomi', price: 'Narx', prep_minutes: 'Tayyorlanish vaqti' },
};

/** `ApiError` ga o'xshash obyekt (apiClient: status + xom JSON `problem`). */
function apiError(status: number, body?: unknown) {
  return Object.assign(new Error(`So'rov muvaffaqiyatsiz tugadi (${status})`), { name: 'ApiError', status, problem: body });
}

test('{error, field}: xabar server javobidan olinadi (apiClient xabaridan emas) va maydonga bog\'lanadi', () => {
  const result = readSaveError(apiError(400, { error: 'Narx 0 dan 999999999999 gacha butun son bo\'lishi kerak', field: 'price' }), texts);
  assert.equal(result.field, 'price');
  assert.equal(result.message, "Narx 0 dan 999999999999 gacha butun son bo'lishi kerak");
  assert.equal(result.imageToken, false);
});

test('xom maydon nomi («prep_minutes») odam tilidagi nomga almashtiriladi', () => {
  const result = readSaveError(apiError(400, { error: '«prep_minutes» 0 dan 32767 gacha bo\'lishi kerak', field: 'prep_minutes' }), texts);
  assert.equal(result.field, 'prepMinutes');
  assert.equal(result.message, "«Tayyorlanish vaqti» 0 dan 32767 gacha bo'lishi kerak");
});

test('noma\'lum xom nom o\'zgarishsiz qoladi', () => {
  const result = readSaveError(apiError(400, { error: '«ar_model» noto\'g\'ri', field: 'ar_model' }), texts);
  assert.equal(result.field, 'general');
  assert.match(result.message, /«ar_model»/);
});

test('rasm kodi xatosi alohida belgilanadi (fayl bilan qayta urinish uchun)', () => {
  const result = readSaveError(apiError(400, { error: 'Rasm tokeni yaroqsiz', field: 'image_token' }), texts);
  assert.equal(result.field, 'image');
  assert.equal(result.imageToken, true);
});

test('nom, kategoriya, tavsif va tarjima maydonlari to\'g\'ri joyga yo\'naltiriladi', () => {
  const field = (serverField: string) => readSaveError(apiError(400, { error: 'x', field: serverField }), texts).field;
  assert.equal(field('name'), 'name');
  assert.equal(field('category_id'), 'category');
  assert.equal(field('description'), 'description');
  assert.equal(field('name_ru'), 'translations');
  assert.equal(field('description_en'), 'translations');
  assert.equal(field('image'), 'image');
  assert.equal(field('boshqa'), 'general');
});

test('{error, detail} (maydonsiz): umumiy xato', () => {
  const result = readSaveError(apiError(400, { error: 'Rasm hajmi katta', detail: 'Rasm hajmi katta' }), texts);
  assert.equal(result.field, 'general');
  assert.equal(result.message, 'Rasm hajmi katta');
});

test('faqat detail kelsa (DRF standart javobi) u ishlatiladi', () => {
  assert.equal(readSaveError(apiError(403, { detail: 'Ruxsat yo\'q' }), texts).message, "Ruxsat yo'q");
});

test('server xabar bermagan bo\'lsa umumiy xabar, javob umuman kelmagan bo\'lsa tarmoq xabari', () => {
  assert.equal(readSaveError(apiError(500), texts).message, "Saqlab bo'lmadi");
  assert.equal(readSaveError(new TypeError('Failed to fetch'), texts).message, "Internet bilan aloqa yo'q");
  assert.equal(readSaveError(undefined, texts).message, "Internet bilan aloqa yo'q");
});

test('uz.ts dagi haqiqiy yorliqlar xom nomlarning hammasini qoplaydi', () => {
  const labels = restoUz.dishForm.errorLabels as Record<string, string>;
  for (const key of ['name', 'price', 'prep_minutes', 'category_id', 'description', 'name_ru', 'name_en', 'description_ru', 'description_en', 'image_token']) {
    assert.ok(labels[key], `errorLabels.${key} yo'q`);
  }
});
