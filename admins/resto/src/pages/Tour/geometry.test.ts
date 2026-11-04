import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clamp01, containRect, dragTo, normalizedToPoint, nudgePoint, pointToNormalized, round4 } from './geometry.ts';

const near = (actual: number, expected: number, message?: string) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ''} ${actual} != ${expected}`);

test('containRect: video qutiga aynan mos (chiziqsiz)', () => {
  const rect = containRect({ width: 360, height: 640 }, { width: 720, height: 1280 });
  near(rect.left, 0); near(rect.top, 0); near(rect.width, 360); near(rect.height, 640);
});

test('containRect: quti kengroq -> yon chiziqlar (pillarbox)', () => {
  // vertikal video 720x1280 keng qutida 800x640
  const rect = containRect({ width: 800, height: 640 }, { width: 720, height: 1280 });
  near(rect.height, 640); near(rect.width, 360); near(rect.left, 220); near(rect.top, 0);
});

test('containRect: quti balandroq -> tepa-past chiziqlar (letterbox)', () => {
  // gorizontal video 1920x1080 telefon qutisida 360x640
  const rect = containRect({ width: 360, height: 640 }, { width: 1920, height: 1080 });
  near(rect.width, 360); near(rect.height, 202.5); near(rect.left, 0); near(rect.top, 218.75);
});

test('containRect: kattalashtirish ham ishlaydi (kichik video katta qutida)', () => {
  const rect = containRect({ width: 1000, height: 1000 }, { width: 100, height: 50 });
  near(rect.width, 1000); near(rect.height, 500); near(rect.top, 250);
});

test('containRect: noma\'lum o\'lchamlar', () => {
  assert.deepEqual(containRect({ width: 300, height: 200 }, { width: 0, height: 0 }), { left: 0, top: 0, width: 300, height: 200 });
  assert.deepEqual(containRect({ width: 300, height: 200 }, { width: Number.NaN, height: 100 }), { left: 0, top: 0, width: 300, height: 200 });
  assert.deepEqual(containRect({ width: 0, height: 0 }, { width: 720, height: 1280 }), { left: 0, top: 0, width: 0, height: 0 });
  assert.deepEqual(containRect({ width: -5, height: 10 }, { width: 720, height: 1280 }), { left: 0, top: 0, width: 0, height: 10 });
});

test('pointToNormalized: markaz va burchaklar (letterbox hisobga olinadi)', () => {
  const content = containRect({ width: 800, height: 640 }, { width: 720, height: 1280 }); // left 220, width 360
  assert.deepEqual(pointToNormalized({ x: 400, y: 320 }, content), { x: 0.5, y: 0.5 });
  assert.deepEqual(pointToNormalized({ x: 220, y: 0 }, content), { x: 0, y: 0 });
  assert.deepEqual(pointToNormalized({ x: 580, y: 640 }, content), { x: 1, y: 1 });
  assert.deepEqual(pointToNormalized({ x: 310, y: 160 }, content), { x: 0.25, y: 0.25 });
});

test('pointToNormalized: chiziq (kontentdan tashqari) bosilsa null', () => {
  const content = containRect({ width: 800, height: 640 }, { width: 720, height: 1280 });
  assert.equal(pointToNormalized({ x: 100, y: 300 }, content), null);
  assert.equal(pointToNormalized({ x: 700, y: 300 }, content), null);
  assert.equal(pointToNormalized({ x: 400, y: -5 }, content), null);
  assert.equal(pointToNormalized({ x: 400, y: 700 }, content), null);
  // cheklovdan biroz tashqarida (0.5 px) hali ichkarida
  assert.deepEqual(pointToNormalized({ x: 219.8, y: 0 }, content), { x: 0, y: 0 });
});

test('pointToNormalized: clamp rejimi (sudrash) chegaraga siqadi', () => {
  const content = { left: 10, top: 20, width: 100, height: 200 };
  assert.deepEqual(pointToNormalized({ x: -50, y: 1000 }, content, { clamp: true }), { x: 0, y: 1 });
  assert.deepEqual(pointToNormalized({ x: 500, y: -1 }, content, { clamp: true }), { x: 1, y: 0 });
});

test('pointToNormalized: yaroqsiz kiritish null', () => {
  assert.equal(pointToNormalized({ x: 5, y: 5 }, { left: 0, top: 0, width: 0, height: 10 }), null);
  assert.equal(pointToNormalized({ x: Number.NaN, y: 5 }, { left: 0, top: 0, width: 10, height: 10 }), null);
  assert.equal(pointToNormalized({ x: 5, y: 5 }, { left: 0, top: 0, width: 10, height: Number.NaN }), null);
});

test('pointToNormalized va normalizedToPoint bir-biriga teskari', () => {
  const content = containRect({ width: 360, height: 640 }, { width: 1920, height: 1080 });
  for (const point of [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.75 }, { x: 0, y: 1 }]) {
    const px = normalizedToPoint(point, content);
    const back = pointToNormalized(px, content);
    assert.ok(back);
    near(back.x, point.x, 'x'); near(back.y, point.y, 'y');
  }
});

test('normalizedToPoint: 0..1 dan tashqari qiymat siqiladi', () => {
  const content = { left: 10, top: 20, width: 100, height: 200 };
  assert.deepEqual(normalizedToPoint({ x: -1, y: 2 }, content), { x: 10, y: 220 });
});

test('dragTo: siljitish va chegaralar', () => {
  const content = { left: 0, top: 0, width: 200, height: 400 };
  assert.deepEqual(dragTo({ x: 0.5, y: 0.5 }, 20, -40, content), { x: 0.6, y: 0.4 });
  assert.deepEqual(dragTo({ x: 0.9, y: 0.1 }, 100, -100, content), { x: 1, y: 0 });
  assert.deepEqual(dragTo({ x: 0.5, y: 0.5 }, 10, 10, { left: 0, top: 0, width: 0, height: 0 }), { x: 0.5, y: 0.5 });
});

test('nudgePoint, clamp01, round4', () => {
  assert.deepEqual(nudgePoint({ x: 0.5, y: 0.5 }, 0.01, -0.01), { x: 0.51, y: 0.49 });
  assert.deepEqual(nudgePoint({ x: 0.995, y: 0.003 }, 0.01, -0.01), { x: 1, y: 0 });
  assert.equal(clamp01(Number.NaN), 0);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(-2), 0);
  assert.equal(round4(0.123456), 0.1235);
});
