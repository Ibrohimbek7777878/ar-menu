import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countByFilter,
  countsAsBooked,
  filterByDate,
  filterByStatus,
  findConflicts,
  groupByDate,
  normalizeReservation,
  phoneHref,
  reservationsFromResponse,
  sortReservations,
  summarizeByDate,
  todayStats,
} from './reservationsView.ts';
import type { Reservation } from './types.ts';

function row(patch: Partial<Reservation> & { id: number }): Reservation {
  return {
    public_code: `GS-${patch.id}`,
    table: { id: 1, number: '1', hall: 'Asosiy zal' },
    customer_name: 'Ali Valiyev',
    customer_phone: '+998901234567',
    guests_count: 2,
    reservation_date: '2026-11-03',
    reservation_time: '19:30',
    duration_minutes: 120,
    event_type: 'none',
    event_label: '',
    notes: '',
    status: 'pending',
    status_display: '',
    source: 'guest',
    created_at: '2026-11-01T10:00:00Z',
    ...patch,
  };
}

test('normalizeReservation: shartnoma ob\'ekti o\'qiladi, soniyali vaqt "SS:DD" ga keladi', () => {
  const parsed = normalizeReservation({
    id: 7,
    public_code: 'GS-AB12',
    table: { id: 3, number: '12', hall: 'Terasa' },
    customer_name: 'Ali',
    customer_phone: '+998901234567',
    guests_count: 4,
    reservation_date: '2026-11-05',
    reservation_time: '19:30:00',
    duration_minutes: 90,
    event_type: 'birthday',
    event_label: "Tug'ilgan kun",
    notes: 'Tort bor',
    status: 'confirmed',
    source: 'guest',
    created_at: '2026-11-01T10:00:00Z',
  });
  assert.ok(parsed);
  assert.equal(parsed.reservation_time, '19:30');
  assert.deepEqual(parsed.table, { id: 3, number: '12', hall: 'Terasa' });
  assert.equal(parsed.duration_minutes, 90);
  assert.equal(parsed.event_label, "Tug'ilgan kun");
});

test('normalizeReservation: kam maydonli/begona shakl yiqitmaydi; id yo\'q — null', () => {
  assert.equal(normalizeReservation(null), null);
  assert.equal(normalizeReservation('x'), null);
  assert.equal(normalizeReservation({ customer_name: 'Ali' }), null);
  const minimal = normalizeReservation({ id: '9', table: null, guests_count: 0, duration_minutes: -5, event_type: '' });
  assert.ok(minimal);
  assert.equal(minimal.id, 9);
  assert.equal(minimal.table, null);
  assert.equal(minimal.guests_count, 1);
  assert.equal(minimal.duration_minutes, 120);
  assert.equal(minimal.event_type, 'none');
  assert.equal(minimal.customer_name, '');
});

test('normalizeReservation: zal nomi satr, {name} yoki hall_name bo\'lib kelishi mumkin; stol raqami son bo\'lsa ham', () => {
  assert.equal(normalizeReservation({ id: 1, table: { id: 2, number: 5, hall: { id: 1, name: 'VIP' } } })?.table?.hall, 'VIP');
  assert.equal(normalizeReservation({ id: 1, table: { id: 2, number: 5, hall_name: 'Terasa' } })?.table?.hall, 'Terasa');
  assert.equal(normalizeReservation({ id: 1, table: { id: 2, number: 5 } })?.table?.number, '5');
  assert.equal(normalizeReservation({ id: 1, table: { number: 5 } })?.table, null);
});

test('reservationsFromResponse: {count, results}, oddiy massiv, axlat', () => {
  assert.equal(reservationsFromResponse({ count: 2, results: [{ id: 1 }, { id: 2 }, { nomalum: 1 }, null] }).length, 2);
  assert.equal(reservationsFromResponse([{ id: 1 }]).length, 1);
  assert.deepEqual(reservationsFromResponse(null), []);
  assert.deepEqual(reservationsFromResponse({ count: 0 }), []);
  assert.deepEqual(reservationsFromResponse('x'), []);
});

test('sortReservations: sana, vaqt, id; asl ro\'yxat o\'zgarmaydi', () => {
  const rows = [
    row({ id: 3, reservation_time: '20:00' }),
    row({ id: 1, reservation_time: '9:05' }),
    row({ id: 2, reservation_date: '2026-11-02', reservation_time: '23:00' }),
    row({ id: 4, reservation_time: '20:00' }),
  ];
  const sorted = sortReservations(rows);
  assert.deepEqual(sorted.map((r) => r.id), [2, 1, 3, 4]);
  assert.deepEqual(rows.map((r) => r.id), [3, 1, 2, 4]);
});

test('filtrlar va sonlar: holat chiplari ("seated" Keldi ga kiradi)', () => {
  const rows = [
    row({ id: 1, status: 'pending' }),
    row({ id: 2, status: 'confirmed' }),
    row({ id: 3, status: 'arrived' }),
    row({ id: 4, status: 'seated' }),
    row({ id: 5, status: 'cancelled' }),
    row({ id: 6, status: 'no_show' }),
    row({ id: 7, status: 'completed' }),
    row({ id: 8, status: 'qandaydir' }),
  ];
  assert.deepEqual(countByFilter(rows), { all: 8, pending: 1, confirmed: 1, arrived: 2, completed: 1, no_show: 1, cancelled: 1 });
  assert.deepEqual(filterByStatus(rows, 'arrived').map((r) => r.id), [3, 4]);
  assert.equal(filterByStatus(rows, 'all').length, 8);
  assert.deepEqual(countByFilter([]), { all: 0, pending: 0, confirmed: 0, arrived: 0, completed: 0, no_show: 0, cancelled: 0 });
});

test('filterByDate', () => {
  const rows = [row({ id: 1 }), row({ id: 2, reservation_date: '2026-11-04' })];
  assert.deepEqual(filterByDate(rows, '2026-11-04').map((r) => r.id), [2]);
  assert.deepEqual(filterByDate(rows, '2026-12-01'), []);
});

test('kunlar lentasi sonlari: bekor qilingan va kelmaganlar hisobga olinmaydi; kutayotganlar alohida', () => {
  const rows = [
    row({ id: 1, status: 'pending' }),
    row({ id: 2, status: 'confirmed' }),
    row({ id: 3, status: 'cancelled' }),
    row({ id: 4, status: 'no_show' }),
    row({ id: 5, reservation_date: '2026-11-04', status: 'pending' }),
    row({ id: 6, reservation_date: '2026-11-05', status: 'cancelled' }),
  ];
  const summary = summarizeByDate(rows);
  assert.deepEqual(summary.get('2026-11-03'), { total: 2, pending: 1 });
  assert.deepEqual(summary.get('2026-11-04'), { total: 1, pending: 1 });
  assert.equal(summary.has('2026-11-05'), false);
  assert.equal(countsAsBooked('completed'), true);
  assert.equal(countsAsBooked('cancelled'), false);
});

test('todayStats: faqat bugun; jami (bekorsiz), kutilmoqda, tasdiqlangan', () => {
  const rows = [
    row({ id: 1, status: 'pending' }),
    row({ id: 2, status: 'pending' }),
    row({ id: 3, status: 'confirmed' }),
    row({ id: 4, status: 'arrived' }),
    row({ id: 5, status: 'cancelled' }),
    row({ id: 6, reservation_date: '2026-11-04', status: 'confirmed' }),
  ];
  assert.deepEqual(todayStats(rows, '2026-11-03'), { total: 4, pending: 2, confirmed: 1 });
  assert.deepEqual(todayStats([], '2026-11-03'), { total: 0, pending: 0, confirmed: 0 });
});

test('groupByDate: ketma-ket sanalar', () => {
  const rows = sortReservations([row({ id: 1 }), row({ id: 2, reservation_date: '2026-11-04' }), row({ id: 3 })]);
  const groups = groupByDate(rows);
  assert.deepEqual(groups.map((g) => [g.date, g.rows.map((r) => r.id)]), [['2026-11-03', [1, 3]], ['2026-11-04', [2]]]);
  assert.deepEqual(groupByDate([]), []);
});

// ─── to'qnashuv ───

const base = { tableId: 1, date: '2026-11-03', duration: 120 };

test('findConflicts: bir stol, kesishuvchi oraliq (davomiylik bo\'yicha)', () => {
  const rows = [row({ id: 1, reservation_time: '19:30' })]; // 19:30–21:30
  assert.equal(findConflicts(rows, { ...base, time: '19:30' }).length, 1);
  assert.equal(findConflicts(rows, { ...base, time: '18:00' }).length, 1, '18:00–20:00 kesishadi');
  assert.equal(findConflicts(rows, { ...base, time: '21:00' }).length, 1);
  assert.equal(findConflicts(rows, { ...base, time: '21:29' }).length, 1);
});

test('findConflicts: chegaradagi uchrashuv to\'qnashuv emas ([a, b) yarim ochiq)', () => {
  const rows = [row({ id: 1, reservation_time: '19:30' })]; // 19:30–21:30
  assert.equal(findConflicts(rows, { ...base, time: '21:30' }).length, 0, 'boshlanishi = oldingining tugashi');
  assert.equal(findConflicts(rows, { ...base, time: '17:30' }).length, 0, 'tugashi = oldingining boshlanishi');
  assert.equal(findConflicts(rows, { ...base, time: '17:31' }).length, 1);
});

test('findConflicts: boshqa stol, boshqa kun, nofaol holat, o\'zi e\'tiborga olinmaydi', () => {
  const rows = [
    row({ id: 1, reservation_time: '19:30' }),
    row({ id: 2, reservation_time: '19:30', table: { id: 2, number: '2', hall: '' } }),
    row({ id: 3, reservation_time: '19:30', reservation_date: '2026-11-04' }),
    row({ id: 4, reservation_time: '19:30', status: 'cancelled' }),
    row({ id: 5, reservation_time: '19:30', status: 'no_show' }),
    row({ id: 6, reservation_time: '19:30', status: 'completed' }),
    row({ id: 7, reservation_time: '19:30', table: null }),
  ];
  assert.deepEqual(findConflicts(rows, { ...base, time: '19:30' }).map((r) => r.id), [1]);
  assert.deepEqual(findConflicts(rows, { ...base, time: '19:30', excludeId: 1 }), [], 'tahrirda bron o\'zi bilan to\'qnashmaydi');
  assert.deepEqual(findConflicts(rows, { ...base, tableId: 2, time: '19:30' }).map((r) => r.id), [2]);
});

test('findConflicts: qisqa davomiylik, yaroqsiz vaqt', () => {
  const rows = [row({ id: 1, reservation_time: '19:30', duration_minutes: 60 })]; // 19:30–20:30
  assert.equal(findConflicts(rows, { ...base, time: '20:30', duration: 60 }).length, 0);
  assert.equal(findConflicts(rows, { ...base, time: '18:30', duration: 60 }).length, 0);
  assert.equal(findConflicts(rows, { ...base, time: '18:31', duration: 60 }).length, 1);
  assert.deepEqual(findConflicts(rows, { ...base, time: 'xato' }), []);
  assert.deepEqual(findConflicts(rows, { ...base, time: '' }), []);
});

test('phoneHref: raqamli havola', () => {
  assert.equal(phoneHref('+998 90 123-45-67'), 'tel:+998901234567');
  assert.equal(phoneHref('90 123 45 67'), 'tel:901234567');
  assert.equal(phoneHref('12'), null);
  assert.equal(phoneHref(''), null);
});
