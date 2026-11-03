import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPayload,
  emptyForm,
  exceedsCapacity,
  formFromReservation,
  hasErrors,
  isFormDirty,
  isPastTime,
  nearestFreeTime,
  patchPayload,
  takenTimes,
  validateForm,
} from './reservationForm.ts';
import type { ReservationForm } from './reservationForm.ts';
import type { Reservation } from './types.ts';

const TODAY = '2026-11-03';

function reservation(patch: Partial<Reservation> = {}): Reservation {
  return {
    id: 5,
    public_code: 'GS-AB12',
    table: { id: 3, number: '12', hall: 'Terasa' },
    customer_name: 'Ali Valiyev',
    customer_phone: '+998901234567',
    guests_count: 4,
    reservation_date: '2026-11-05',
    reservation_time: '19:30',
    duration_minutes: 120,
    event_type: 'birthday',
    event_label: "Tug'ilgan kun",
    notes: 'Tort bor',
    status: 'confirmed',
    status_display: '',
    source: 'guest',
    created_at: '2026-11-01T10:00:00Z',
    ...patch,
  };
}

function valid(patch: Partial<ReservationForm> = {}): ReservationForm {
  return { ...emptyForm({ date: '2026-11-05', time: '19:30' }), table_id: '3', name: 'Ali Valiyev', phone: '+998 90 123 45 67', ...patch };
}

test('emptyForm: bugungi sana, 2 mehmon, tadbirsiz, darhol tasdiqlansin', () => {
  const form = emptyForm({ date: TODAY });
  assert.deepEqual(form, { table_id: '', date: TODAY, time: '', guests: '2', name: '', phone: '', event_type: 'none', notes: '', confirmNow: true });
});

test('validateForm (yangi): bo\'sh forma — barcha majburiy maydonlar', () => {
  const errors = validateForm(emptyForm({ date: TODAY }), { mode: 'create', today: TODAY });
  assert.deepEqual(errors, { table: 'table_required', time: 'time_invalid', name: 'name_short', phone: 'phone_invalid' });
});

test('validateForm: to\'g\'ri forma — xato yo\'q', () => {
  assert.deepEqual(validateForm(valid(), { mode: 'create', today: TODAY }), {});
  assert.equal(hasErrors({}), false);
  assert.equal(hasErrors({ name: 'name_short' }), true);
});

test('validateForm: sana (yaroqsiz, o\'tmish) — yangi bronda bugun mumkin, kecha mumkin emas', () => {
  assert.equal(validateForm(valid({ date: '2026-11-03' }), { mode: 'create', today: TODAY }).date, undefined);
  assert.equal(validateForm(valid({ date: '2026-11-02' }), { mode: 'create', today: TODAY }).date, 'date_past');
  assert.equal(validateForm(valid({ date: '2026-02-30' }), { mode: 'create', today: TODAY }).date, 'date_invalid');
  assert.equal(validateForm(valid({ date: '' }), { mode: 'create', today: TODAY }).date, 'date_invalid');
});

test('validateForm (tahrir): o\'tgan sana faqat o\'zgartirilgan bo\'lsa xato', () => {
  const original = reservation({ reservation_date: '2026-11-01' });
  const same = valid({ date: '2026-11-01' });
  assert.equal(validateForm(same, { mode: 'edit', today: TODAY, original }).date, undefined);
  assert.equal(validateForm(valid({ date: '2026-10-30' }), { mode: 'edit', today: TODAY, original }).date, 'date_past');
});

test('validateForm: vaqt (24:00 yaroqsiz), mehmonlar, ism, telefon, izoh', () => {
  const ctx = { mode: 'create', today: TODAY } as const;
  assert.equal(validateForm(valid({ time: '24:00' }), ctx).time, 'time_invalid');
  assert.equal(validateForm(valid({ time: '9:05' }), ctx).time, undefined);
  for (const guests of ['0', '-1', '1.5', 'x', '', '501']) assert.equal(validateForm(valid({ guests }), ctx).guests, 'guests_range', guests);
  for (const guests of ['1', '40', '500']) assert.equal(validateForm(valid({ guests }), ctx).guests, undefined, guests);
  assert.equal(validateForm(valid({ name: ' A ' }), ctx).name, 'name_short');
  assert.equal(validateForm(valid({ name: 'x'.repeat(121) }), ctx).name, 'name_long');
  assert.equal(validateForm(valid({ phone: '12345' }), ctx).phone, 'phone_invalid');
  assert.equal(validateForm(valid({ phone: '1'.repeat(16) }), ctx).phone, 'phone_invalid');
  assert.equal(validateForm(valid({ phone: '90 123-45-67' }), ctx).phone, undefined);
  assert.equal(validateForm(valid({ notes: 'x'.repeat(501) }), ctx).notes, 'notes_long');
});

test('validateForm (tahrir): stol bo\'lmagan bronda stol majburiy emas, bor bronda majburiy', () => {
  const noTable = reservation({ table: null });
  const form = formFromReservation(noTable);
  assert.equal(validateForm(form, { mode: 'edit', today: TODAY, original: noTable }).table, undefined);
  const withTable = reservation();
  assert.equal(validateForm({ ...formFromReservation(withTable), table_id: '' }, { mode: 'edit', today: TODAY, original: withTable }).table, 'table_required');
});

test('createPayload: toza ma\'lumot, darhol tasdiqlash holati', () => {
  const payload = createPayload(valid({ name: '  Ali   Valiyev ', time: '9:05', notes: ' tort ', guests: '4' }));
  assert.deepEqual(payload, {
    table_id: 3,
    date: '2026-11-05',
    time: '09:05',
    guests: 4,
    name: 'Ali Valiyev',
    phone: '+998 90 123 45 67',
    event_type: 'none',
    notes: 'tort',
    status: 'confirmed',
  });
  assert.equal('status' in createPayload(valid({ confirmNow: false })), false);
});

test('patchPayload: faqat o\'zgargan maydonlar', () => {
  const original = reservation();
  const form = formFromReservation(original);
  assert.deepEqual(patchPayload(original, form), {});
  assert.deepEqual(patchPayload(original, { ...form, guests: '6', notes: 'Tort va gul' }), { guests: 6, notes: 'Tort va gul' });
  assert.deepEqual(patchPayload(original, { ...form, table_id: '8', date: '2026-11-06', time: '20:00' }), { table_id: 8, date: '2026-11-06', time: '20:00' });
  assert.deepEqual(patchPayload(original, { ...form, name: ' Ali  Valiyev ', phone: ' +998901234567 ', notes: ' Tort bor ' }), {}, 'bo\'sh joylar farq emas');
  assert.deepEqual(patchPayload(original, { ...form, event_type: 'none', notes: '' }), { event_type: 'none', notes: '' }, 'izohni tozalash ham o\'zgarish');
});

test('patchPayload: server soniyali vaqt bergan bo\'lsa ham o\'zgarish deb hisoblanmaydi; stolsiz bronga stol biriktirish', () => {
  const original = reservation({ reservation_time: '19:30:00' });
  assert.deepEqual(patchPayload(original, formFromReservation(original)), {});
  const noTable = reservation({ table: null });
  assert.deepEqual(patchPayload(noTable, { ...formFromReservation(noTable), table_id: '4' }), { table_id: 4 });
  assert.deepEqual(patchPayload(noTable, formFromReservation(noTable)), {});
});

test('isFormDirty: bo\'sh joylar o\'zgarish emas', () => {
  const initial = valid();
  assert.equal(isFormDirty(initial, { ...initial }), false);
  assert.equal(isFormDirty(initial, { ...initial, name: '  Ali   Valiyev ', time: '19:30' }), false);
  assert.equal(isFormDirty(initial, { ...initial, notes: 'x' }), true);
  assert.equal(isFormDirty(initial, { ...initial, confirmNow: false }), true);
});

test('exceedsCapacity: noma\'lum sig\'im ogohlantirmaydi', () => {
  assert.equal(exceedsCapacity('5', 4), true);
  assert.equal(exceedsCapacity('4', 4), false);
  assert.equal(exceedsCapacity('5', null), false);
  assert.equal(exceedsCapacity('5', 0), false);
  assert.equal(exceedsCapacity('x', 4), false);
});

// ─── to'qnashuvsiz holat ───

const booked = (id: number, time: string, patch: Partial<Reservation> = {}) =>
  reservation({ id, reservation_date: '2026-11-05', reservation_time: time, table: { id: 3, number: '12', hall: '' }, ...patch });

test('takenTimes: band vaqtlar (davomiylik bilan), tahrirda o\'zi hisobga olinmaydi', () => {
  const rows = [booked(1, '19:30')]; // 19:30–21:30
  const times = ['12:30', '19:30', '20:00', '21:30', '22:00'];
  const query = { tableId: 3, date: '2026-11-05', times, duration: 120 };
  assert.deepEqual([...takenTimes(rows, query)], ['19:30', '20:00']);
  assert.deepEqual([...takenTimes(rows, { ...query, excludeId: 1 })], []);
  assert.deepEqual([...takenTimes(rows, { ...query, tableId: 9 })], []);
  assert.deepEqual([...takenTimes([], query)], []);
});

test('nearestFreeTime: eng yaqin bo\'sh; teng uzoqlikda oldingisi; hammasi band — null', () => {
  const times = ['12:30', '13:00', '13:30', '19:30', '20:00', '20:30'];
  assert.equal(nearestFreeTime(times, new Set(['19:30']), '19:30'), '20:00');
  assert.equal(nearestFreeTime(times, new Set(['19:30', '20:00']), '19:30'), '20:30');
  assert.equal(nearestFreeTime(['19:00', '20:00'], new Set(), '19:30'), '19:00', 'teng uzoqlikda oldingisi');
  assert.equal(nearestFreeTime(times, new Set(times), '19:30'), null);
  assert.equal(nearestFreeTime([], new Set(), '19:30'), null);
  assert.equal(nearestFreeTime(times, new Set(), ''), '12:30', 'vaqt tanlanmagan — birinchi bo\'sh');
});

test('isPastTime: faqat bugun uchun, 15 daqiqa kechikish bilan', () => {
  const now = 19 * 60 + 40; // 19:40
  assert.equal(isPastTime(TODAY, '19:20', TODAY, now), true, '19:25 dan eski — o\'tgan');
  assert.equal(isPastTime(TODAY, '19:24', TODAY, now), true);
  assert.equal(isPastTime(TODAY, '19:25', TODAY, now), false, 'aynan 15 daqiqa kechikish — hali o\'tmagan');
  assert.equal(isPastTime(TODAY, '21:00', TODAY, now), false);
  assert.equal(isPastTime('2026-11-04', '08:00', TODAY, now), false);
  assert.equal(isPastTime('2026-11-02', '23:00', TODAY, now), true);
  assert.equal(isPastTime(TODAY, 'xato', TODAY, now), false);
});
