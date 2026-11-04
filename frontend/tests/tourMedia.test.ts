import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOW_AFTER_MS, createMediaLoader, type MediaVideo, type UpgradeState } from '../src/pages/TourPage/media.ts';
import { planVariants } from '../src/pages/TourPage/network.ts';
import type { TourVideo } from '../src/pages/TourPage/types.ts';

const VIDEO: TourVideo = { scrub: '/m/scrub.mp4', play: '/m/play.mp4', low: '/m/low.mp4', poster: '/m/poster.jpg' };
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const flush = async (n = 8) => { for (let i = 0; i < n; i++) await tick(); };

class FakeVideo {
  src = '';
  preload = '';
  muted = false;
  currentTime = 0;
  duration = 44.6;
  videoWidth = 720;
  videoHeight = 1280;
  loads = 0;
  removed: string[] = [];
  private listeners = new Map<string, Set<() => void>>();
  get currentSrc() { return this.src; }
  load() { this.loads++; }
  removeAttribute(name: string) { this.removed.push(name); if (name === 'src') this.src = ''; }
  addEventListener(type: string, l: () => void) { (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)!).add(l); }
  removeEventListener(type: string, l: () => void) { this.listeners.get(type)?.delete(l); }
  emit(type: string) { for (const l of [...(this.listeners.get(type) ?? [])]) l(); }
  count(type: string) { return this.listeners.get(type)?.size ?? 0; }
}

function fakeResponse(chunks: Uint8Array[], opts: { ok?: boolean; length?: number | null; stream?: boolean } = {}) {
  let i = 0;
  const total = opts.length === undefined ? chunks.reduce((a, c) => a + c.byteLength, 0) : opts.length;
  return {
    ok: opts.ok ?? true,
    headers: { get: (name: string) => (name === 'content-length' ? (total === null ? null : String(total)) : name === 'content-type' ? 'video/mp4' : null) },
    body: opts.stream === false ? null : { getReader: () => ({ read: async () => (i < chunks.length ? { done: false, value: chunks[i++] } : { done: true, value: undefined }) }) },
    blob: async () => new Blob(chunks as Uint8Array<ArrayBuffer>[], { type: 'video/mp4' }),
  };
}

function setup(conn: Parameters<typeof planVariants>[1] = {}, fetchImpl?: (url: string, init?: RequestInit) => Promise<unknown>, video: TourVideo = VIDEO) {
  const v = new FakeVideo();
  const plan = planVariants(video, conn)!;
  const log: string[] = [];
  const statuses: Array<[string, string | null]> = [];
  const upgrades: Array<[UpgradeState, number]> = [];
  const timers: Array<{ cb: () => void; ms: number; id: number; done: boolean }> = [];
  const fetchCalls: Array<{ url: string; signal?: AbortSignal | null }> = [];
  const revoked: string[] = [];
  let blobCounter = 0;
  let auto = false;
  let slow = 0;
  const meta: Array<{ duration: number; width: number; height: number }> = [];

  const loader = createMediaLoader({
    video: v as unknown as MediaVideo,
    urls: { scrub: video.scrub, play: video.play, low: video.low },
    plan,
    events: {
      onStatus: (s, variant) => statuses.push([s, variant]),
      onUpgrade: (s, p) => upgrades.push([s, p]),
      onSlow: () => { slow++; },
      onMetadata: (m) => meta.push(m),
    },
    hooks: {
      time: () => 12.5,
      suspend: () => log.push('suspend'),
      resume: () => log.push('resume'),
      autoActive: () => auto,
      freeze: (on) => log.push(on ? 'freeze' : 'unfreeze'),
    },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetchCalls.push({ url: String(input), signal: init?.signal });
      if (!fetchImpl) throw new Error('fetch kutilmagan');
      return fetchImpl(String(input), init);
    }) as typeof fetch,
    createObjectURL: () => `blob:fake-${++blobCounter}`,
    revokeObjectURL: (u) => revoked.push(u),
    setTimeout: (cb, ms) => {
      const id = timers.length + 1;
      timers.push({ cb, ms, id, done: false });
      return id;
    },
    clearTimeout: (id) => { const t = timers.find((x) => x.id === id); if (t) t.done = true; },
  });
  const fire = (ms: number) => { for (const t of timers.filter((x) => !x.done && x.ms === ms)) { t.done = true; t.cb(); } };
  return {
    v, loader, log, statuses, upgrades, timers, fetchCalls, revoked, meta, fire,
    setAuto: (value: boolean) => { auto = value; },
    slowCount: () => slow,
  };
}

const bytes = (n: number) => new Uint8Array(n).fill(7);

test('boshlash: low yuklanadi (poster ostida), tayyor bo\'lganda status ready va metama\'lumot beriladi', () => {
  const s = setup({}, async () => fakeResponse([bytes(10)]));
  s.loader.start();
  assert.equal(s.v.src, '/m/low.mp4');
  assert.equal(s.v.muted, true);
  assert.equal(s.v.preload, 'auto');
  assert.equal(s.v.loads, 1);
  assert.deepEqual(s.statuses, []);
  s.v.emit('loadedmetadata');
  assert.deepEqual(s.meta, [{ duration: 44.6, width: 720, height: 1280 }]);
  s.v.emit('loadeddata');
  assert.deepEqual(s.statuses[0], ['ready', 'low']);
});

test('sekin tarmoq: 8 s ichida birinchi kadr kelmasa onSlow; kelsa taymer bekor', () => {
  const s = setup();
  s.loader.start();
  assert.ok(s.timers.some((t) => t.ms === SLOW_AFTER_MS));
  s.fire(SLOW_AFTER_MS);
  assert.equal(s.slowCount(), 1);
  const ok = setup({}, async () => fakeResponse([bytes(5)]));
  ok.loader.start();
  ok.v.emit('loadeddata');
  ok.fire(SLOW_AFTER_MS);
  assert.equal(ok.slowCount(), 0);
});

test('xatolar zanjiri: low ochilmasa play, so\'ng scrub; hammasi xato -> failed', () => {
  const s = setup();
  s.loader.start();
  assert.equal(s.v.src, '/m/low.mp4');
  s.v.emit('error');
  assert.equal(s.v.src, '/m/play.mp4');
  s.v.emit('error');
  assert.equal(s.v.src, '/m/scrub.mp4');
  s.v.emit('error');
  assert.deepEqual(s.statuses, [['failed', null]]);
  assert.equal(s.fetchCalls.length, 0);
});

test('retry: failed dan keyin boshidan urinadi', () => {
  const s = setup({}, undefined, { ...VIDEO, play: null, scrub: null });
  s.loader.start();
  s.v.emit('error');
  assert.deepEqual(s.statuses, [['failed', null]]);
  s.loader.retry();
  assert.equal(s.v.src, '/m/low.mp4');
  s.v.emit('loadeddata');
  assert.deepEqual(s.statuses[1], ['ready', 'low']);
});

test('almashtirish: scrub blob sifatida to\'liq yuklanadi (foiz), kadr muzlatiladi, o\'sha vaqtga qaytiladi, status scrub', async () => {
  const s = setup({}, async () => fakeResponse([bytes(100), bytes(100), bytes(50)]));
  s.loader.start();
  s.v.emit('loadeddata'); // low tayyor -> scrub yuklashni boshlaydi
  await flush();
  assert.equal(s.fetchCalls.length, 1);
  assert.equal(s.fetchCalls[0].url, '/m/scrub.mp4');
  const loading = s.upgrades.filter(([st]) => st === 'loading');
  assert.deepEqual(loading.map(([, p]) => Math.round(p * 100)), [0, 40, 80, 100]);
  assert.equal(s.upgrades.at(-1)?.[0], 'swapping');
  assert.deepEqual(s.log, ['suspend', 'freeze']);
  assert.equal(s.v.src, 'blob:fake-1');
  s.v.emit('loadeddata');
  await flush();
  assert.equal(s.v.currentTime, 12.5, 'o\'sha vaqtga qaytadi');
  s.v.emit('seeked');
  await flush();
  assert.deepEqual(s.log, ['suspend', 'freeze', 'unfreeze', 'resume']);
  assert.equal(s.upgrades.at(-1)?.[0], 'done');
  assert.deepEqual(s.statuses.at(-1), ['ready', 'scrub']);
});

test('avtoyurish ketayotganda almashtirish kutadi (taymer bilan tekshiriladi), tugagach almashtiriladi', async () => {
  const s = setup({}, async () => fakeResponse([bytes(10)]));
  s.setAuto(true);
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  assert.equal(s.v.src, '/m/low.mp4');
  assert.deepEqual(s.log, []);
  s.setAuto(false);
  s.fire(400);
  await flush();
  assert.equal(s.v.src, 'blob:fake-1');
  assert.deepEqual(s.log, ['suspend', 'freeze']);
});

test('yuklab olish xatosi (tarmoq, !ok, bo\'sh fayl): low da qolinadi, upgrade failed, video tegilmaydi', async () => {
  const cases: Array<() => Promise<unknown>> = [
    async () => { throw new TypeError('network'); },
    async () => fakeResponse([bytes(5)], { ok: false }),
    async () => fakeResponse([]),
  ];
  for (const impl of cases) {
    const s = setup({}, impl);
    s.loader.start();
    s.v.emit('loadeddata');
    await flush();
    assert.equal(s.upgrades.at(-1)?.[0], 'failed');
    assert.equal(s.v.src, '/m/low.mp4');
    assert.deepEqual(s.log, []);
    assert.deepEqual(s.statuses, [['ready', 'low']]);
  }
});

test('stream yo\'q (eski brauzer): blob() bilan, foiz noma\'lum (-1)', async () => {
  const s = setup({}, async () => fakeResponse([bytes(30)], { stream: false }));
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  assert.ok(s.upgrades.some(([st, p]) => st === 'loading' && p === -1));
  assert.equal(s.v.src, 'blob:fake-1');
});

test('Content-Length yo\'q: foiz -1', async () => {
  const s = setup({}, async () => fakeResponse([bytes(30), bytes(30)], { length: null }));
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  const loading = s.upgrades.filter(([st]) => st === 'loading').map(([, p]) => p);
  assert.ok(loading.slice(1).every((p) => p === -1), JSON.stringify(loading));
});

test('yangi manba ochilmasa: eski manba tiklanadi, joyga qaytiladi, upgrade failed, blob bo\'shatiladi', async () => {
  const s = setup({}, async () => fakeResponse([bytes(10)]));
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  assert.equal(s.v.src, 'blob:fake-1');
  s.v.emit('error'); // blob ochilmadi
  await flush();
  assert.equal(s.v.src, '/m/low.mp4', 'eski manba tiklandi');
  s.v.emit('loadeddata');
  await flush();
  assert.equal(s.v.currentTime, 12.5);
  s.v.emit('seeked');
  await flush();
  assert.deepEqual(s.log, ['suspend', 'freeze', 'unfreeze', 'resume']);
  assert.equal(s.upgrades.at(-1)?.[0], 'failed');
  assert.deepEqual(s.revoked, ['blob:fake-1']);
  assert.deepEqual(s.statuses, [['ready', 'low']]);
});

test('ma\'lumot tejash: avtomatik yuklab olinmaydi; upgradeNow (mehmon so\'rasa) ishga tushiradi', async () => {
  const s = setup({ saveData: true }, async () => fakeResponse([bytes(10)]));
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  assert.equal(s.fetchCalls.length, 0);
  assert.deepEqual(s.statuses, [['ready', 'low']]);
  s.loader.upgradeNow();
  await flush();
  assert.equal(s.fetchCalls.length, 1);
  assert.equal(s.v.src, 'blob:fake-1');
});

test('upgradeNow: tayyor bo\'lmasdan oldin yoki ikki marta bosilsa zararsiz', async () => {
  const s = setup({ effectiveType: '3g' }, async () => fakeResponse([bytes(10)]));
  s.loader.upgradeNow();
  assert.equal(s.fetchCalls.length, 0);
  s.loader.start();
  s.v.emit('loadeddata');
  s.loader.upgradeNow();
  s.loader.upgradeNow();
  await flush();
  assert.equal(s.fetchCalls.length, 1);
});

test('variantlar yetishmasa: faqat low bo\'lsa almashtirish yo\'q; scrub yo\'q bo\'lsa play ga', async () => {
  const lowOnly = setup({}, async () => fakeResponse([bytes(5)]), { scrub: null, play: null, low: '/m/low.mp4', poster: null });
  lowOnly.loader.start();
  lowOnly.v.emit('loadeddata');
  await flush();
  assert.equal(lowOnly.fetchCalls.length, 0);
  const noScrub = setup({}, async () => fakeResponse([bytes(5)]), { ...VIDEO, scrub: null });
  noScrub.loader.start();
  noScrub.v.emit('loadeddata');
  await flush();
  assert.equal(noScrub.fetchCalls[0].url, '/m/play.mp4');
});

test('destroy: yuklab olish bekor qilinadi, blob bo\'shatiladi, video tozalanadi, tinglovchilar olib tashlanadi', async () => {
  let release: (() => void) | undefined;
  const s = setup({}, (_url, init) => new Promise((_resolve, reject) => {
    release = () => reject(new DOMException('aborted', 'AbortError'));
    init?.signal?.addEventListener('abort', release);
  }));
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  assert.equal(s.fetchCalls.length, 1);
  s.loader.destroy();
  assert.equal(s.fetchCalls[0].signal?.aborted, true);
  await flush();
  assert.ok(s.v.removed.includes('src'));
  assert.equal(s.v.count('loadeddata'), 0);
  assert.equal(s.v.count('error'), 0);
  assert.deepEqual(s.log, []);
  assert.equal(s.upgrades.at(-1)?.[0] !== 'swapping', true);
  assert.doesNotThrow(() => s.loader.destroy());
});

test('destroy muvaffaqiyatli almashtirishdan keyin blob manzilini bo\'shatadi', async () => {
  const s = setup({}, async () => fakeResponse([bytes(10)]));
  s.loader.start();
  s.v.emit('loadeddata');
  await flush();
  s.v.emit('loadeddata');
  await flush();
  s.v.emit('seeked');
  await flush();
  assert.deepEqual(s.revoked, []);
  s.loader.destroy();
  assert.deepEqual(s.revoked, ['blob:fake-1']);
});
