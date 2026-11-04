import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOTION, clampTime, dragDeltaSeconds, estimateVelocity, flingTarget, holdSpeed, pastSlop, stepToward, wheelDeltaSeconds,
} from '../src/pages/TourPage/motion.ts';

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const STAGE = { width: 400, height: 800 };

test('clampTime: 0 dan oxirigacha (END_EPS qoldirib); NaN -> 0; davomiylik noma\'lum bo\'lsa faqat pastdan', () => {
  assert.equal(clampTime(-5, 44), 0);
  assert.equal(clampTime(10, 44), 10);
  close(clampTime(44, 44), 44 - MOTION.END_EPS);
  close(clampTime(999, 44), 44 - MOTION.END_EPS);
  assert.equal(clampTime(Number.NaN, 44), 0);
  assert.equal(clampTime(Number.POSITIVE_INFINITY, 44), 0);
  assert.equal(clampTime(500, 0), 500);
  assert.equal(clampTime(-1, 0), 0);
  assert.equal(clampTime(5, 0.01), 0); // juda qisqa video
});

test('dragDeltaSeconds: chapga/yuqoriga = oldinga (musbat), o\'ngga/pastga = orqaga', () => {
  assert.ok(dragDeltaSeconds(-100, 0, STAGE) > 0);
  assert.ok(dragDeltaSeconds(100, 0, STAGE) < 0);
  assert.ok(dragDeltaSeconds(0, -100, STAGE) > 0);
  assert.ok(dragDeltaSeconds(0, 100, STAGE) < 0);
  assert.equal(dragDeltaSeconds(0, 0, STAGE), 0);
});

test('dragDeltaSeconds: sahna kengligi bo\'ylab sudrash = DRAG_SPAN_SECONDS; ikki o\'q qo\'shiladi', () => {
  close(dragDeltaSeconds(-400, 0, STAGE), MOTION.DRAG_SPAN_SECONDS);
  close(dragDeltaSeconds(0, -800, STAGE), MOTION.DRAG_SPAN_SECONDS);
  close(dragDeltaSeconds(-200, -400, STAGE), MOTION.DRAG_SPAN_SECONDS);
  close(dragDeltaSeconds(-200, 400, STAGE), 0); // qarama-qarshi o'qlar bekor qiladi
});

test('dragDeltaSeconds: sahna o\'lchamsiz yoki NaN -> 0', () => {
  assert.equal(dragDeltaSeconds(-100, 0, { width: 0, height: 0 }), 0);
  assert.equal(dragDeltaSeconds(-100, 0, { width: 400, height: 0 }), 0);
  assert.equal(dragDeltaSeconds(Number.NaN, 0, STAGE), 0);
});

test('pastSlop: kichik siljish sudrash emas (belgiga bosish)', () => {
  assert.equal(pastSlop(0, 0), false);
  assert.equal(pastSlop(MOTION.DRAG_SLOP_PX, 0), false);
  assert.equal(pastSlop(MOTION.DRAG_SLOP_PX + 1, 0), true);
  assert.equal(pastSlop(6, 6), true);
  assert.equal(pastSlop(-3, 4), false);
});

test('stepToward: maqsadga monoton yaqinlashadi va hech qachon oshib o\'tmaydi', () => {
  let value = 0;
  let prev = -1;
  for (let i = 0; i < 200; i++) {
    value = stepToward(value, 10, 1 / 60, MOTION.TAU_JUMP_MS);
    assert.ok(value >= prev && value <= 10);
    prev = value;
  }
  assert.equal(value, 10);
  let down = 10;
  for (let i = 0; i < 200; i++) down = stepToward(down, 2, 1 / 60, 120);
  assert.equal(down, 2);
});

test('stepToward: tezlik chegarasi, nol dt, bir xil qiymat, tau=0 (darrov)', () => {
  close(stepToward(0, 100, 0.1, MOTION.TAU_JUMP_MS, 24), 2.4);
  close(stepToward(100, 0, 0.1, MOTION.TAU_JUMP_MS, 24), 97.6);
  assert.equal(stepToward(5, 10, 0, 100), 5);
  assert.equal(stepToward(5, 10, -1, 100), 5);
  assert.equal(stepToward(7, 7, 0.016, 100), 7);
  assert.equal(stepToward(0, 3, 0.016, 0), 3);
  // katta dt (fon varag'idan qaytish) maqsadni oshirmaydi
  assert.equal(stepToward(0, 1, 5, 50), 1);
});

test('stepToward: 0 dan 40 soniyaga sakrash taxminan 1.7 s ichida tugaydi (silliq, lekin tez)', () => {
  let value = 0;
  let frames = 0;
  while (value < 40 && frames < 600) {
    value = stepToward(value, 40, 1 / 60, MOTION.TAU_JUMP_MS, MOTION.JUMP_MAX_SPEED);
    frames++;
  }
  const seconds = frames / 60;
  assert.ok(seconds > 1.4 && seconds < 3.2, `${seconds}`);
});

test('holdSpeed: HOLD_AFTER_MS gacha 0, keyin BASE dan MAX gacha oshadi', () => {
  assert.equal(holdSpeed(0), 0);
  assert.equal(holdSpeed(MOTION.HOLD_AFTER_MS), 0);
  close(holdSpeed(MOTION.HOLD_AFTER_MS + 1), MOTION.HOLD_BASE, 0.01);
  assert.ok(holdSpeed(MOTION.HOLD_AFTER_MS + 500) > MOTION.HOLD_BASE);
  assert.equal(holdSpeed(60_000), MOTION.HOLD_MAX);
  assert.equal(holdSpeed(Number.NaN), 0);
});

test('estimateVelocity: oynadagi namunalardan; eski/bitta namuna -> 0', () => {
  const now = 1000;
  close(estimateVelocity([{ at: 940, value: 0 }, { at: 1000, value: 0.6 }], now), 10);
  assert.equal(estimateVelocity([], now), 0);
  assert.equal(estimateVelocity([{ at: 990, value: 1 }], now), 0);
  assert.equal(estimateVelocity([{ at: 100, value: 0 }, { at: 200, value: 5 }], now), 0); // eskirgan
  assert.equal(estimateVelocity([{ at: 990, value: 1 }, { at: 990, value: 2 }], now), 0); // bir vaqtda
  close(estimateVelocity([{ at: 950, value: 3 }, { at: 1000, value: 1 }], now), -40);
});

test('flingTarget: sekin harakat inersiyasiz; tez harakat davom etadi; chegarada to\'xtaydi', () => {
  assert.equal(flingTarget(10, 0.2, 44), 10);
  assert.equal(flingTarget(10, -0.2, 44), 10);
  close(flingTarget(10, 5, 44), 10 + 5 * MOTION.FLING_SECONDS);
  close(flingTarget(10, -5, 44), 10 - 5 * MOTION.FLING_SECONDS);
  assert.equal(flingTarget(1, -50, 44), 0);
  close(flingTarget(43, 50, 44), 44 - MOTION.END_EPS);
  assert.equal(flingTarget(5, Number.NaN, 44), 5);
});

test('wheelDeltaSeconds: pastga = oldinga; NaN -> 0', () => {
  assert.ok(wheelDeltaSeconds(100) > 0);
  assert.ok(wheelDeltaSeconds(-100) < 0);
  assert.equal(wheelDeltaSeconds(Number.NaN), 0);
  close(wheelDeltaSeconds(100), 100 * MOTION.WHEEL_SECONDS_PER_PX);
});
