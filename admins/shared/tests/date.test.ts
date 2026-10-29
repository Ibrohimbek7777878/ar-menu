import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatHumanDateTime, UZ_MONTHS } from '../src/format/date.ts';

// "Hozir" = 2026-10-29 18:30 Toshkent (UTC+5) = 13:30 UTC
const NOW = '2026-10-29T13:30:00Z';

test('bugun: "bugun HH:MM" (Toshkent vaqti bilan)', () => {
  // 08:44:23 UTC = 13:44 Toshkent
  assert.equal(formatHumanDateTime('2026-10-29T08:44:23Z', { now: NOW }), 'bugun 13:44');
});

test('kecha: "kecha HH:MM"', () => {
  // 13:20 UTC = 18:20 Toshkent, 28-oktabr
  assert.equal(formatHumanDateTime('2026-10-28T13:20:00Z', { now: NOW }), 'kecha 18:20');
});

test('eski sana shu yilda: "26-sentabr" (vaqtsiz, kun nol bilan to\'ldirilmaydi)', () => {
  assert.equal(formatHumanDateTime('2026-09-26T09:59:00Z', { now: NOW }), '26-sentabr');
  assert.equal(formatHumanDateTime('2026-10-05T09:59:00Z', { now: NOW }), '5-oktabr');
});

test('boshqa yil: "26-sentabr 2025"', () => {
  assert.equal(formatHumanDateTime('2025-09-26T09:59:00Z', { now: NOW }), '26-sentabr 2025');
});

test('alwaysTime: eski sanada ham vaqt ko\'rsatiladi (chek uchun)', () => {
  assert.equal(
    formatHumanDateTime('2026-09-26T09:59:00Z', { now: NOW, alwaysTime: true }),
    '26-sentabr 14:59'
  );
  assert.equal(
    formatHumanDateTime('2025-01-02T00:05:00Z', { now: NOW, alwaysTime: true }),
    '2-yanvar 2025 05:05'
  );
  // bugun/kecha uchun alwaysTime hech narsani o'zgartirmaydi
  assert.equal(formatHumanDateTime('2026-10-29T08:44:00Z', { now: NOW, alwaysTime: true }), 'bugun 13:44');
});

test('kun chegarasi UTC emas, Toshkent bo\'yicha: 19:00 UTC = ertasi kun 00:00', () => {
  // Hozir: 2026-10-29 23:30 UTC = 30-oktabr 04:30 Toshkent
  const now = '2026-10-29T23:30:00Z';
  // 2026-10-29 19:30 UTC = 30-oktabr 00:30 Toshkent -> bugun
  assert.equal(formatHumanDateTime('2026-10-29T19:30:00Z', { now }), 'bugun 00:30');
  // 2026-10-29 18:59 UTC = 29-oktabr 23:59 Toshkent -> kecha
  assert.equal(formatHumanDateTime('2026-10-29T18:59:00Z', { now }), 'kecha 23:59');
});

test('yil chegarasi: 31-dekabr 19:00 UTC allaqachon yangi yil (Toshkent)', () => {
  const now = '2027-01-01T10:00:00Z'; // 1-yanvar 15:00 Toshkent
  assert.equal(formatHumanDateTime('2026-12-31T19:30:00Z', { now }), 'bugun 00:30');
  assert.equal(formatHumanDateTime('2026-12-30T10:00:00Z', { now }), '30-dekabr 2026');
});

test('Date, millisekund va ISO satr bir xil natija beradi', () => {
  const iso = '2026-10-29T08:44:23Z';
  const expected = 'bugun 13:44';
  assert.equal(formatHumanDateTime(iso, { now: NOW }), expected);
  assert.equal(formatHumanDateTime(new Date(iso), { now: new Date(NOW) }), expected);
  assert.equal(formatHumanDateTime(Date.parse(iso), { now: Date.parse(NOW) }), expected);
});

test('yaroqsiz yoki bo\'sh qiymat bo\'sh satr qaytaradi (yiqilmaydi)', () => {
  assert.equal(formatHumanDateTime(null, { now: NOW }), '');
  assert.equal(formatHumanDateTime(undefined, { now: NOW }), '');
  assert.equal(formatHumanDateTime('', { now: NOW }), '');
  assert.equal(formatHumanDateTime('bu sana emas', { now: NOW }), '');
  assert.equal(formatHumanDateTime('2026-10-29T08:44:00Z', { now: 'xato' }), '');
});

test('oy nomlari: 12 ta, kichik harf, lotin', () => {
  assert.equal(UZ_MONTHS.length, 12);
  assert.equal(UZ_MONTHS[0], 'yanvar');
  assert.equal(UZ_MONTHS[8], 'sentabr');
  assert.equal(UZ_MONTHS[11], 'dekabr');
  for (const m of UZ_MONTHS) assert.match(m, /^[a-z]+$/);
});

test('natijada eski "YYYY-MM-DD HH:MM" shakli uchramaydi', () => {
  for (const v of ['2026-10-29T08:44:23Z', '2026-09-26T09:59:00Z', '2025-09-26T09:59:00Z']) {
    assert.doesNotMatch(formatHumanDateTime(v, { now: NOW, alwaysTime: true }), /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  }
});
