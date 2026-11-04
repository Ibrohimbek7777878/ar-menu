import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_DWELL_MS, IDLE, autoPlaying, autoReduce, type AutoContext, type AutoEvent, type AutoState } from '../src/pages/TourPage/autoplay.ts';
import type { TourStop } from '../src/pages/TourPage/types.ts';

const stops: TourStop[] = [{ id: 1, title: 'Kirish', time: 0 }, { id: 2, title: 'Zal', time: 9.5 }, { id: 3, title: 'Bar', time: 20 }];
const CTX: AutoContext = { stops, duration: 44.6 };

/** Videoni soxta o'ynatish: har tick 100 ms; qaytgan snapTo bo'lsa video shu joyga o'tadi, pauza bo'lsa vaqt turadi. */
function simulate(startState: AutoState, startTime: number, ctx: AutoContext, seconds: number, step = 0.1) {
  let state = startState;
  let time = startTime;
  let now = 1000;
  let playing = true;
  const log: Array<{ at: number; mode: string; time: number }> = [];
  for (let i = 0; i < seconds / step; i++) {
    now += step * 1000;
    if (playing) time += step;
    const res = autoReduce(state, { type: 'tick', time, now }, ctx);
    if (res.snapTo !== null) time = res.snapTo;
    playing = res.play;
    if (res.state.mode !== state.mode) log.push({ at: Math.round(now), mode: res.state.mode, time: Math.round(time * 100) / 100 });
    state = res.state;
  }
  return { state, time, log };
}

test('start: nuqtada turgan joydan boshlansa o\'sha nuqtada to\'xtab turmaydi', () => {
  const r = autoReduce(IDLE, { type: 'start', time: 0 }, CTX);
  assert.deepEqual(r.state, { mode: 'playing', passed: 0 });
  assert.equal(r.play, true);
  assert.equal(r.snapTo, null);
  const mid = autoReduce(IDLE, { type: 'start', time: 12 }, CTX);
  assert.deepEqual(mid.state, { mode: 'playing', passed: 1 });
  const before = autoReduce(IDLE, { type: 'start', time: 9.4 }, CTX); // 9.5 ga 0.1 s qoldi — hali yetilmagan: keyingi nuqtada to'xtaydi
  assert.deepEqual(before.state, { mode: 'playing', passed: 0 });
  const atStop = autoReduce(IDLE, { type: 'start', time: 9.49 }, CTX); // nuqtaga deyarli yetgan joydan boshlansa, shu nuqta o'tilgan hisoblanadi
  assert.deepEqual(atStop.state, { mode: 'playing', passed: 1 });
});

test('start: oxirida yoki tugagan bo\'lsa boshidan (snapTo=0)', () => {
  const end = autoReduce(IDLE, { type: 'start', time: 44.55 }, CTX);
  assert.equal(end.snapTo, 0);
  assert.deepEqual(end.state, { mode: 'playing', passed: 0 });
  const finished = autoReduce({ mode: 'finished' }, { type: 'start', time: 10 }, CTX);
  assert.equal(finished.snapTo, 0);
  assert.equal(finished.play, true);
});

test('tick: nuqtaga yetganda to\'xtaydi, aniq nuqta vaqtiga o\'tadi, 1.5 s dan keyin davom etadi', () => {
  let r = autoReduce(IDLE, { type: 'start', time: 0 }, CTX);
  r = autoReduce(r.state, { type: 'tick', time: 9.4, now: 1000 }, CTX);
  assert.equal(r.state.mode, 'playing');
  r = autoReduce(r.state, { type: 'tick', time: 9.49, now: 2000 }, CTX);
  assert.equal(r.state.mode, 'holding');
  assert.equal(r.play, false);
  assert.equal(r.snapTo, 9.5);
  assert.deepEqual(r.state, { mode: 'holding', stopIndex: 1, until: 2000 + AUTO_DWELL_MS });
  const still = autoReduce(r.state, { type: 'tick', time: 9.5, now: 2000 + AUTO_DWELL_MS - 1 }, CTX);
  assert.equal(still.state.mode, 'holding');
  assert.equal(still.play, false);
  const resumed = autoReduce(still.state, { type: 'tick', time: 9.5, now: 2000 + AUTO_DWELL_MS }, CTX);
  assert.deepEqual(resumed.state, { mode: 'playing', passed: 1 });
  assert.equal(resumed.play, true);
  // o'sha nuqtada qayta to'xtamaydi
  const after = autoReduce(resumed.state, { type: 'tick', time: 9.5, now: 5000 }, CTX);
  assert.equal(after.state.mode, 'playing');
});

test('to\'liq sayr: boshidan oxirigacha har nuqtada ~1.5 s turadi, oxirida finished', () => {
  const start = autoReduce(IDLE, { type: 'start', time: 0 }, CTX);
  const { state, log } = simulate(start.state, 0, CTX, 70);
  assert.equal(state.mode, 'finished');
  assert.deepEqual(log.map((l) => l.mode), ['holding', 'playing', 'holding', 'playing', 'finished']);
  const holds = log.filter((l) => l.mode === 'holding');
  assert.deepEqual(holds.map((h) => h.time), [9.5, 20]);
  // to'xtash davomiyligi
  const h1 = log[0].at;
  const p1 = log[1].at;
  assert.ok(p1 - h1 >= AUTO_DWELL_MS && p1 - h1 <= AUTO_DWELL_MS + 150, `${p1 - h1}`);
});

test('nuqtalar yo\'q: to\'xtamasdan oxirigacha o\'ynaydi', () => {
  const ctx: AutoContext = { stops: [], duration: 10 };
  const start = autoReduce(IDLE, { type: 'start', time: 0 }, ctx);
  const { state, log } = simulate(start.state, 0, ctx, 15);
  assert.equal(state.mode, 'finished');
  assert.deepEqual(log.map((l) => l.mode), ['finished']);
});

test('bitta nuqta (boshida): to\'xtamaydi; bitta nuqta (o\'rtada): bir marta to\'xtaydi', () => {
  const first: AutoContext = { stops: [{ id: 1, title: 'a', time: 0 }], duration: 10 };
  const r1 = simulate(autoReduce(IDLE, { type: 'start', time: 0 }, first).state, 0, first, 15);
  assert.deepEqual(r1.log.map((l) => l.mode), ['finished']);
  const mid: AutoContext = { stops: [{ id: 1, title: 'a', time: 5 }], duration: 10 };
  const r2 = simulate(autoReduce(IDLE, { type: 'start', time: 0 }, mid).state, 0, mid, 15);
  assert.deepEqual(r2.log.map((l) => l.mode), ['holding', 'playing', 'finished']);
});

test('davomiylik noma\'lum (0): faqat `ended` tugatadi', () => {
  const ctx: AutoContext = { stops: [], duration: 0 };
  let r = autoReduce(IDLE, { type: 'start', time: 3 }, ctx);
  r = autoReduce(r.state, { type: 'tick', time: 9999, now: 1 }, ctx);
  assert.equal(r.state.mode, 'playing');
  r = autoReduce(r.state, { type: 'ended' }, ctx);
  assert.equal(r.state.mode, 'finished');
  assert.equal(r.play, false);
});

test('interrupt: har qanday holatdan idle (pauza); idle da ended/tick hech narsa qilmaydi', () => {
  for (const state of [{ mode: 'playing', passed: 0 }, { mode: 'holding', stopIndex: 1, until: 99 }, { mode: 'finished' }, IDLE] as AutoState[]) {
    const r = autoReduce(state, { type: 'interrupt' }, CTX);
    assert.deepEqual(r.state, IDLE);
    assert.equal(r.play, false);
    assert.equal(r.snapTo, null);
  }
  assert.deepEqual(autoReduce(IDLE, { type: 'ended' }, CTX).state, IDLE);
  assert.deepEqual(autoReduce(IDLE, { type: 'tick', time: 9.5, now: 1 }, CTX).state, IDLE);
  assert.deepEqual(autoReduce({ mode: 'finished' }, { type: 'tick', time: 9.5, now: 1 }, CTX).state, { mode: 'finished' });
});

test('autoPlaying: faqat playing va holding', () => {
  assert.equal(autoPlaying({ mode: 'playing', passed: 0 }), true);
  assert.equal(autoPlaying({ mode: 'holding', stopIndex: 0, until: 1 }), true);
  assert.equal(autoPlaying(IDLE), false);
  assert.equal(autoPlaying({ mode: 'finished' }), false);
});

test('noma\'lum hodisa holatni o\'zgartirmaydi', () => {
  const state: AutoState = { mode: 'playing', passed: 1 };
  const r = autoReduce(state, { type: 'bogus' } as unknown as AutoEvent, CTX);
  assert.deepEqual(r.state, state);
});
