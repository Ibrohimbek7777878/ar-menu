import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, type FrameInfo, type PlayerVideo } from '../src/pages/TourPage/player.ts';
import { AUTO_DWELL_MS } from '../src/pages/TourPage/autoplay.ts';
import { MOTION } from '../src/pages/TourPage/motion.ts';
import type { TourStop } from '../src/pages/TourPage/types.ts';

const close = (a: number, b: number, eps = 0.03) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);

/** Soxta video + soat + rAF: 16 ms kadrlar; seek `seekMs` davom etadi; o'ynaganda vaqt o'zi yuradi. */
function harness(opts: { duration?: number; seekMs?: number; stops?: TourStop[]; smooth?: boolean } = {}) {
  const duration = opts.duration ?? 44;
  const seekMs = opts.seekMs ?? 60;
  const clock = { now: 0 };
  const queue: Array<() => void> = [];
  const listeners = new Map<string, Set<() => void>>();
  const frames: FrameInfo[] = [];
  const state = { hidden: false, smooth: opts.smooth ?? true };

  const video = {
    _t: 0,
    target: null as number | null,
    doneAt: 0,
    paused: true,
    playbackRate: 1,
    assignments: [] as number[],
    assignedWhileSeeking: 0,
    playCalls: 0,
    get currentTime() { return this.target ?? this._t; },
    set currentTime(v: number) {
      if (this.target !== null) this.assignedWhileSeeking++;
      this.target = v;
      this.doneAt = clock.now + seekMs;
      this.assignments.push(v);
    },
    get seeking() { return this.target !== null; },
    play() { this.paused = false; this.playCalls++; return Promise.resolve(); },
    pause() { this.paused = true; },
    addEventListener(type: string, l: () => void) { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(l); },
    removeEventListener(type: string, l: () => void) { listeners.get(type)?.delete(l); },
    emit(type: string) { for (const l of [...(listeners.get(type) ?? [])]) l(); },
  };

  const player = createPlayer({
    video: video as unknown as PlayerVideo,
    stops: () => opts.stops ?? [],
    duration: () => duration,
    onFrame: (f) => frames.push(f),
    raf: (cb) => queue.push(cb),
    caf: () => { queue.length = 0; },
    now: () => clock.now,
    smooth: () => state.smooth,
    hidden: () => state.hidden,
  });

  /** `ms` millisekund: har 16 ms da video holati yangilanadi, so'ng rAF qayta chaqiruvlari bajariladi */
  const run = (ms: number) => {
    const end = clock.now + ms;
    while (clock.now < end) {
      clock.now += 16;
      if (video.target !== null && clock.now >= video.doneAt) {
        video._t = video.target;
        video.target = null;
        video.emit('seeked');
      }
      if (!video.paused && video.target === null) {
        video._t += 0.016 * video.playbackRate;
        if (video._t >= duration) {
          video._t = duration;
          video.paused = true;
          video.emit('ended');
        }
      }
      const callbacks = queue.splice(0);
      for (const cb of callbacks) cb();
    }
  };
  return { player, video, run, frames, state, clock, queueLength: () => queue.length };
}

const STOPS: TourStop[] = [{ id: 1, title: 'a', time: 0 }, { id: 2, title: 'b', time: 5 }, { id: 3, title: 'c', time: 12 }];

test('jumpTo: silliq boradi, tezlik chegarasidan oshmaydi, oxirida aniq joyga qo\'nadi va aylanish to\'xtaydi', () => {
  const h = harness();
  h.player.jumpTo(30);
  h.run(500);
  assert.ok(h.player.time() > 2, 'harakatlanishi kerak');
  assert.ok(h.player.time() <= MOTION.JUMP_MAX_SPEED * 0.55 + 0.5, `${h.player.time()}`);
  h.run(3000);
  close(h.player.time(), 30, 0.01);
  close(h.video.currentTime, 30, 0.03);
  assert.equal(h.queueLength(), 0, 'harakat tugagach rAF aylanishi to\'xtaydi');
});

test('seek lari bitta-bitta: ketayotgan seek paytida yangi currentTime berilmaydi', () => {
  const h = harness({ seekMs: 120 });
  h.player.jumpTo(40);
  h.run(3000);
  assert.equal(h.video.assignedWhileSeeking, 0);
  assert.ok(h.video.assignments.length < 40, `${h.video.assignments.length} ta seek`);
  assert.ok(h.video.assignments.length >= 2);
  close(h.video.currentTime, 40, 0.03);
});

test('holdStart: tez bosish = bir qadam; ushlab tursa uzluksiz yuradi; holdEnd to\'xtatadi', () => {
  const h = harness();
  h.player.step(MOTION.TAP_STEP_SECONDS); // 0 -> 0.9
  h.run(1000);
  close(h.player.time(), MOTION.TAP_STEP_SECONDS, 0.02);
  const h2 = harness();
  h2.player.holdStart(1);
  h2.run(1500);
  const moving = h2.player.time();
  assert.ok(moving > MOTION.TAP_STEP_SECONDS + 1, `${moving}`);
  h2.player.holdEnd();
  h2.run(1000);
  const settled = h2.player.time();
  h2.run(1000);
  close(h2.player.time(), settled, 0.001);
  assert.equal(h2.queueLength(), 0);
});

test('hold: boshidan orqaga va oxiridan oldinga chegarada to\'xtaydi', () => {
  const h = harness({ duration: 10 });
  h.player.holdStart(-1);
  h.run(2000);
  h.player.holdEnd();
  h.run(500);
  assert.equal(h.player.time(), 0);
  h.player.holdStart(1);
  h.run(8000);
  h.player.holdEnd();
  h.run(1000);
  close(h.player.time(), 10 - MOTION.END_EPS, 0.01);
});

test('sudrash: dragTo vaqtni ushlaydi, dragEnd tezligi inersiya beradi, sekin qo\'yish inersiyasiz', () => {
  const h = harness();
  h.player.seekTo(20);
  h.player.dragStart();
  h.player.dragTo(3);
  h.run(600);
  close(h.player.time(), 23, 0.05);
  h.player.dragTo(-2);
  h.run(600);
  close(h.player.time(), 18, 0.05);
  h.player.dragEnd(0.1);
  h.run(1500);
  close(h.player.time(), 18, 0.05);

  const h2 = harness();
  h2.player.seekTo(20);
  h2.player.dragStart();
  h2.player.dragTo(2);
  h2.run(400);
  h2.player.dragEnd(10);
  h2.run(2000);
  close(h2.player.time(), 22 + 10 * MOTION.FLING_SECONDS, 0.1);
});

test('dragTo dragStart siz ta\'sir qilmaydi; dragEnd ikki marta zararsiz', () => {
  const h = harness();
  h.player.dragTo(9);
  h.run(500);
  assert.equal(h.player.time(), 0);
  h.player.dragStart();
  h.player.dragEnd(0);
  h.player.dragEnd(5);
  h.run(500);
  assert.equal(h.player.time(), 0);
});

test('smooth=false (harakatni kamaytirish): vaqt maqsadga darrov o\'tadi', () => {
  const h = harness({ smooth: false });
  h.player.jumpTo(25);
  assert.equal(h.player.time(), 25);
  h.run(500);
  close(h.video.currentTime, 25, 0.03);
});

test('avtoyurish: oddiy tezlikda o\'ynaydi, har nuqtada 1.5 s to\'xtaydi, oxirida finished; qayta bosilsa boshidan', () => {
  const h = harness({ duration: 20, stops: STOPS, seekMs: 30 });
  h.player.toggleAuto();
  assert.equal(h.player.autoMode(), 'playing');
  assert.equal(h.video.paused, false);
  assert.equal(h.video.playbackRate, 1);
  h.run(5200); // 5 s ga yetdi -> 2-nuqtada to'xtaydi
  assert.equal(h.player.autoMode(), 'holding');
  assert.equal(h.video.paused, true);
  close(h.video.currentTime, 5, 0.05);
  const stuckAt = h.video.currentTime;
  h.run(AUTO_DWELL_MS - 400);
  assert.equal(h.player.autoMode(), 'holding');
  close(h.video.currentTime, stuckAt, 0.001);
  h.run(700);
  assert.equal(h.player.autoMode(), 'playing');
  assert.equal(h.video.paused, false);
  h.run(30_000);
  assert.equal(h.player.autoMode(), 'finished');
  assert.equal(h.video.paused, true);
  h.player.toggleAuto();
  assert.equal(h.player.autoMode(), 'playing');
  assert.ok(h.video.currentTime < 1);
});

test('avtoyurish: mehmon aralashsa (tugma, sudrash, nuqtaga sakrash) to\'xtaydi va video pauzada qoladi', () => {
  for (const act of [
    (p: ReturnType<typeof harness>['player']) => p.holdStart(1),
    (p: ReturnType<typeof harness>['player']) => p.dragStart(),
    (p: ReturnType<typeof harness>['player']) => p.jumpTo(3),
    (p: ReturnType<typeof harness>['player']) => p.step(1),
    (p: ReturnType<typeof harness>['player']) => p.nudge(1),
    (p: ReturnType<typeof harness>['player']) => p.interrupt(),
  ]) {
    const h = harness({ duration: 30, stops: STOPS });
    h.player.toggleAuto();
    h.run(1500);
    assert.equal(h.player.autoMode(), 'playing');
    act(h.player);
    assert.equal(h.player.autoMode(), 'idle');
    assert.equal(h.video.paused, true);
  }
});

test('avtoyurish: toggle ikkinchi marta bosilsa to\'xtaydi; vaqt videodan o\'qiladi', () => {
  const h = harness({ duration: 30 });
  h.player.toggleAuto();
  h.run(2000);
  const t = h.video.currentTime;
  assert.ok(t > 1.5);
  h.player.toggleAuto();
  assert.equal(h.player.autoMode(), 'idle');
  assert.equal(h.video.paused, true);
  close(h.player.time(), h.video.currentTime, 0.1);
});

test('fon varag\'i (hidden): avtoyurish to\'xtaydi, aylanish to\'xtaydi; wake() qayta ishga tushiradi', () => {
  const h = harness({ duration: 30 });
  h.player.toggleAuto();
  h.run(500);
  h.state.hidden = true;
  h.run(100);
  assert.equal(h.player.autoMode(), 'idle');
  assert.equal(h.video.paused, true);
  assert.equal(h.queueLength(), 0);
  h.state.hidden = false;
  h.player.jumpTo(10);
  h.run(2500);
  close(h.player.time(), 10, 0.05);
});

test('suspend/resume (manba almashganda): harakat to\'xtaydi, seek yuborilmaydi; resume joyni qayta so\'raydi', () => {
  const h = harness();
  h.player.seekTo(10);
  h.run(300);
  const before = h.video.assignments.length;
  h.player.jumpTo(20);
  h.player.suspend();
  h.run(1000);
  assert.equal(h.video.assignments.length, before);
  h.player.resume();
  h.run(3000);
  close(h.video.currentTime, h.player.time(), 0.05);
});

test('seekTo: darrov joyni qo\'yadi (resume); chegaradan chiqsa qirqiladi', () => {
  const h = harness({ duration: 44 });
  h.player.seekTo(23.5);
  assert.equal(h.player.time(), 23.5);
  h.run(300);
  close(h.video.currentTime, 23.5, 0.001);
  h.player.seekTo(500);
  close(h.player.time(), 44 - MOTION.END_EPS, 1e-9);
  h.player.seekTo(-3);
  assert.equal(h.player.time(), 0);
});

test('destroy: aylanish to\'xtaydi, videoni pauza qiladi, keyingi chaqiruvlar zararsiz', () => {
  const h = harness();
  h.player.toggleAuto();
  h.run(200);
  h.player.destroy();
  assert.equal(h.video.paused, true);
  const frames = h.frames.length;
  h.run(500);
  assert.equal(h.frames.length, frames);
  assert.doesNotThrow(() => h.player.jumpTo(5));
});

test('onFrame: har kadrda joriy vaqt va avtoyurish holati beriladi', () => {
  const h = harness();
  h.player.jumpTo(5);
  h.run(400);
  const last = h.frames[h.frames.length - 1];
  assert.ok(last.time > 0);
  assert.equal(last.auto, 'idle');
});
