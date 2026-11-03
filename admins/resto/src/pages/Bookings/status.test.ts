import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KNOWN_STATUSES,
  STATUS_FILTERS,
  actionsFor,
  filterOf,
  isActiveStatus,
  isEditable,
  isKnownStatus,
  matchesFilter,
  sourceKind,
  toneOf,
} from './status.ts';
import { bookingsRoute } from './route.ts';

test('bookingsRoute: yo\'l va ruxsat', () => {
  assert.equal(bookingsRoute.path, 'bookings');
  assert.equal(bookingsRoute.capability, 'reservations');
});

test('holatlar: shartnomadagi oltita + eski "seated"', () => {
  for (const status of ['pending', 'confirmed', 'arrived', 'no_show', 'completed', 'cancelled', 'seated']) {
    assert.ok(isKnownStatus(status), status);
  }
  assert.equal(KNOWN_STATUSES.length, 7);
  assert.equal(isKnownStatus('nomalum'), false);
  assert.equal(isKnownStatus(undefined), false);
});

test('faol holatlar stolni band qiladi: yakunlangan, bekor va kelmagan band qilmaydi', () => {
  for (const status of ['pending', 'confirmed', 'arrived', 'seated']) assert.equal(isActiveStatus(status), true, status);
  for (const status of ['completed', 'cancelled', 'no_show', '', 'x']) assert.equal(isActiveStatus(status), false, status);
  assert.equal(isEditable('pending'), true);
  assert.equal(isEditable('cancelled'), false);
});

test('filtr: "seated" Keldi chipiga kiradi, noma\'lum holat faqat Barchasi da', () => {
  assert.equal(filterOf('seated'), 'arrived');
  assert.equal(filterOf('pending'), 'pending');
  assert.equal(filterOf('no_show'), 'no_show');
  assert.equal(filterOf('xyz'), null);
  assert.equal(matchesFilter('seated', 'arrived'), true);
  assert.equal(matchesFilter('xyz', 'all'), true);
  assert.equal(matchesFilter('xyz', 'pending'), false);
  assert.equal(matchesFilter('pending', 'confirmed'), false);
  assert.deepEqual(STATUS_FILTERS, ['all', 'pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled']);
});

test('ranglar: holat tonlari', () => {
  assert.equal(toneOf('pending'), 'warn');
  assert.equal(toneOf('confirmed'), 'brand');
  assert.equal(toneOf('arrived'), 'success');
  assert.equal(toneOf('cancelled'), 'danger');
  assert.equal(toneOf('completed'), 'neutral');
  assert.equal(toneOf('qandaydir'), 'neutral');
});

test('amallar: kutilmoqda -> tasdiqlash / bekor', () => {
  assert.deepEqual(actionsFor('pending').map((a) => a.to), ['confirmed', 'cancelled']);
});

test('amallar: tasdiqlangan -> keldi / kelmadi / bekor; bekor va kelmadi tasdiq so\'raydi', () => {
  const actions = actionsFor('confirmed');
  assert.deepEqual(actions.map((a) => a.to), ['arrived', 'no_show', 'cancelled']);
  assert.deepEqual(actions.map((a) => a.confirm), [false, true, true]);
  assert.deepEqual(actions.map((a) => a.danger), [false, true, true]);
});

test('amallar: keldi / o\'tirdi -> yakunlash; yakuniy va noma\'lum holatda amal yo\'q', () => {
  assert.deepEqual(actionsFor('arrived').map((a) => a.to), ['completed', 'cancelled']);
  assert.deepEqual(actionsFor('seated').map((a) => a.to), ['completed']);
  for (const status of ['completed', 'cancelled', 'no_show', '', 'xyz']) assert.deepEqual(actionsFor(status), [], status);
});

test('amallarda hech qachon o\'ziga qaytish yo\'q', () => {
  for (const status of KNOWN_STATUSES) {
    assert.ok(!actionsFor(status).some((a) => a.to === status), status);
  }
});

test('sourceKind: ma\'lum manbalar, noma\'lum yashiriladi', () => {
  assert.equal(sourceKind('guest'), 'site');
  assert.equal(sourceKind('WEB'), 'site');
  assert.equal(sourceKind('staff'), 'manual');
  assert.equal(sourceKind('manual'), 'manual');
  assert.equal(sourceKind('telegram'), 'telegram');
  assert.equal(sourceKind('api_v7'), null);
  assert.equal(sourceKind(''), null);
  assert.equal(sourceKind(undefined), null);
});
