import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, addMinutes, buildDateStrip, clampDaysAhead, diffDays, firstOpenDay, formatDay, isTime, isYmd,
  jsWeekday, localYmd, parseYmd, restaurantYmd, serverWeekday,
} from '../src/pages/BookingPage/dates.ts';
import {
  caretAfterDigits, digitsBefore, displayPhone, formatNational, nameIssue, nationalDigits, normalizeName,
  notesIssue, phoneIssue, toE164,
} from '../src/pages/BookingPage/phone.ts';
import {
  hallFreeCount, hasUsablePlan, isTimeFree, normalizeSlotState, pickLabel, planBox, planMinWidth, tableAvailability,
  tableShape, tableStates, timeGroupsView,
} from '../src/pages/BookingPage/availability.ts';
import { failureFromResponse, parseAvailability, parseBookingResult, parseConfig, parseStatus } from '../src/pages/BookingPage/parse.ts';
import { MAX_STORED, addStored, parseStored, pruneBookings, toStored } from '../src/pages/BookingPage/stored.ts';
import type { BookingHall, BookingTable, SlotState, StoredBooking } from '../src/pages/BookingPage/types.ts';

// ─── Sana lentasi ───────────────────────────────────────────────────────────────────────────────────
test('sana: haqiqiy kalendar tekshiruvi, oy/yil/kabisa yil chegaralari', () => {
  assert.ok(isYmd('2026-11-03'));
  assert.ok(isYmd('2028-02-29')); // kabisa yil
  assert.ok(!isYmd('2027-02-29'));
  assert.ok(!isYmd('2026-13-01'));
  assert.ok(!isYmd('2026-1-3'));
  assert.ok(!isYmd(20261103));
  assert.equal(parseYmd('2026-02-30'), null);
  assert.equal(addDays('2026-11-03', 1), '2026-11-04');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('xx', 3), 'xx');
  assert.equal(diffDays('2026-11-03', '2026-12-03'), 30);
  assert.equal(diffDays('2026-11-03', 'bad'), 0);
});

test('sana: hafta kuni — JS (0=Yakshanba) va server (0=Dushanba) tartibi', () => {
  // 2026-11-03 — seshanba
  assert.equal(jsWeekday('2026-11-03'), 2);
  assert.equal(serverWeekday('2026-11-03'), 1);
  assert.equal(jsWeekday('2026-11-01'), 0); // yakshanba
  assert.equal(serverWeekday('2026-11-01'), 6);
  assert.equal(serverWeekday('2026-11-02'), 0); // dushanba
});

test('sana lentasi: bugun + max_days_ahead kun, yopiq hafta kunlari belgilanadi', () => {
  const strip = buildDateStrip('2026-11-03', 6, [0]); // dushanba yopiq
  assert.equal(strip.length, 7);
  assert.deepEqual(strip.map((c) => c.offset), [0, 1, 2, 3, 4, 5, 6]);
  assert.equal(strip[0].ymd, '2026-11-03');
  assert.equal(strip[6].ymd, '2026-11-09');
  const closed = strip.filter((c) => c.closed).map((c) => c.ymd);
  assert.deepEqual(closed, ['2026-11-09']); // 2026-11-09 dushanba
  assert.equal(firstOpenDay(strip), '2026-11-03');
});

test('sana lentasi: bugun yopiq bo\'lsa birinchi ochiq kun keyingisi; hammasi yopiq -> null', () => {
  const strip = buildDateStrip('2026-11-03', 3, [1]); // seshanba yopiq
  assert.equal(strip[0].closed, true);
  assert.equal(firstOpenDay(strip), '2026-11-04');
  assert.equal(firstOpenDay(buildDateStrip('2026-11-03', 6, [0, 1, 2, 3, 4, 5, 6])), null);
});

test('sana lentasi: chegaralar va noto\'g\'ri kirish', () => {
  assert.equal(buildDateStrip('2026-11-03', 0).length, 1);
  assert.equal(buildDateStrip('2026-11-03', -5).length, 1);
  assert.equal(buildDateStrip('2026-11-03', 9999).length, 366);
  assert.equal(buildDateStrip('2026-11-03', 'abc').length, 31); // noma'lum -> 30 kun
  assert.deepEqual(buildDateStrip('bad', 5), []);
  // noto'g'ri hafta kunlari e'tiborga olinmaydi
  assert.equal(buildDateStrip('2026-11-03', 3, [9, -1, 1.5]).filter((c) => c.closed).length, 0);
  assert.equal(clampDaysAhead(null), 0); // Number(null) = 0
  assert.equal(clampDaysAhead(undefined), 30);
});

test('sana lentasi: oy va yil chegarasidan o\'tadi', () => {
  const strip = buildDateStrip('2026-12-29', 5);
  assert.deepEqual(strip.map((c) => c.ymd), ['2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});

test('localYmd: qurilmaning mahalliy sanasi', () => {
  assert.equal(localYmd(new Date(2026, 10, 3, 23, 59)), '2026-11-03');
  assert.equal(localYmd(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('restaurantYmd: Toshkent sanasi (UTC+5), mehmon qaysi mintaqada bo\'lmasin', () => {
  // 2026-11-03 20:00 UTC = Toshkentda 2026-11-04 01:00
  assert.equal(restaurantYmd(new Date('2026-11-03T20:00:00Z')), '2026-11-04');
  assert.equal(restaurantYmd(new Date('2026-11-03T18:59:00Z')), '2026-11-03');
  assert.equal(restaurantYmd(new Date('2026-12-31T19:00:00Z')), '2027-01-01'); // yil chegarasi
  assert.equal(restaurantYmd(new Date('2026-11-03T20:00:00Z'), 'America/New_York'), '2026-11-03');
  assert.match(restaurantYmd(new Date('2026-11-03T12:00:00Z'), 'Not/AZone'), /^\d{4}-\d{2}-\d{2}$/); // noto'g'ri mintaqa: qurilma sanasi
});

test('formatDay: tilga mos nomlar, UTC siljishi yo\'q', () => {
  const en = formatDay('2026-11-03', 'en-US');
  assert.equal(en.day, '3');
  assert.equal(en.weekday, 'Tue');
  assert.equal(en.month, 'Nov');
  assert.match(en.long, /Tuesday/);
  const ru = formatDay('2026-11-03', 'ru-RU');
  assert.match(ru.weekday, /вт/i);
  assert.equal(formatDay('bad', 'en-US').long, 'bad');
  assert.equal(formatDay('2026-11-03', 'zz-invalid-locale-xx').day, '3'); // noma'lum til -> zaxira, xato yo'q
});

test('vaqt: addMinutes yarim tundan o\'tadi, isTime tekshiradi', () => {
  assert.equal(addMinutes('19:30', 120), '21:30');
  assert.equal(addMinutes('23:30', 60), '00:30');
  assert.equal(addMinutes('09:05', 55), '10:00');
  assert.equal(addMinutes('bad', 60), '');
  assert.ok(isTime('00:00') && isTime('23:59'));
  assert.ok(!isTime('24:00') && !isTime('7:30') && !isTime('12:60') && !isTime(1230));
});

// ─── Telefon va ism ─────────────────────────────────────────────────────────────────────────────────
test('telefon: har xil kiritish shakllari milliy 9 raqamga keladi', () => {
  assert.equal(nationalDigits('90 123 45 67'), '901234567');
  assert.equal(nationalDigits('+998 90 123 45 67'), '901234567');
  assert.equal(nationalDigits('998901234567'), '901234567');
  assert.equal(nationalDigits('+998 (90) 123-45-67'), '901234567');
  assert.equal(nationalDigits('0901234567'), '901234567');
  assert.equal(nationalDigits('90abc12'), '9012');
  assert.equal(nationalDigits(''), '');
  assert.equal(nationalDigits('9012345678901'), '9012345678'.slice(0, 9)); // ortiqchasi kesiladi
});

test('telefon: 99 operatorli raqam "998" bilan boshlansa buzilmaydi', () => {
  assert.equal(nationalDigits('998123456'), '998123456'); // 9 raqam: milliy raqam
  assert.equal(nationalDigits('99'), '99');
  assert.equal(nationalDigits('998'), '998');
});

test('telefon: formatlash guruhlari va qisman holatlar', () => {
  assert.equal(formatNational('901234567'), '90 123 45 67');
  assert.equal(formatNational('9'), '9');
  assert.equal(formatNational('90'), '90');
  assert.equal(formatNational('901'), '90 1');
  assert.equal(formatNational('90123'), '90 123');
  assert.equal(formatNational('901234'), '90 123 4');
  assert.equal(formatNational(''), '');
  assert.equal(displayPhone('901234567'), '+998 90 123 45 67');
  assert.equal(toE164('901234567'), '+998901234567');
});

test('telefon: tekshiruv', () => {
  assert.equal(phoneIssue(''), 'empty');
  assert.equal(phoneIssue('9012'), 'short');
  assert.equal(phoneIssue('012345678'), 'invalid');
  assert.equal(phoneIssue('112345678'), 'invalid');
  assert.equal(phoneIssue('9012345678'), 'invalid');
  assert.equal(phoneIssue('90123456a'), 'invalid');
  assert.equal(phoneIssue('901234567'), null);
  assert.equal(phoneIssue('331234567'), null);
});

test('telefon: kursor o\'rtada tahrirlanganda raqamlar soni bo\'yicha tiklanadi', () => {
  assert.equal(digitsBefore('90 123 45 67', 4), 3); // "90 1"
  assert.equal(digitsBefore('90 123', 0), 0);
  assert.equal(caretAfterDigits('90 123 45 67', 3), 4);
  assert.equal(caretAfterDigits('90 123 45 67', 2), 2);
  assert.equal(caretAfterDigits('90 123 45 67', 9), 12);
  assert.equal(caretAfterDigits('90 123 45 67', 99), 12);
  assert.equal(caretAfterDigits('90 123', 0), 0);
});

test('ism: bo\'sh joylar tozalanadi, uzunlik va harf talabi', () => {
  assert.equal(normalizeName('  Ali   Valiyev  '), 'Ali Valiyev');
  assert.equal(nameIssue(''), 'empty');
  assert.equal(nameIssue('   '), 'empty');
  assert.equal(nameIssue('A'), 'short');
  assert.equal(nameIssue('Al'), null);
  assert.equal(nameIssue('12345'), 'invalid');
  assert.equal(nameIssue("Oʻktam G'ulomov"), null);
  assert.equal(nameIssue('Шахноза Каримова'), null); // kirill
  assert.equal(nameIssue('x'.repeat(81)), 'long');
  assert.equal(notesIssue('a'.repeat(500)), null);
  assert.equal(notesIssue('a'.repeat(501)), 'long');
});

// ─── Availability -> holat ──────────────────────────────────────────────────────────────────────────
const S = (o: Record<string, SlotState>) => o;

test('stol holati: bitta bo\'sh vaqt yetarli; sabablar ustuvorligi', () => {
  assert.deepEqual(tableAvailability(S({ '12:30': 'taken', '13:00': 'free' }), false), { state: 'free', freeCount: 1 });
  assert.equal(tableAvailability(S({ '12:30': 'taken', '13:00': 'past' }), false).state, 'busy');
  assert.equal(tableAvailability(S({ '12:30': 'past', '13:00': 'past' }), false).state, 'past');
  assert.equal(tableAvailability(S({ '12:30': 'past', '13:00': 'closed' }), false).state, 'past');
  assert.equal(tableAvailability(S({ '12:30': 'closed', '13:00': 'closed' }), false).state, 'closed');
  assert.equal(tableAvailability(S({ '12:30': 'too_small', '13:00': 'too_small' }), false).state, 'too_small');
  assert.equal(tableAvailability(S({ '12:30': 'too_small', '13:00': 'taken' }), false).state, 'busy');
  assert.equal(tableAvailability(S({ '12:30': 'free' }), true).state, 'closed'); // kun yopiq
  assert.equal(tableAvailability(undefined, false).state, 'closed');
  assert.equal(tableAvailability({}, false).state, 'closed');
});

test('noma\'lum slot holati tanlab bo\'lmaydigan (taken) deb olinadi', () => {
  assert.equal(normalizeSlotState('free'), 'free');
  assert.equal(normalizeSlotState('hold'), 'taken');
  assert.equal(normalizeSlotState(null), 'taken');
  assert.equal(normalizeSlotState(1), 'taken');
});

const T = (id: number, extra: Partial<BookingTable> = {}): BookingTable => ({ id, number: String(id), capacity: 4, shape: 'rect', x: 0, y: 0, w: 0, h: 0, ...extra });
const HALL = (tables: BookingTable[]): BookingHall => ({ id: 1, name: 'Asosiy', tables });

test('tableStates / hallFreeCount: availability yo\'q bo\'lsa bo\'sh xarita', () => {
  const hall = HALL([T(1), T(2)]);
  assert.equal(tableStates([hall], undefined, false).size, 0);
  const states = tableStates([hall], [{ id: 1, slots: S({ '12:30': 'free' }) }, { id: 2, slots: S({ '12:30': 'taken' }) }], false);
  assert.equal(states.get(1)?.state, 'free');
  assert.equal(states.get(2)?.state, 'busy');
  assert.equal(hallFreeCount(hall, states), 1);
  // javobda yo'q stol -> yopiq
  assert.equal(tableStates([hall], [{ id: 1, slots: S({ '12:30': 'free' }) }], false).get(2)?.state, 'closed');
});

test('vaqt guruhlari: o\'tgan/band/yopiq tanlanmaydi, yo\'q vaqt yopiq, yuklanmagan noma\'lum', () => {
  const groups = [
    { key: 'lunch', label: 'Tushlik', times: ['12:30', '13:00', '13:30'] },
    { key: 'empty', label: 'Bo\'sh', times: [] },
    { key: 'dinner', label: 'Kechki', times: ['19:30'] },
  ];
  const view = timeGroupsView(groups, S({ '12:30': 'past', '13:00': 'free', '19:30': 'taken' }));
  assert.equal(view.length, 2); // bo'sh guruh tashlandi
  assert.deepEqual(view[0].cells.map((c) => [c.time, c.state, c.selectable]), [
    ['12:30', 'past', false], ['13:00', 'free', true], ['13:30', 'closed', false],
  ]);
  assert.equal(view[0].freeCount, 1);
  assert.equal(view[1].cells[0].selectable, false);
  const loading = timeGroupsView(groups, undefined);
  assert.ok(loading.every((g) => g.cells.every((c) => c.state === 'unknown' && !c.selectable)));
  assert.equal(isTimeFree(S({ '13:00': 'free' }), '13:00'), true);
  assert.equal(isTimeFree(S({ '13:00': 'taken' }), '13:00'), false);
  assert.equal(isTimeFree(undefined, '13:00'), null);
  assert.equal(isTimeFree(S({}), null), null);
});

test('yorliq tili: ru/en tarjimasi bo\'lsa shu, bo\'sh bo\'lsa o\'zbekcha', () => {
  const item = { label: 'Tushlik', label_ru: 'Обед', label_en: '  ' };
  assert.equal(pickLabel(item, 'uz'), 'Tushlik');
  assert.equal(pickLabel(item, 'ru'), 'Обед');
  assert.equal(pickLabel(item, 'en'), 'Tushlik'); // bo'sh joy -> o'zbekcha
  assert.equal(pickLabel({ label: 'Yo\'q' }, 'ru'), 'Yo\'q');
});

// ─── Zal rejasi ─────────────────────────────────────────────────────────────────────────────────────
test('reja: koordinata/o\'lcham yo\'q yoki hammasi bir nuqtada -> ro\'yxat', () => {
  assert.equal(hasUsablePlan(HALL([])), false);
  assert.equal(hasUsablePlan(HALL([T(1), T(2)])), false); // x,y,w,h = 0
  assert.equal(hasUsablePlan(HALL([T(1, { w: 80, h: 80 }), T(2, { w: 80, h: 80 })])), false); // bir nuqta
  assert.equal(hasUsablePlan(HALL([T(1, { w: 80, h: 80 }), T(2, { w: 0, h: 80, x: 100 })])), false); // biri o'lchamsiz
  assert.equal(hasUsablePlan(HALL([T(1, { w: 80, h: 80 }), T(2, { w: 80, h: 80, x: 120 })])), true);
  assert.equal(hasUsablePlan(HALL([T(1, { w: 80, h: 80 })])), true); // yagona stol
});

test('reja: chegara va eng kichik kenglik (bosib bo\'ladigan stol)', () => {
  const tables = [T(1, { x: 100, y: 50, w: 60, h: 60 }), T(2, { x: 400, y: 300, w: 120, h: 80 })];
  const box = planBox(tables)!;
  assert.ok(box.minX < 100 && box.minY < 50);
  assert.ok(box.minX + box.width > 520 && box.minY + box.height > 380);
  // eng kichik stol 60 birlik; 44 px uchun 44/60 px-birlik * kenglik
  const w = planMinWidth(box, tables);
  assert.equal(w, Math.round((box.width * 44) / 60));
  // katta koordinatalar: cheklov
  const huge = [T(1, { x: 0, y: 0, w: 20, h: 20 }), T(2, { x: 5000, y: 3000, w: 20, h: 20 })];
  assert.equal(planMinWidth(planBox(huge)!, huge), 1600);
  assert.equal(planBox([T(1)]), null);
  assert.equal(planMinWidth({ minX: 0, minY: 0, width: 0, height: 0 }, tables), 0);
});

test('stol shakli: round/circle/oval -> dumaloq, qolgani to\'rtburchak', () => {
  for (const s of ['round', 'circle', 'oval', 'Ellipse', ' Round ']) assert.equal(tableShape(s), 'round', s);
  for (const s of ['rect', 'square', 'rectangle', '', 'long']) assert.equal(tableShape(s), 'rect', s);
});

// ─── Server javoblarini tekshirish ──────────────────────────────────────────────────────────────────
test('parseConfig: to\'liq javob normallashadi, noto\'g\'ri elementlar tashlanadi', () => {
  const cfg = parseConfig({
    enabled: true,
    slots: [
      { key: 'lunch', label: 'Tushlik', label_ru: 'Обед', times: ['13:00', '12:30', '12:30', 'bad', '25:00'] },
      { key: 'x', label: 'Bo\'sh', times: ['bad'] },
      { label: '', times: ['10:00'] },
      null,
    ],
    event_types: [{ key: 'none', label: 'Yo\'q' }, { label: '' }, 7],
    max_days_ahead: 400,
    duration_minutes: 120,
    min_notice_minutes: 60,
    closed_weekdays: [0, 0, 7, 'x', 6],
    shop: { name: 'Guliston' },
    halls: [
      { id: 1, name: 'Asosiy zal', tables: [{ id: 3, number: '03', capacity: 8, shape: 'round', x: '10', y: 20, w: 60, h: 60 }, { number: 'no-id' }, { id: 4 }] },
      { name: 'id yo\'q' },
    ],
  })!;
  assert.equal(cfg.enabled, true);
  assert.deepEqual(cfg.slots.map((s) => [s.key, s.times]), [['lunch', ['12:30', '13:00']]]);
  assert.equal(cfg.slots[0].label_ru, 'Обед');
  assert.equal(cfg.event_types.length, 1);
  assert.equal(cfg.max_days_ahead, 365);
  assert.deepEqual(cfg.closed_weekdays, [0, 6]);
  assert.equal(cfg.shopName, 'Guliston');
  assert.equal(cfg.halls.length, 1);
  assert.equal(cfg.halls[0].tables.length, 2);
  assert.deepEqual(cfg.halls[0].tables[0], { id: 3, number: '03', capacity: 8, shape: 'round', x: 10, y: 20, w: 60, h: 60 });
  assert.equal(cfg.halls[0].tables[1].capacity, 4); // kiritilmagan sig'im -> 4
});

test('parseConfig: shakl noto\'g\'ri bo\'lsa null (HTML, massiv, enabled yo\'q)', () => {
  for (const bad of [null, undefined, 'html', [], 5, {}, { enabled: 'yes' }]) assert.equal(parseConfig(bad), null, String(bad));
  const closed = parseConfig({ enabled: false })!;
  assert.equal(closed.enabled, false);
  assert.deepEqual(closed.halls, []);
});

test('parseAvailability: noma\'lum holat band deb olinadi, noto\'g\'ri qatorlar tashlanadi', () => {
  const a = parseAvailability({ date: '2026-11-03', closed: false, tables: [{ id: 1, slots: { '12:30': 'free', '13:00': 'weird' } }, { slots: {} }, 'x'] })!;
  assert.deepEqual(a.tables, [{ id: 1, slots: { '12:30': 'free', '13:00': 'taken' } }]);
  assert.equal(a.closed, false);
  assert.equal(parseAvailability({ date: '2026-11-03', closed: true, tables: [] })!.closed, true);
  for (const bad of [null, {}, { date: '2026-11-03' }, { tables: [] }]) assert.equal(parseAvailability(bad), null);
});

test('parseBookingResult: kod bo\'lmasa null; zal obyekt yoki matn; zaxira qiymatlar', () => {
  const ok = parseBookingResult(
    { public_code: 'GS-K7QX2', status: 'pending', table: { id: 3, number: '03', hall: 'Asosiy zal' }, date: '2026-11-05', time: '19:30', guests: 4, duration_minutes: 120 },
    { date: 'x', time: 'y', guests: 1 },
  )!;
  assert.deepEqual(ok, { public_code: 'GS-K7QX2', status: 'pending', tableId: 3, tableNumber: '03', hall: 'Asosiy zal', date: '2026-11-05', time: '19:30', guests: 4, duration_minutes: 120 });
  const objHall = parseBookingResult({ public_code: 'A1', table: { id: 1, number: 5, hall: { name: 'VIP' } } }, { date: '2026-11-05', time: '20:00', guests: 2 })!;
  assert.equal(objHall.hall, 'VIP');
  assert.equal(objHall.tableNumber, '5');
  assert.equal(objHall.date, '2026-11-05'); // zaxira (so'rovdagi qiymat)
  assert.equal(objHall.status, 'pending');
  assert.equal(parseBookingResult({ status: 'pending' }, { date: 'a', time: 'b', guests: 1 }), null);
  assert.equal(parseBookingResult(null, { date: 'a', time: 'b', guests: 1 }), null);
});

test('parseStatus: tekis yoki ichma-ich shakl', () => {
  assert.equal(parseStatus({ public_code: 'GS-1', status: 'confirmed', date: '2026-11-05', time: '19:30', guests: 3, table: { number: '03', hall: 'Zal' } }, 'GS-1')!.tableNumber, '03');
  assert.equal(parseStatus({ booking: { status: 'cancelled' } }, 'GS-2')!.status, 'cancelled');
  assert.equal(parseStatus({ booking: { status: 'cancelled' } }, 'GS-2')!.public_code, 'GS-2');
  assert.equal(parseStatus({ foo: 1 }, 'GS-3'), null);
  assert.equal(parseStatus('html', 'GS-3'), null);
});

test('failureFromResponse: HTTP kodlari UI turlariga', () => {
  assert.deepEqual(failureFromResponse(409, { code: 'slot_taken' }), { kind: 'slot_taken' });
  assert.deepEqual(failureFromResponse(409, null), { kind: 'slot_taken' });
  assert.deepEqual(failureFromResponse(429, {}), { kind: 'rate_limited' });
  assert.deepEqual(failureFromResponse(403, { code: 'booking_disabled' }), { kind: 'disabled' });
  assert.deepEqual(failureFromResponse(403, { error: 'CSRF' }), { kind: 'server' });
  assert.deepEqual(failureFromResponse(400, { error: 'Telefon noto\'g\'ri', field: 'phone' }), { kind: 'invalid', field: 'phone', message: 'Telefon noto\'g\'ri' });
  assert.deepEqual(failureFromResponse(400, 'html'), { kind: 'invalid', field: '', message: '' });
  assert.deepEqual(failureFromResponse(500, {}), { kind: 'server' });
});

// ─── Eslab qolingan bronlar ─────────────────────────────────────────────────────────────────────────
const stored = (code: string, date: string, time = '19:30'): StoredBooking => ({ code, date, time, tableNumber: '03', hall: 'Zal', guests: 2, savedAt: 1 });

test('saqlangan bronlar: kelgusilari oldin, eskirganlari tashlanadi, takror kod bitta', () => {
  const today = '2026-11-03';
  const list = pruneBookings([stored('C', '2026-11-10'), stored('A', '2026-11-04'), stored('OLD', '2026-10-30'), stored('B', '2026-11-04', '12:30'), stored('Y', '2026-11-02')], today);
  assert.deepEqual(list.map((b) => b.code), ['Y', 'B', 'A', 'C']); // kecha hali ko'rinadi, 30-oktabr yo'q
  const added = addStored(list, stored('A', '2026-11-05'), today);
  assert.equal(added.filter((b) => b.code === 'A').length, 1);
  assert.equal(added.find((b) => b.code === 'A')!.date, '2026-11-05');
  let many: StoredBooking[] = [];
  for (let i = 0; i < 12; i++) many = addStored(many, stored(`K${i}`, '2026-11-20'), today);
  assert.equal(many.length, MAX_STORED);
});

test('saqlangan bronlar: buzilgan JSON va noto\'g\'ri yozuvlar e\'tiborga olinmaydi', () => {
  const today = '2026-11-03';
  assert.deepEqual(parseStored(null, today), []);
  assert.deepEqual(parseStored('{not json', today), []);
  assert.deepEqual(parseStored('{"a":1}', today), []);
  assert.deepEqual(parseStored(JSON.stringify([{ code: 'X' }, 5, null, stored('OK', '2026-11-04')]), today).map((b) => b.code), ['OK']);
  const s = toStored({ public_code: 'GS-9', status: 'pending', tableId: 1, tableNumber: '03', hall: 'Zal', date: '2026-11-04', time: '19:30', guests: 2, duration_minutes: 120 }, 5);
  assert.equal(s.code, 'GS-9');
  assert.equal(s.savedAt, 5);
  assert.equal(Object.keys(s).some((k) => /phone|name/i.test(k)), false); // shaxsiy ma'lumot saqlanmaydi
});
