import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COVER_MAX_CROP, DEFAULT_ASPECT, MARKER_EDGE_PX, aspectOf, chooseFit, cropFraction, fitFrame, placeHotspot, visibleWindow,
} from '../src/pages/TourPage/geometry.ts';

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('aspectOf: o\'lcham noma\'lum/yaroqsiz bo\'lsa standart 9:16', () => {
  close(aspectOf({ width: 720, height: 1280 }), 0.5625);
  close(aspectOf({ width: 1920, height: 1080 }), 16 / 9);
  assert.equal(aspectOf({ width: 0, height: 0 }), DEFAULT_ASPECT);
  assert.equal(aspectOf({ width: -1, height: 100 }), DEFAULT_ASPECT);
  assert.equal(aspectOf({ width: Number.NaN, height: 100 }), DEFAULT_ASPECT);
});

test('fitFrame contain: vertikal video gorizontal sahnada markazda, yon tomonlari bo\'sh', () => {
  const frame = fitFrame({ width: 1440, height: 900 }, { width: 720, height: 1280 }, 'contain');
  close(frame.height, 900);
  close(frame.width, 506.25);
  close(frame.left, (1440 - 506.25) / 2);
  close(frame.top, 0);
});

test('fitFrame contain: vertikal video telefon sahnasida — tepa/past qora chiziqlar', () => {
  const frame = fitFrame({ width: 360, height: 780 }, { width: 720, height: 1280 }, 'contain');
  close(frame.width, 360);
  close(frame.height, 640);
  close(frame.left, 0);
  close(frame.top, 70);
});

test('fitFrame contain: gorizontal video vertikal sahnada', () => {
  const frame = fitFrame({ width: 390, height: 844 }, { width: 1920, height: 1080 }, 'contain');
  close(frame.width, 390);
  close(frame.height, 390 / (16 / 9));
  close(frame.left, 0);
  close(frame.top, (844 - frame.height) / 2);
});

test('fitFrame cover: sahna to\'ladi, ortig\'i qirqiladi (kadr sahnadan katta)', () => {
  const frame = fitFrame({ width: 360, height: 780 }, { width: 720, height: 1280 }, 'cover');
  close(frame.height, 780);
  close(frame.width, 780 * 0.5625);
  assert.ok(frame.left < 0);
  close(frame.left, (360 - frame.width) / 2);
  close(frame.top, 0);
});

test('fitFrame: nisbatlar teng bo\'lsa contain == cover == sahna', () => {
  const stage = { width: 450, height: 800 };
  const video = { width: 720, height: 1280 };
  for (const mode of ['contain', 'cover'] as const) {
    const f = fitFrame(stage, video, mode);
    close(f.left, 0); close(f.top, 0); close(f.width, 450); close(f.height, 800);
  }
});

test('fitFrame: sahna o\'lchamsiz -> nol to\'rtburchak; video noma\'lum -> 9:16', () => {
  assert.deepEqual(fitFrame({ width: 0, height: 500 }, { width: 720, height: 1280 }, 'contain'), { left: 0, top: 0, width: 0, height: 0 });
  assert.deepEqual(fitFrame({ width: Number.NaN, height: 500 }, { width: 1, height: 1 }, 'cover'), { left: 0, top: 0, width: 0, height: 0 });
  const f = fitFrame({ width: 900, height: 900 }, { width: 0, height: 0 }, 'contain');
  close(f.width / f.height, DEFAULT_ASPECT);
});

test('fitFrame: juda katta va juda kichik video nisbatlari', () => {
  const wide = fitFrame({ width: 400, height: 400 }, { width: 10000, height: 100 }, 'contain');
  close(wide.width, 400); close(wide.height, 4);
  const tall = fitFrame({ width: 400, height: 400 }, { width: 100, height: 10000 }, 'contain');
  close(tall.height, 400); close(tall.width, 4);
});

test('cropFraction: teng nisbat 0; telefon 360x780 + 9:16 ~ 0.17', () => {
  close(cropFraction({ width: 450, height: 800 }, { width: 720, height: 1280 }), 0);
  const crop = cropFraction({ width: 360, height: 780 }, { width: 720, height: 1280 });
  close(crop, 1 - 360 / (780 * 0.5625), 1e-9);
  assert.ok(crop > COVER_MAX_CROP);
  assert.equal(cropFraction({ width: 0, height: 0 }, { width: 1, height: 1 }), 0);
});

test('visibleWindow: cover da ko\'rinadigan oyna simmetrik; contain-mos sahnada to\'liq', () => {
  const full = visibleWindow({ width: 450, height: 800 }, { width: 720, height: 1280 });
  assert.deepEqual(full, { x0: 0, x1: 1, y0: 0, y1: 1 });
  const win = visibleWindow({ width: 360, height: 780 }, { width: 720, height: 1280 });
  close(win.x0, (1 - 360 / (780 * 0.5625)) / 2);
  close(win.x1, 1 - win.x0);
  close(win.y0, 0);
  close(win.y1, 1);
  assert.deepEqual(visibleWindow({ width: 0, height: 0 }, { width: 1, height: 1 }), { x0: 0, x1: 1, y0: 0, y1: 1 });
});

test('chooseFit: katta qirqim -> contain; kichik qirqim + belgilar ichkarida -> cover', () => {
  const video = { width: 720, height: 1280 };
  // 360x780: qirqim ~17% > 15%
  assert.equal(chooseFit({ width: 360, height: 780 }, video, []), 'contain');
  // 400x780: qirqim kichik
  const stage = { width: 400, height: 740 };
  assert.ok(cropFraction(stage, video) <= COVER_MAX_CROP);
  assert.equal(chooseFit(stage, video, []), 'cover');
  assert.equal(chooseFit(stage, video, [{ x: 0.5, y: 0.5 }, { x: 0.2, y: 0.9 }]), 'cover');
});

test('chooseFit: chetdagi belgi cover ni taqiqlaydi (kesilib ketmasin)', () => {
  const video = { width: 720, height: 1280 };
  const stage = { width: 400, height: 740 };
  const win = visibleWindow(stage, video);
  assert.ok(win.x0 > 0);
  assert.equal(chooseFit(stage, video, [{ x: 0.02, y: 0.5 }]), 'contain');
  assert.equal(chooseFit(stage, video, [{ x: 0.98, y: 0.5 }]), 'contain');
  assert.equal(chooseFit(stage, video, [{ x: win.x0 + 0.01, y: 0.5 }]), 'contain'); // chegara marginidan ichkarida emas
});

test('chooseFit: o\'lcham noma\'lum -> contain', () => {
  assert.equal(chooseFit({ width: 0, height: 0 }, { width: 720, height: 1280 }, []), 'contain');
  assert.equal(chooseFit({ width: 400, height: 700 }, { width: 0, height: 0 }, []), 'contain');
});

test('placeHotspot: kadr koordinatasi -> sahna pikseli (contain, markazlangan kadr)', () => {
  const stage = { width: 1440, height: 900 };
  const frame = fitFrame(stage, { width: 720, height: 1280 }, 'contain');
  const mid = placeHotspot(frame, stage, 0.5, 0.5);
  close(mid.left, 720); close(mid.top, 450);
  const corner = placeHotspot(frame, stage, 0, 0);
  close(corner.left, frame.left + 0); // kadr chetida, lekin sahna ichida
  close(corner.top, MARKER_EDGE_PX); // sahna chetidan edge ichkariga
  const sample = placeHotspot(frame, stage, 0.52, 0.61);
  close(sample.left, frame.left + 0.52 * frame.width);
  close(sample.top, 0.61 * frame.height);
});

test('placeHotspot: cover da kadr sahnadan katta — belgi sahna ichiga qisiladi', () => {
  const stage = { width: 400, height: 740 };
  const frame = fitFrame(stage, { width: 720, height: 1280 }, 'cover');
  const p = placeHotspot(frame, stage, 0.0, 1.0);
  assert.ok(p.left >= MARKER_EDGE_PX && p.left <= stage.width - MARKER_EDGE_PX);
  assert.ok(p.top >= MARKER_EDGE_PX && p.top <= stage.height - MARKER_EDGE_PX);
});

test('placeHotspot: 0..1 dan tashqari/NaN qiymat qirqiladi; juda tor sahna markazda', () => {
  const stage = { width: 300, height: 600 };
  const frame = fitFrame(stage, { width: 300, height: 600 }, 'contain');
  const out = placeHotspot(frame, stage, 5, -5);
  close(out.left, 300 - MARKER_EDGE_PX); close(out.top, MARKER_EDGE_PX);
  const nan = placeHotspot(frame, stage, Number.NaN, Number.NaN);
  close(nan.left, 150); close(nan.top, 300);
  const tiny = placeHotspot({ left: 0, top: 0, width: 30, height: 30 }, { width: 30, height: 30 }, 0.9, 0.9);
  close(tiny.left, 15); close(tiny.top, 15);
});
