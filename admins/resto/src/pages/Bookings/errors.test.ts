import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFailure, reservationFieldOf } from './errors.ts';
import { RESERVATIONS_URL, reservationUrl, reservationsUrl } from './urls.ts';

/** `ApiError` shakli: status, message va xom javob (problem) */
function apiError(status: number, message: string, problem?: Record<string, unknown>): Error {
  return Object.assign(new Error(message), { name: 'ApiError', status, problem });
}

test('readFailure: 409 slot_taken', () => {
  const failure = readFailure(apiError(409, "So'rov muvaffaqiyatsiz tugadi (409)", { code: 'slot_taken' }));
  assert.equal(failure.slotTaken, true);
  assert.equal(failure.status, 409);
  assert.equal(failure.code, 'slot_taken');
  assert.equal(failure.message, '', 'umumiy "(409)" matni server xabari deb ko\'rsatilmaydi');
});

test('readFailure: 409 (kod bo\'lmasa ham) va kod bo\'lsa status 200 emas ham band deb olinadi', () => {
  assert.equal(readFailure(apiError(409, 'Bu stol band', { error: 'Bu stol band' })).slotTaken, true);
  assert.equal(readFailure(apiError(400, 'x', { code: 'slot_taken' })).slotTaken, true);
  assert.equal(readFailure(apiError(400, 'x', { error: 'x' })).slotTaken, false);
});

test('readFailure: 400 {error, field} — xabar va maydon', () => {
  const failure = readFailure(apiError(400, 'Vaqt noto\'g\'ri', { error: 'Vaqt noto\'g\'ri', field: 'booking.slots[1].times[0]' }));
  assert.equal(failure.message, 'Vaqt noto\'g\'ri');
  assert.equal(failure.field, 'booking.slots[1].times[0]');
  assert.equal(failure.slotTaken, false);
  assert.equal(failure.forbidden, false);
});

test('readFailure: 403, tarmoq xatosi, begona qiymatlar', () => {
  assert.equal(readFailure(apiError(403, 'Bu amal sizning rolingiz uchun ruxsat etilmagan.', { detail: 'Bu amal sizning rolingiz uchun ruxsat etilmagan.' })).forbidden, true);
  const network = readFailure(new TypeError('Failed to fetch'));
  assert.equal(network.status, 0);
  assert.equal(network.message, '');
  assert.deepEqual(readFailure(null), { status: 0, message: '', field: '', code: '', slotTaken: false, forbidden: false });
  assert.deepEqual(readFailure('xato'), { status: 0, message: '', field: '', code: '', slotTaken: false, forbidden: false });
  assert.equal(readFailure(new Error('Oddiy xato')).message, 'Oddiy xato');
});

test('reservationFieldOf: server maydonlari forma maydoniga bog\'lanadi', () => {
  assert.equal(reservationFieldOf('table_id'), 'table');
  assert.equal(reservationFieldOf('guests'), 'guests');
  assert.equal(reservationFieldOf('customer_phone'), 'phone');
  assert.equal(reservationFieldOf(' Date '), 'date');
  assert.equal(reservationFieldOf('nomalum'), 'general');
  assert.equal(reservationFieldOf(''), 'general');
});

test('reservationsUrl: from/to majburiy, bo\'sh filtrlar yuborilmaydi', () => {
  assert.equal(reservationsUrl({ from: '2026-11-03', to: '2026-11-17' }), `${RESERVATIONS_URL}?from=2026-11-03&to=2026-11-17`);
  assert.equal(reservationsUrl({ from: 'a', to: 'b', status: 'all', q: '   ' }), `${RESERVATIONS_URL}?from=a&to=b`);
});

test('reservationsUrl: holat, qidiruv (kesilgan va kodlangan), stol', () => {
  const url = reservationsUrl({ from: '2026-11-03', to: '2026-11-03', status: 'pending', q: ' Ali +998 ', table: 7 });
  assert.equal(url, `${RESERVATIONS_URL}?from=2026-11-03&to=2026-11-03&status=pending&q=Ali+%2B998&table=7`);
  assert.equal(reservationsUrl({ from: 'a', to: 'b', table: 0 }), `${RESERVATIONS_URL}?from=a&to=b`);
  assert.equal(reservationsUrl({ from: 'a', to: 'b', table: 1.5 }), `${RESERVATIONS_URL}?from=a&to=b`);
});

test('reservationUrl', () => {
  assert.equal(reservationUrl(12), '/api/restaurant/admin/v1/reservations/12/');
});
