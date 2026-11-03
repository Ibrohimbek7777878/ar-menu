import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_GENERATED, formatTime, generateTimes, mergeTimes, normalizeTime, parseTime, shortTime, sortUniqueTimes, timeRangeLabel } from './time.ts';

test('parseTime: yaroqli ko\'rinishlar daqiqaga aylanadi', () => {
  assert.equal(parseTime('00:00'), 0);
  assert.equal(parseTime('9:05'), 545);
  assert.equal(parseTime('19:30'), 1170);
  assert.equal(parseTime('23:59'), 1439);
  assert.equal(parseTime(' 19:30 '), 1170);
  assert.equal(parseTime('19:30:00'), 1170); // server soniyali qaytarishi mumkin
});

test('parseTime: 24:00 va noto\'g\'ri qiymatlar yaroqsiz', () => {
  for (const bad of ['24:00', '24:01', '12:60', '1:5', '', 'abc', '19-30', '19:30:99x', null, undefined, 1930, {}]) {
    assert.equal(parseTime(bad), null, String(bad));
  }
});

test('formatTime / normalizeTime / shortTime', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(545), '09:05');
  assert.equal(formatTime(1439), '23:59');
  assert.equal(formatTime(1440), '00:00'); // sutka chegarasidan o'tish — o'raladi
  assert.equal(formatTime(1500), '01:00');
  assert.equal(formatTime(-30), '23:30');
  assert.equal(normalizeTime('9:05'), '09:05');
  assert.equal(normalizeTime('19:30:00'), '19:30');
  assert.equal(normalizeTime('24:00'), null);
  assert.equal(shortTime('19:30:00'), '19:30');
  assert.equal(shortTime('kechqurun'), 'kechqurun'); // yaroqsiz bo'lsa asl matn
  assert.equal(shortTime(undefined), '');
});

test('sortUniqueTimes: takrorlar, yaroqsizlar va tartib', () => {
  assert.deepEqual(sortUniqueTimes(['14:00', '12:30', '14:00', '9:05', '14:00:00', 'xato', '24:00']), ['09:05', '12:30', '14:00']);
  assert.deepEqual(sortUniqueTimes([]), []);
});

test('mergeTimes: faqat haqiqatan qo\'shilganlar sanaladi', () => {
  assert.deepEqual(mergeTimes(['12:00', '13:00'], ['13:00', '12:30']), { times: ['12:00', '12:30', '13:00'], added: 1 });
  assert.deepEqual(mergeTimes([], ['10:00', '10:00']), { times: ['10:00'], added: 1 });
  assert.deepEqual(mergeTimes(['10:00'], ['10:00']), { times: ['10:00'], added: 0 });
});

test('timeRangeLabel: davomiylik bilan oraliq, sutka chegarasidan o\'tish', () => {
  assert.equal(timeRangeLabel('19:30', 120), '19:30–21:30');
  assert.equal(timeRangeLabel('19:30:00', 90), '19:30–21:00');
  assert.equal(timeRangeLabel('23:00', 120), '23:00–01:00');
  assert.equal(timeRangeLabel('19:30', 0), '19:30');
  assert.equal(timeRangeLabel('xato', 120), 'xato');
});

test('generateTimes: har 30 daqiqada', () => {
  assert.deepEqual(generateTimes('12:30', '15:00', 30), { ok: true, times: ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00'] });
});

test('generateTimes: tugash qadamga to\'g\'ri kelmasa oxirgi to\'liq qadamgacha', () => {
  assert.deepEqual(generateTimes('12:00', '13:10', 30), { ok: true, times: ['12:00', '12:30', '13:00'] });
});

test('generateTimes: tugash = boshlanish — bitta vaqt', () => {
  assert.deepEqual(generateTimes('19:00', '19:00', 30), { ok: true, times: ['19:00'] });
});

test('generateTimes: 24:00 ga o\'tish — sutka oxirigacha, 24:00 o\'zi yaratilmaydi', () => {
  assert.deepEqual(generateTimes('22:00', '24:00', 30), { ok: true, times: ['22:00', '22:30', '23:00', '23:30'] });
  assert.deepEqual(generateTimes('23:00', '23:59', 60), { ok: true, times: ['23:00'] });
  assert.deepEqual(generateTimes('23:30', '24:00', 30), { ok: true, times: ['23:30'] });
  assert.deepEqual(generateTimes('00:00', '24:00', 720), { ok: true, times: ['00:00', '12:00'] });
});

test('generateTimes: tunga o\'tish (tugash < boshlanish) xato', () => {
  assert.deepEqual(generateTimes('20:00', '02:00', 30), { ok: false, error: 'end_before_start' });
});

test('generateTimes: yaroqsiz kirish va qadam', () => {
  assert.deepEqual(generateTimes('', '15:00', 30), { ok: false, error: 'invalid_start' });
  assert.deepEqual(generateTimes('12:00', '25:00', 30), { ok: false, error: 'invalid_end' });
  assert.deepEqual(generateTimes('12:00', '', 30), { ok: false, error: 'invalid_end' });
  assert.deepEqual(generateTimes('12:00', '15:00', 0), { ok: false, error: 'invalid_step' });
  assert.deepEqual(generateTimes('12:00', '15:00', 4), { ok: false, error: 'invalid_step' });
  assert.deepEqual(generateTimes('12:00', '15:00', 30.5), { ok: false, error: 'invalid_step' });
  assert.deepEqual(generateTimes('12:00', '15:00', -30), { ok: false, error: 'invalid_step' });
  assert.deepEqual(generateTimes('12:00', '15:00', 721), { ok: false, error: 'invalid_step' });
  assert.deepEqual(generateTimes('12:00', '15:00', 'x'), { ok: false, error: 'invalid_step' });
});

test('generateTimes: qadam satr bo\'lib kelsa ham ishlaydi (select qiymati)', () => {
  assert.deepEqual(generateTimes('10:00', '11:00', '30'), { ok: true, times: ['10:00', '10:30', '11:00'] });
});

test('generateTimes: juda ko\'p vaqt yaratilmaydi', () => {
  // 00:00 – 24:00, 5 daqiqa = 288 ta
  assert.deepEqual(generateTimes('00:00', '24:00', 5), { ok: false, error: 'too_many' });
  const maxOk = generateTimes('00:00', '24:00', 15);
  assert.ok(maxOk.ok && maxOk.times.length === MAX_GENERATED && maxOk.times[0] === '00:00' && maxOk.times.at(-1) === '23:45');
});
