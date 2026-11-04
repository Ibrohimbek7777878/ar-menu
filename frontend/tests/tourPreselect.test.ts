import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePreselect, resolvePreselect } from '../src/pages/BookingPage/preselect.ts';
import type { BookingHall } from '../src/pages/BookingPage/types.ts';
import { bookingPathForTable } from '../src/pages/TourPage/paths.ts';

const table = (id: number) => ({ id, number: String(id), capacity: 4, shape: 'round', x: 1, y: 1, w: 10, h: 10 });
const HALLS: BookingHall[] = [
  { id: 10, name: 'Asosiy', tables: [table(1), table(2)] },
  { id: 20, name: 'Terrasa', tables: [table(3)] },
];

test('parsePreselect: ?table=ID&from=tour', () => {
  assert.deepEqual(parsePreselect('?table=3&from=tour'), { tableId: 3, fromTour: true });
  assert.deepEqual(parsePreselect('table=12'), { tableId: 12, fromTour: false });
  assert.deepEqual(parsePreselect('?from=tour'), { tableId: null, fromTour: true });
  assert.deepEqual(parsePreselect(''), { tableId: null, fromTour: false });
  assert.deepEqual(parsePreselect('?from=menu&table=2'), { tableId: 2, fromTour: false });
});

test('parsePreselect: noto\'g\'ri stol id\'si e\'tiborsiz (mavjud oqim buzilmaydi)', () => {
  for (const bad of ['?table=0', '?table=-3', '?table=1.5', '?table=abc', '?table=', '?table=1e3', '?table=12345678901', '?table=%20', '?table=3;DROP', '?table=0x10']) {
    assert.equal(parsePreselect(bad).tableId, null, bad);
  }
  assert.equal(parsePreselect('?table= 7 ').tableId, 7);
  // UUID (stol QR tokeni) bron stoli emas
  assert.equal(parsePreselect('?table=0b9c0f56-3c1e-4b8a-9d0e-1a2b3c4d5e6f').tableId, null);
});

test('parsePreselect + bookingPathForTable: sayr havolasi aylanib keladi', () => {
  const path = bookingPathForTable(42);
  assert.deepEqual(parsePreselect(path.slice(path.indexOf('?'))), { tableId: 42, fromTour: true });
});

test('resolvePreselect: stol yo\'q -> missing; holat yuklanmagan -> pending', () => {
  assert.deepEqual(resolvePreselect(99, HALLS, new Map()), { kind: 'missing' });
  assert.deepEqual(resolvePreselect(1, [], new Map()), { kind: 'missing' });
  assert.deepEqual(resolvePreselect(3, HALLS, new Map()), { kind: 'pending', hallId: 20 });
});

test('resolvePreselect: bo\'sh -> open (zal bilan), band/mos emas/o\'tgan/yopiq -> unavailable', () => {
  const states = new Map<number, { state: 'free' | 'busy' | 'past' | 'closed' | 'too_small' }>([
    [1, { state: 'free' }], [2, { state: 'busy' }], [3, { state: 'too_small' }],
  ]);
  assert.deepEqual(resolvePreselect(1, HALLS, states), { kind: 'open', hallId: 10 });
  assert.deepEqual(resolvePreselect(2, HALLS, states), { kind: 'unavailable', hallId: 10, state: 'busy' });
  assert.deepEqual(resolvePreselect(3, HALLS, states), { kind: 'unavailable', hallId: 20, state: 'too_small' });
  states.set(2, { state: 'past' });
  assert.equal(resolvePreselect(2, HALLS, states).kind, 'unavailable');
  states.set(2, { state: 'closed' });
  assert.equal(resolvePreselect(2, HALLS, states).kind, 'unavailable');
});
