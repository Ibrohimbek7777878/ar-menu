import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, firstErrorField, fingerprintOf, initialFlow, reduceFlow, validateForm, type FlowAction, type FlowState } from '../src/pages/BookingPage/flow.ts';
import type { BookingResult } from '../src/pages/BookingPage/types.ts';

const run = (state: FlowState, ...actions: FlowAction[]): FlowState => actions.reduce(reduceFlow, state);
const start = () => initialFlow({ date: '2026-11-05', guests: 2 });
const RESULT: BookingResult = { public_code: 'GS-1', status: 'pending', tableId: 3, tableNumber: '03', hall: 'Zal', date: '2026-11-05', time: '19:30', guests: 4, duration_minutes: 120 };

function filled(): FlowState {
  return run(start(),
    { type: 'selectTable', id: 3, capacity: 8 },
    { type: 'setTime', time: '19:30' },
    { type: 'setGuests', guests: 4, maxGuests: 12 },
    { type: 'setName', value: '  Ali   Valiyev ' },
    { type: 'setPhone', national: '901234567' },
    { type: 'setEvent', key: 'birthday' },
  );
}

test('oqim: stol tanlash oynani ochadi, mehmon soni stol sig\'imiga tushadi', () => {
  const s = run(initialFlow({ date: '2026-11-05', guests: 6 }), { type: 'selectTable', id: 1, capacity: 4 });
  assert.equal(s.step, 'form');
  assert.equal(s.tableId, 1);
  assert.equal(s.guests, 4);
  assert.equal(s.availGuests, 6); // oynada o'zgarish availability'ni qayta so'ratmaydi
});

test('oqim: oynada mehmon soni stol sig\'imi bilan cheklanadi va availGuests o\'zgarmaydi', () => {
  const s = run(start(), { type: 'selectTable', id: 3, capacity: 8 }, { type: 'setGuests', guests: 20, maxGuests: 12 }, { type: 'setGuests', guests: 0, maxGuests: 12 });
  assert.equal(s.guests, 1);
  const up = run(s, { type: 'setGuests', guests: 99, maxGuests: 12 });
  assert.equal(up.guests, 8);
  assert.equal(up.availGuests, 2);
  // oyna yopilganda 1-qadam yangi son bilan availability so'raydi
  assert.equal(run(up, { type: 'closeForm' }).availGuests, 8);
});

test('oqim: 1-qadamda mehmon soni sig\'imdan oshsa tanlangan stol bekor bo\'ladi', () => {
  let s = run(start(), { type: 'selectTable', id: 3, capacity: 4 }, { type: 'setTime', time: '19:30' }, { type: 'closeForm' });
  assert.equal(s.step, 'pick');
  assert.equal(s.tableId, 3);
  s = run(s, { type: 'setGuests', guests: 4, maxGuests: 12 });
  assert.equal(s.tableId, 3); // sig'adi
  s = run(s, { type: 'setGuests', guests: 5, maxGuests: 12 });
  assert.equal(s.tableId, null);
  assert.equal(s.time, null);
  assert.equal(s.availGuests, 5);
  assert.equal(run(s, { type: 'setGuests', guests: 50, maxGuests: 12 }).guests, 12);
});

test('oqim: sana o\'zgarsa vaqt va urinish tozalanadi, o\'sha sana bo\'lsa hech narsa o\'zgarmaydi', () => {
  const s = filled();
  assert.equal(reduceFlow(s, { type: 'setDate', date: '2026-11-05' }), s);
  const next = reduceFlow(s, { type: 'setDate', date: '2026-11-06' });
  assert.equal(next.time, null);
  assert.equal(next.date, '2026-11-06');
  assert.equal(next.name, s.name); // shaxsiy ma'lumot saqlanadi
});

test('tekshiruv: yetishmaydigan maydonlar va ularning tartibi', () => {
  const s = run(start(), { type: 'selectTable', id: 3, capacity: 8 });
  const errors = validateForm(s);
  assert.deepEqual(Object.keys(errors).sort(), ['name', 'phone', 'time']);
  assert.equal(firstErrorField(errors), 'time');
  assert.equal(firstErrorField({}), null);
  assert.equal(validateForm({ ...filled() }).name, undefined);
  assert.equal(validateForm({ ...filled(), guests: 9 }).guests?.code, 'over_capacity');
  assert.equal(validateForm({ ...filled(), phone: '9012' }).phone?.code, 'short');
  assert.equal(validateForm({ ...filled(), phone: '012345678' }).phone?.code, 'invalid');
  assert.equal(validateForm({ ...filled(), name: 'A' }).name?.code, 'short');
  assert.equal(validateForm({ ...filled(), notes: 'x'.repeat(501) }).notes?.code, 'long');
});

test('yuborish: tekshiruvdan o\'tmasa yubormaydi, xato maydon yonida', () => {
  const s = run(start(), { type: 'selectTable', id: 3, capacity: 8 }, { type: 'submit', newId: 'id-1' });
  assert.equal(s.submitting, false);
  assert.equal(s.attempt, null);
  assert.ok(s.errors.time && s.errors.name && s.errors.phone);
  // maydonni tuzatish o'sha maydonning xatosini olib tashlaydi
  const fixed = reduceFlow(s, { type: 'setName', value: 'Ali' });
  assert.equal(fixed.errors.name, undefined);
  assert.ok(fixed.errors.phone);
});

test('yuborish: ikki marta bosish bitta so\'rov (submitting paytida e\'tiborsiz)', () => {
  const a = reduceFlow(filled(), { type: 'submit', newId: 'id-1' });
  assert.equal(a.submitting, true);
  const b = reduceFlow(a, { type: 'submit', newId: 'id-2' });
  assert.equal(b, a);
  assert.equal(b.attempt?.id, 'id-1');
  // yuborish paytida oyna yopilmaydi
  assert.equal(reduceFlow(a, { type: 'closeForm' }).step, 'form');
});

test('idempotentlik: tarmoq xatosidan keyin qayta yuborish AYNI submission_id bilan; ma\'lumot o\'zgarsa yangi id', () => {
  let s = run(filled(), { type: 'submit', newId: 'id-1' }, { type: 'submitFail', failure: { kind: 'network' } });
  assert.equal(s.submitting, false);
  assert.equal(s.banner, 'network');
  assert.equal(s.attempt?.id, 'id-1');
  s = reduceFlow(s, { type: 'submit', newId: 'id-2' });
  assert.equal(s.attempt?.id, 'id-1'); // o'sha id: server takroriy bron yaratmaydi
  s = run(s, { type: 'submitFail', failure: { kind: 'server' } }, { type: 'setNotes', value: 'derazadan' }, { type: 'submit', newId: 'id-3' });
  assert.equal(s.attempt?.id, 'id-3'); // izoh o'zgardi -> yangi urinish
  const payload = buildPayload(s, s.attempt!.id)!;
  assert.equal(payload.submission_id, 'id-3');
  assert.equal(payload.notes, 'derazadan');
});

test('yuborish: to\'g\'ri tana (E.164 telefon, tozalangan ism, tadbir turi)', () => {
  const payload = buildPayload(filled(), 'sub-1')!;
  assert.deepEqual(payload, {
    table_id: 3, date: '2026-11-05', time: '19:30', guests: 4, name: 'Ali Valiyev', phone: '+998901234567',
    event_type: 'birthday', notes: '', submission_id: 'sub-1',
  });
  assert.equal(buildPayload(run(start(), { type: 'selectTable', id: 3, capacity: 8 }), 'x'), null); // vaqt yo'q
});

test('muvaffaqiyat: natija saqlanadi, yangi bron ism/telefonni saqlab 1-qadamga qaytadi', () => {
  const done = run(filled(), { type: 'submit', newId: 'a' }, { type: 'submitOk', result: RESULT });
  assert.equal(done.step, 'done');
  assert.equal(done.submitting, false);
  assert.equal(done.result?.public_code, 'GS-1');
  const again = reduceFlow(done, { type: 'reset', eventType: 'none' });
  assert.equal(again.step, 'pick');
  assert.equal(again.result, null);
  assert.equal(again.tableId, null);
  assert.equal(again.time, null);
  assert.equal(again.name, done.name);
  assert.equal(again.phone, done.phone);
  assert.equal(again.attempt, null);
  assert.equal(again.eventType, 'none');
});

test('409 slot_taken: vaqt tozalanadi, banner, oyna ochiq qoladi, yangi urinish yangi id', () => {
  let s = run(filled(), { type: 'submit', newId: 'id-1' }, { type: 'submitFail', failure: { kind: 'slot_taken' } });
  assert.equal(s.step, 'form');
  assert.equal(s.time, null);
  assert.equal(s.banner, 'slot_taken');
  assert.equal(s.attempt, null);
  assert.equal(s.name, '  Ali   Valiyev '); // kiritilgan ma'lumot yo'qolmaydi
  s = reduceFlow(s, { type: 'setTime', time: '20:00' });
  assert.equal(s.banner, null); // yangi vaqt tanlanganda xabar ketadi
  s = reduceFlow(s, { type: 'submit', newId: 'id-2' });
  assert.equal(s.attempt?.id, 'id-2');
});

test('429 / 403 / server: banner, oyna ochiq, ma\'lumot saqlanadi', () => {
  for (const kind of ['rate_limited', 'disabled', 'server'] as const) {
    const s = run(filled(), { type: 'submit', newId: 'x' }, { type: 'submitFail', failure: { kind } });
    assert.equal(s.banner, kind);
    assert.equal(s.step, 'form');
    assert.equal(s.time, '19:30');
    assert.equal(s.submitting, false);
  }
});

test('400: maydonga bog\'langan xato o\'sha maydon yonida; maydon noma\'lum bo\'lsa umumiy xabar', () => {
  const base = run(filled(), { type: 'submit', newId: 'x' });
  const phone = reduceFlow(base, { type: 'submitFail', failure: { kind: 'invalid', field: 'phone', message: 'Telefon noto\'g\'ri' } });
  assert.deepEqual(phone.errors.phone, { code: 'server', message: 'Telefon noto\'g\'ri' });
  assert.equal(phone.banner, null);
  assert.equal(phone.attempt, null);
  const date = reduceFlow(base, { type: 'submitFail', failure: { kind: 'invalid', field: 'date', message: 'Sana noto\'g\'ri' } });
  assert.ok(date.errors.time); // sana/vaqt xatosi vaqt bloki yonida
  const unknown = reduceFlow(base, { type: 'submitFail', failure: { kind: 'invalid', field: 'zzz', message: 'xato' } });
  assert.equal(unknown.banner, 'server');
});

test('availability yangilandi: tanlangan vaqt endi bo\'sh bo\'lmasa tozalanadi va ogohlantiriladi', () => {
  const s = filled();
  assert.equal(reduceFlow(s, { type: 'reconcile', freeTimes: new Set(['19:30', '20:00']) }), s);
  assert.equal(reduceFlow(s, { type: 'reconcile', freeTimes: null }), s); // noma'lum: tegilmaydi
  const lost = reduceFlow(s, { type: 'reconcile', freeTimes: new Set(['20:00']) });
  assert.equal(lost.time, null);
  assert.equal(lost.banner, 'slot_taken');
  assert.equal(reduceFlow(initialFlow({ date: 'x', guests: 1 }), { type: 'reconcile', freeTimes: new Set() }).banner, null); // vaqt tanlanmagan
});

test('fingerprint: ism bo\'sh joylari va izoh chetidagi probellar farq qilmaydi', () => {
  const a = filled();
  const b = { ...a, name: 'Ali Valiyev', notes: '  ' };
  assert.equal(fingerprintOf(a), fingerprintOf(b));
  assert.notEqual(fingerprintOf(a), fingerprintOf({ ...a, time: '20:00' }));
});

test('stol almashtirish: boshqa stolga o\'tilsa vaqt tozalanadi, o\'sha stol bo\'lsa saqlanadi', () => {
  const s = filled();
  const same = run(s, { type: 'closeForm' }, { type: 'selectTable', id: 3, capacity: 8 });
  assert.equal(same.time, '19:30');
  const other = run(s, { type: 'closeForm' }, { type: 'selectTable', id: 5, capacity: 6 });
  assert.equal(other.time, null);
  assert.equal(other.guests, 4);
});
