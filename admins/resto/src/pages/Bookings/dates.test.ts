import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STRIP_DAYS,
  addDays,
  buildDayStrip,
  compareISO,
  daysBetween,
  inRange,
  isISODate,
  nowMinutes,
  parseISODate,
  searchBounds,
  stripBounds,
  todayISO,
  weekdayOf,
} from './dates.ts';

test('todayISO: Toshkent vaqti (UTC+5) bo\'yicha kun almashadi', () => {
  // 2026-11-03 18:59 UTC = Toshkentda 23:59 (hali 3-noyabr)
  assert.equal(todayISO(Date.UTC(2026, 10, 3, 18, 59)), '2026-11-03');
  // 19:00 UTC = Toshkentda 00:00 (4-noyabr)
  assert.equal(todayISO(Date.UTC(2026, 10, 3, 19, 0)), '2026-11-04');
  assert.equal(todayISO(Date.UTC(2026, 11, 31, 19, 30)), '2027-01-01');
});

test('nowMinutes: Toshkent vaqti sutka boshidan daqiqada', () => {
  assert.equal(nowMinutes(Date.UTC(2026, 10, 3, 14, 30)), 19 * 60 + 30);
  assert.equal(nowMinutes(Date.UTC(2026, 10, 3, 19, 0)), 0);
});

test('parseISODate / isISODate: haqiqiy kalendar sanasi', () => {
  assert.deepEqual(parseISODate('2026-11-03'), { y: 2026, m: 11, d: 3 });
  assert.equal(isISODate('2024-02-29'), true); // kabisa yili
  assert.equal(isISODate('2026-02-29'), false);
  assert.equal(isISODate('2026-02-30'), false);
  assert.equal(isISODate('2026-13-01'), false);
  assert.equal(isISODate('2026-1-1'), false);
  assert.equal(isISODate('03.11.2026'), false);
  assert.equal(isISODate(''), false);
  assert.equal(isISODate(null), false);
});

test('addDays: oy va yil chegarasi, kabisa yili, manfiy qadam', () => {
  assert.equal(addDays('2026-11-03', 1), '2026-11-04');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-11-03', 0), '2026-11-03');
  assert.throws(() => addDays('xato', 1), RangeError);
});

test('weekdayOf: 0 = Dushanba … 6 = Yakshanba', () => {
  assert.equal(weekdayOf('2026-11-02'), 0); // dushanba
  assert.equal(weekdayOf('2026-11-03'), 1);
  assert.equal(weekdayOf('2026-11-07'), 5); // shanba
  assert.equal(weekdayOf('2026-11-08'), 6); // yakshanba
});

test('daysBetween / compareISO / inRange', () => {
  assert.equal(daysBetween('2026-11-03', '2026-11-18'), 15);
  assert.equal(daysBetween('2026-11-18', '2026-11-03'), -15);
  assert.equal(daysBetween('2026-12-25', '2027-01-05'), 11);
  assert.equal(compareISO('2026-11-03', '2026-11-04'), -1);
  assert.equal(compareISO('2026-11-03', '2026-11-03'), 0);
  assert.equal(compareISO('2027-01-01', '2026-12-31'), 1);
  assert.equal(inRange('2026-11-05', '2026-11-03', '2026-11-17'), true);
  assert.equal(inRange('2026-11-18', '2026-11-03', '2026-11-17'), false);
});

test('buildDayStrip: bugun + keyingi 14 kun', () => {
  const strip = buildDayStrip('2026-11-03');
  assert.equal(strip.length, STRIP_DAYS);
  assert.equal(strip.length, 15);
  assert.deepEqual(strip[0], { iso: '2026-11-03', day: 3, month: 10, weekday: 1, offset: 0, isToday: true });
  assert.equal(strip[14].iso, '2026-11-17');
  assert.equal(strip.filter((cell) => cell.isToday).length, 1);
  assert.deepEqual(stripBounds('2026-11-03'), { from: '2026-11-03', to: '2026-11-17' });
});

test('buildDayStrip: oy/yil chegarasidan o\'tadi, hafta kunlari ketma-ket', () => {
  const strip = buildDayStrip('2026-12-25');
  assert.equal(strip[7].iso, '2027-01-01');
  assert.equal(strip[7].month, 0);
  assert.equal(strip[7].day, 1);
  for (let i = 1; i < strip.length; i += 1) assert.equal(strip[i].weekday, (strip[i - 1].weekday + 1) % 7);
});

test('buildDayStrip: chekka sonlar', () => {
  assert.deepEqual(buildDayStrip('2026-11-03', 0), []);
  assert.equal(buildDayStrip('2026-11-03', 1).length, 1);
  assert.deepEqual(stripBounds('2026-11-03', 1), { from: '2026-11-03', to: '2026-11-03' });
});

test('searchBounds: qidiruv oynasi', () => {
  assert.deepEqual(searchBounds('2026-11-03'), { from: '2026-09-04', to: '2027-11-03' });
});
