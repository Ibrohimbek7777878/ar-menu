import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampTime, formatDuration, formatTime, parseTime, pointerToTime, round, stepTime, timeToRatio } from './time.ts';

test('formatTime: mm:ss.s, o\'ndan bir soniya', () => {
  assert.equal(formatTime(0), '00:00.0');
  assert.equal(formatTime(4), '00:04.0');
  assert.equal(formatTime(12.5), '00:12.5');
  assert.equal(formatTime(59.94), '00:59.9');
  assert.equal(formatTime(59.96), '01:00.0');
  assert.equal(formatTime(74.25), '01:14.3');
  assert.equal(formatTime(300), '05:00.0');
});

test('formatTime: noto\'g\'ri qiymatlar 00:00.0', () => {
  for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) assert.equal(formatTime(bad), '00:00.0', String(bad));
  assert.equal(formatTime(undefined as unknown as number), '00:00.0');
});

test('formatDuration: butun soniya', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(44.6), '0:45');
  assert.equal(formatDuration(125), '2:05');
  assert.equal(formatDuration(-3), '0:00');
  assert.equal(formatDuration(Number.NaN), '0:00');
});

test('parseTime: sonlar va mm:ss', () => {
  assert.equal(parseTime('12'), 12);
  assert.equal(parseTime('12.5'), 12.5);
  assert.equal(parseTime('12,5'), 12.5);
  assert.equal(parseTime(' 12 s '), 12);
  assert.equal(parseTime('0'), 0);
  assert.equal(parseTime('0:12'), 12);
  assert.equal(parseTime('1:02.5'), 62.5);
  assert.equal(parseTime('01:12.5'), 72.5);
  assert.equal(parseTime('2:5'), 125);
  assert.equal(parseTime('1:02:03'), 3723);
});

test('parseTime: yaroqsiz kiritish null', () => {
  for (const bad of ['', '   ', 'abc', '-5', '-0:05', '1:75', '1:2:3:4', '12..5', '1.2.3', ':30', '12:', '1:60', '1:00:60', '1:60:00', '٣', 'NaN', 'Infinity']) {
    assert.equal(parseTime(bad), null, JSON.stringify(bad));
  }
  assert.equal(parseTime(null as unknown as string), null);
});

test('parseTime va formatTime bir-biriga mos (aylanib qaytish)', () => {
  for (const value of [0, 0.1, 4, 12.5, 59.9, 60, 74.3, 299.9]) {
    assert.equal(parseTime(formatTime(value)), round(value, 1), String(value));
  }
});

test('clampTime: chegaralar', () => {
  assert.equal(clampTime(-2, 44), 0);
  assert.equal(clampTime(50, 44), 44);
  assert.equal(clampTime(10, 44), 10);
  assert.equal(clampTime(Number.NaN, 44), 0);
  assert.equal(clampTime(500, 0), 500); // davomiylik noma'lum: yuqori chegara yo'q
});

test('stepTime: +-0.5 s va chegaralar, suzuvchi nuqta xatosi yo\'q', () => {
  assert.equal(stepTime(10, 0.5, 44), 10.5);
  assert.equal(stepTime(0.2, -0.5, 44), 0);
  assert.equal(stepTime(44, 0.5, 44), 44);
  assert.equal(stepTime(43.8, 0.5, 44), 44);
  let value = 0;
  for (let i = 0; i < 6; i += 1) value = stepTime(value, 0.1, 44);
  assert.equal(value, 0.6);
  assert.equal(stepTime(0.1, 0.2, 44), 0.3);
});

test('pointerToTime va timeToRatio', () => {
  assert.equal(pointerToTime(150, 100, 200, 40), 10);
  assert.equal(pointerToTime(50, 100, 200, 40), 0);
  assert.equal(pointerToTime(900, 100, 200, 40), 40);
  assert.equal(pointerToTime(150, 100, 0, 40), 0);
  assert.equal(pointerToTime(150, 100, 200, 0), 0);
  assert.equal(timeToRatio(11, 44), 0.25);
  assert.equal(timeToRatio(-1, 44), 0);
  assert.equal(timeToRatio(99, 44), 1);
  assert.equal(timeToRatio(5, 0), 0);
});
