import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EPS, MIN_GAP, defaultRange, isNearTime, isVisibleAt, layoutRows, nudgeBound, setBound, suggestedAt, validateRange, visibleAt, withLength,
} from './ranges.ts';

test('validateRange: yaroqli oraliq', () => {
  assert.equal(validateRange(12, 16.5, 44.6), null);
  assert.equal(validateRange(0, 0.1, 44.6), null);
  assert.equal(validateRange(40, 44.6, 44.6), null);
  assert.equal(validateRange(40, 44.64, 44.6), null); // EPS ichida
});

test('validateRange: tartib (t_start < t_end qat\'iy)', () => {
  assert.equal(validateRange(5, 5, 44), 'order');
  assert.equal(validateRange(6, 5, 44), 'order');
});

test('validateRange: manfiy, NaN, davomiylikdan tashqari', () => {
  assert.equal(validateRange(-1, 5, 44), 'negative');
  assert.equal(validateRange(1, -5, 44), 'negative');
  assert.equal(validateRange(Number.NaN, 5, 44), 'invalid');
  assert.equal(validateRange(1, Number.POSITIVE_INFINITY, 44), 'invalid');
  assert.equal(validateRange(40, 44.7, 44.6), 'beyond');
  assert.equal(validateRange(40, 60, 44), 'beyond');
});

test('validateRange: davomiylik noma\'lum bo\'lsa yuqori chegara tekshirilmaydi', () => {
  assert.equal(validateRange(10, 1000, 0), null);
  assert.equal(validateRange(10, 1000, Number.NaN), null);
});

test('defaultRange: hozirgi -1 s ... +2.5 s', () => {
  assert.deepEqual(defaultRange(13, 44.6), { t_start: 12, t_end: 15.5 });
  assert.deepEqual(defaultRange(10.04, 60), { t_start: 9, t_end: 12.5 });
});

test('defaultRange: boshida va oxirida siqiladi, doim yaroqli', () => {
  assert.deepEqual(defaultRange(0, 44), { t_start: 0, t_end: 2.5 });
  assert.deepEqual(defaultRange(0.4, 44), { t_start: 0, t_end: 2.9 });
  assert.deepEqual(defaultRange(44, 44), { t_start: 43, t_end: 44 });
  assert.deepEqual(defaultRange(43.9, 44), { t_start: 42.9, t_end: 44 });
  for (const now of [0, 0.01, 1, 20, 43.99, 44, 50, -3, Number.NaN]) {
    for (const duration of [0.3, 1, 5, 44.6, 300]) {
      const range = defaultRange(now, duration);
      assert.equal(validateRange(range.t_start, range.t_end, duration), null, `now=${now} duration=${duration} -> ${JSON.stringify(range)}`);
    }
  }
});

test('defaultRange: juda qisqa video', () => {
  const range = defaultRange(0, 0.3);
  assert.equal(range.t_start, 0);
  assert.ok(range.t_end > 0);
});

test('nudgeBound: +-0.5 va chegaralar', () => {
  assert.deepEqual(nudgeBound({ t_start: 12, t_end: 16 }, 'start', 0.5, 44), { t_start: 12.5, t_end: 16 });
  assert.deepEqual(nudgeBound({ t_start: 12, t_end: 16 }, 'end', -0.5, 44), { t_start: 12, t_end: 15.5 });
  assert.deepEqual(nudgeBound({ t_start: 0.2, t_end: 3 }, 'start', -0.5, 44), { t_start: 0, t_end: 3 });
  assert.deepEqual(nudgeBound({ t_start: 40, t_end: 44 }, 'end', 0.5, 44), { t_start: 40, t_end: 44 });
});

test('nudgeBound: boshlanish tugashdan o\'tib ketmaydi', () => {
  const r1 = nudgeBound({ t_start: 12, t_end: 12.3 }, 'start', 0.5, 44);
  assert.ok(r1.t_start < r1.t_end);
  assert.equal(r1.t_start, 12.2);
  const r2 = nudgeBound({ t_start: 12, t_end: 12.3 }, 'end', -0.5, 44);
  assert.ok(r2.t_start < r2.t_end);
  assert.equal(r2.t_end, 12.1);
});

test('setBound: aniq vaqt, tartib buzilmaydi', () => {
  assert.deepEqual(setBound({ t_start: 10, t_end: 14 }, 'start', 11.25, 44), { t_start: 11.25, t_end: 14 });
  assert.deepEqual(setBound({ t_start: 10, t_end: 14 }, 'end', 13, 44), { t_start: 10, t_end: 13 });
  // hozirgi vaqt tugashdan keyin: boshlanish tugashdan MIN_GAP oldin to'xtaydi
  assert.deepEqual(setBound({ t_start: 10, t_end: 14 }, 'start', 20, 44), { t_start: 13.9, t_end: 14 });
  // hozirgi vaqt boshlanishdan oldin: tugash boshlanishdan MIN_GAP keyin
  assert.deepEqual(setBound({ t_start: 10, t_end: 14 }, 'end', 3, 44), { t_start: 10, t_end: 10.1 });
  assert.deepEqual(setBound({ t_start: 10, t_end: 14 }, 'end', 99, 44), { t_start: 10, t_end: 44 });
  assert.ok(MIN_GAP > 0);
});

test('withLength: tayyor uzunlik chiplari', () => {
  assert.deepEqual(withLength({ t_start: 12, t_end: 14 }, 4, 44), { t_start: 12, t_end: 16 });
  assert.deepEqual(withLength({ t_start: 42, t_end: 43 }, 4, 44), { t_start: 42, t_end: 44 });
  assert.deepEqual(withLength({ t_start: 44, t_end: 44.1 }, 2.5, 44), { t_start: 43.9, t_end: 44 });
});

test('isVisibleAt va visibleAt: chegaralar EPS bilan', () => {
  const range = { t_start: 12, t_end: 16.5 };
  assert.equal(isVisibleAt(range, 12), true);
  assert.equal(isVisibleAt(range, 16.5), true);
  assert.equal(isVisibleAt(range, 11.96), true);
  assert.equal(isVisibleAt(range, 16.54), true);
  assert.equal(isVisibleAt(range, 11.9), false);
  assert.equal(isVisibleAt(range, 16.6), false);
  assert.equal(isVisibleAt(range, Number.NaN), false);
  const list = [range, { t_start: 20, t_end: 22 }, { t_start: 15, t_end: 21 }];
  assert.deepEqual(visibleAt(list, 16), [list[0], list[2]]);
  assert.deepEqual(visibleAt(list, 21.5), [list[1]]);
  assert.deepEqual(visibleAt(list, 30), []);
  assert.ok(EPS > 0);
});

test('isNearTime va suggestedAt: +-1.5 s', () => {
  assert.equal(isNearTime(13, 14.5), true);
  assert.equal(isNearTime(13, 11.5), true);
  assert.equal(isNearTime(13, 14.6), false);
  assert.equal(isNearTime(13, 11.4), false);
  assert.equal(isNearTime(Number.NaN, 11.4), false);
  const items = [{ t: 4 }, { t: 13 }, { t: 14 }];
  assert.deepEqual(suggestedAt(items, 13.5), [{ t: 13 }, { t: 14 }]);
  assert.deepEqual(suggestedAt(items, 100), []);
  assert.deepEqual(suggestedAt(items, 5.4, 1), []);
});

test('layoutRows: kesishmaydiganlar bir qatorda, kesishganlar boshqa qatorda', () => {
  assert.deepEqual(layoutRows([]), []);
  assert.deepEqual(layoutRows([{ t_start: 0, t_end: 2 }, { t_start: 2, t_end: 4 }, { t_start: 5, t_end: 6 }]), [0, 0, 0]);
  assert.deepEqual(layoutRows([{ t_start: 0, t_end: 5 }, { t_start: 1, t_end: 3 }, { t_start: 2, t_end: 6 }]), [0, 1, 2]);
  // kirish tartibi aralash: natija kirish indekslariga mos
  assert.deepEqual(layoutRows([{ t_start: 4, t_end: 6 }, { t_start: 0, t_end: 5 }]), [1, 0]);
  // qator ajralgach qayta ishlatiladi
  assert.deepEqual(layoutRows([{ t_start: 0, t_end: 3 }, { t_start: 1, t_end: 2 }, { t_start: 3, t_end: 5 }]), [0, 1, 0]);
});

test('layoutRows: maxRows dan oshmaydi', () => {
  const many = Array.from({ length: 10 }, () => ({ t_start: 0, t_end: 5 }));
  const rows = layoutRows(many, 4);
  assert.ok(Math.max(...rows) <= 3);
  assert.equal(rows.length, 10);
});
