import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_HOTSPOTS, MAX_STOPS, hasContent, parseTour } from '../src/pages/TourPage/parse.ts';
import { TOUR_API, TOUR_FAIL_TTL_MS, TOUR_TTL_MS, createTourClient } from '../src/pages/TourPage/client.ts';
import { RESUME_KEY, RESUME_MAX_AGE_MS, readResume, saveResume, type StorageLike } from '../src/pages/TourPage/resume.ts';
import { TOUR_PATH, bookingPathForTable } from '../src/pages/TourPage/paths.ts';

const CONTRACT = {
  enabled: true,
  title: 'Asosiy zal',
  duration: 44.6,
  width: 720,
  height: 1280,
  video: { scrub: '/media/tours/shop_1/abc/scrub.mp4', play: '/media/tours/shop_1/abc/play.mp4', low: '/media/tours/shop_1/abc/low.mp4', poster: '/media/tours/shop_1/abc/poster.jpg' },
  stops: [{ id: 1, title: 'Kirish', t: 0.0 }, { id: 2, title: 'Asosiy zal', t: 9.5 }],
  hotspots: [{ id: 7, table_id: 3, table_number: '03', capacity: 8, label: '', t_start: 12.0, t_end: 16.5, x: 0.52, y: 0.61 }],
};

test('parseTour: shartnomadagi namuna to\'g\'ri o\'qiladi', () => {
  const tour = parseTour(CONTRACT);
  assert.ok(tour);
  assert.equal(tour.title, 'Asosiy zal');
  assert.equal(tour.duration, 44.6);
  assert.equal(tour.width, 720);
  assert.equal(tour.height, 1280);
  assert.equal(tour.video.scrub, '/media/tours/shop_1/abc/scrub.mp4');
  assert.equal(tour.video.poster, '/media/tours/shop_1/abc/poster.jpg');
  assert.deepEqual(tour.stops, [{ id: 1, title: 'Kirish', time: 0 }, { id: 2, title: 'Asosiy zal', time: 9.5 }]);
  assert.deepEqual(tour.hotspots, [{ id: 7, tableId: 3, tableNumber: '03', capacity: 8, label: '', tStart: 12, tEnd: 16.5, x: 0.52, y: 0.61 }]);
});

test('parseTour: enabled:false, yo\'q, obyekt emas -> null (sayr yo\'q)', () => {
  assert.equal(parseTour({ ...CONTRACT, enabled: false }), null);
  assert.equal(parseTour({ ...CONTRACT, enabled: 'true' }), null);
  assert.equal(parseTour({ ...CONTRACT, enabled: 1 }), null);
  assert.equal(parseTour({ title: 'x' }), null);
  assert.equal(parseTour(null), null);
  assert.equal(parseTour(undefined), null);
  assert.equal(parseTour('<html>'), null);
  assert.equal(parseTour([]), null);
});

test('parseTour: ko\'rsatadigan narsa yo\'q -> null; faqat surat bo\'lsa ham sayr bor (zaxira)', () => {
  assert.equal(parseTour({ enabled: true }), null);
  assert.equal(parseTour({ enabled: true, video: {} }), null);
  assert.equal(parseTour({ enabled: true, video: { low: 'javascript:alert(1)', poster: '//evil.com/x.jpg' } }), null);
  const onlyPoster = parseTour({ enabled: true, video: { poster: '/media/p.jpg' } });
  assert.ok(onlyPoster);
  assert.equal(onlyPoster.video.low, null);
  assert.equal(onlyPoster.video.scrub, null);
  assert.equal(hasContent(onlyPoster.video), true);
  assert.equal(hasContent({ scrub: null, play: null, low: null, poster: null }), false);
});

test('parseTour: xavfli media manzillari rad etiladi, https ruxsat', () => {
  const tour = parseTour({
    enabled: true,
    video: { scrub: 'data:video/mp4;base64,AAAA', play: 'https://cdn.example.com/p.mp4', low: '/media/l.mp4 ', poster: 'http://user:pw@host/p.jpg' },
  });
  assert.ok(tour);
  assert.equal(tour.video.scrub, null);
  assert.equal(tour.video.play, 'https://cdn.example.com/p.mp4');
  assert.equal(tour.video.low, '/media/l.mp4');
  assert.equal(tour.video.poster, null);
});

test('parseTour: davomiylik/o\'lcham noto\'g\'ri -> 0 (noma\'lum), sahifa yiqilmaydi', () => {
  const tour = parseTour({ ...CONTRACT, duration: -5, width: 'x', height: 0 });
  assert.ok(tour);
  assert.equal(tour.duration, 0);
  assert.equal(tour.width, 0);
  assert.equal(tour.height, 0);
  assert.equal(parseTour({ ...CONTRACT, duration: '12.5' })?.duration, 12.5);
  assert.equal(parseTour({ ...CONTRACT, duration: Number.NaN })?.duration, 0);
});

test('parseTour: nuqtalar tartiblanadi, noto\'g\'rilari tashlanadi, davomiylikka qirqiladi', () => {
  const tour = parseTour({
    ...CONTRACT,
    stops: [
      { id: 3, title: 'Oxiri', t: 99 },
      { id: 1, title: '  Kirish  ', t: 0 },
      { id: 2, title: 'O\'rta', t: 9.5 },
      { id: 'x', title: 'id yo\'q', t: 1 },
      { id: 4, title: 'manfiy', t: -1 },
      { id: 5, title: 'NaN', t: 'abc' },
      null,
      'str',
    ],
  });
  assert.ok(tour);
  assert.deepEqual(tour.stops.map((s) => [s.id, s.time]), [[1, 0], [2, 9.5], [3, 44.6]]);
  assert.equal(tour.stops[0].title, 'Kirish');
  assert.deepEqual(parseTour({ ...CONTRACT, stops: 'x' })?.stops, []);
  assert.deepEqual(parseTour({ ...CONTRACT, stops: [] })?.stops, []);
  assert.deepEqual(parseTour({ ...CONTRACT, stops: undefined })?.stops, []);
});

test('parseTour: bir xil vaqtli nuqtalar id bo\'yicha barqaror tartiblanadi; soni cheklanadi', () => {
  const tour = parseTour({ ...CONTRACT, stops: [{ id: 9, title: 'b', t: 5 }, { id: 2, title: 'a', t: 5 }] });
  assert.deepEqual(tour?.stops.map((s) => s.id), [2, 9]);
  const many = Array.from({ length: MAX_STOPS + 20 }, (_, i) => ({ id: i + 1, title: `n${i}`, t: i * 0.1 }));
  assert.equal(parseTour({ ...CONTRACT, stops: many })?.stops.length, MAX_STOPS);
});

test('parseTour: belgilar — koordinatalar 0..1 ga qirqiladi, teskari oraliq tuzatiladi, yaroqsizlari tashlanadi', () => {
  const tour = parseTour({
    ...CONTRACT,
    hotspots: [
      { id: 1, table_id: 5, table_number: 12, capacity: 4, label: 'VIP', t_start: 20, t_end: 10, x: 1.7, y: -0.3 },
      { id: 2, table_id: null, table_number: '', capacity: 0, label: 'Bar', t_start: 1, t_end: 2, x: 0.5, y: 0.5 },
      { id: 3, table_id: 6, table_number: '6', capacity: -3, t_start: 'a', t_end: 2, x: 0.5, y: 0.5 },
      { id: 4, table_id: 7, table_number: '7', capacity: 2, t_start: 0, t_end: 1, x: 'zz', y: 0.5 },
      { table_id: 8, table_number: '8', t_start: 0, t_end: 1, x: 0.1, y: 0.1 },
      { id: 5, table_id: 9, table_number: '9', capacity: 2.5, t_start: -1, t_end: 1, x: 0.1, y: 0.1 },
    ],
  });
  assert.ok(tour);
  assert.deepEqual(tour.hotspots.map((h) => h.id), [2, 1]);
  const vip = tour.hotspots.find((h) => h.id === 1);
  assert.deepEqual([vip?.tStart, vip?.tEnd, vip?.x, vip?.y, vip?.tableNumber], [10, 20, 1, 0, '12']);
  const bar = tour.hotspots.find((h) => h.id === 2);
  assert.equal(bar?.tableId, null);
  assert.equal(bar?.label, 'Bar');
});

test('parseTour: belgilar soni cheklanadi', () => {
  const spots = Array.from({ length: MAX_HOTSPOTS + 5 }, (_, i) => ({ id: i + 1, table_id: i + 1, table_number: String(i), capacity: 2, t_start: 0, t_end: 1, x: 0.5, y: 0.5 }));
  assert.equal(parseTour({ ...CONTRACT, hotspots: spots })?.hotspots.length, MAX_HOTSPOTS);
});

// ─── client ───

function fakeFetch(handler: (n: number) => { status?: number; body?: unknown; throws?: boolean | 'html' }) {
  const urls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    const out = handler(urls.length);
    if (out.throws === true) throw new TypeError('network');
    return {
      status: out.status ?? 200,
      json: async () => {
        if (out.throws === 'html') throw new SyntaxError('Unexpected token <');
        return out.body;
      },
    } as unknown as Response;
  }) as typeof fetch;
  return { impl, urls };
}

test('client: sayr bor -> ready, bitta keshlangan so\'rov', async () => {
  const { impl, urls } = fakeFetch(() => ({ body: CONTRACT }));
  const client = createTourClient({ fetch: impl, now: () => 1000 });
  const [a, b] = await Promise.all([client.load(), client.load()]);
  assert.equal(a.kind, 'ready');
  assert.equal(a, b);
  assert.equal(urls.length, 1);
  assert.equal(urls[0], TOUR_API);
});

test('client: kesh TTL dan keyin yangilanadi; force keshni chetlaydi; clear tozalaydi', async () => {
  let now = 1_000_000;
  const { impl, urls } = fakeFetch(() => ({ body: CONTRACT }));
  const client = createTourClient({ fetch: impl, now: () => now });
  await client.load();
  now += TOUR_TTL_MS - 1;
  await client.load();
  assert.equal(urls.length, 1);
  now += 2;
  await client.load();
  assert.equal(urls.length, 2);
  await client.load({ force: true });
  assert.equal(urls.length, 3);
  client.clear();
  await client.load();
  assert.equal(urls.length, 4);
});

test('client: enabled:false, 403, 404 -> disabled (sayr yo\'q)', async () => {
  for (const out of [{ body: { enabled: false } }, { status: 404, body: { detail: 'x' } }, { status: 403, body: null }, { body: { enabled: true } }]) {
    const { impl } = fakeFetch(() => out);
    const client = createTourClient({ fetch: impl });
    assert.equal((await client.load()).kind, 'disabled', JSON.stringify(out));
  }
});

test('client: 5xx, 429, tarmoq xatosi, HTML javob -> error; xato 60 s eslab qolinadi', async () => {
  for (const out of [{ status: 500 }, { status: 429 }, { status: 503, body: { x: 1 } }, { throws: true as const }, { throws: 'html' as const }]) {
    const { impl } = fakeFetch(() => out);
    const client = createTourClient({ fetch: impl });
    assert.equal((await client.load()).kind, 'error', JSON.stringify(out));
  }
  let now = 5_000_000;
  const { impl, urls } = fakeFetch((n) => (n === 1 ? { throws: true } : { body: CONTRACT }));
  const client = createTourClient({ fetch: impl, now: () => now });
  assert.equal((await client.load()).kind, 'error');
  now += TOUR_FAIL_TTL_MS - 1;
  assert.equal((await client.load()).kind, 'error');
  assert.equal(urls.length, 1);
  now += 2;
  assert.equal((await client.load()).kind, 'ready');
  assert.equal(urls.length, 2);
});

// ─── resume ───

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}

test('resume: saqlanadi va o\'qiladi; boshiga yaqin joy yozuvni o\'chiradi', () => {
  const store = memoryStorage();
  saveResume(23.456, 44.6, store, 1000);
  assert.equal(readResume(44.6, store, 2000), 23.46);
  saveResume(0.4, 44.6, store, 3000);
  assert.equal(store.data.has(RESUME_KEY), false);
  assert.equal(readResume(44.6, store, 3500), null);
});

test('resume: eskirgan, boshqa video, oxirga yaqin, buzuq yozuv, xotira yo\'q -> null', () => {
  const store = memoryStorage();
  saveResume(20, 44.6, store, 1000);
  assert.equal(readResume(44.6, store, 1000 + RESUME_MAX_AGE_MS + 1), null);
  assert.equal(readResume(120, store, 2000), null); // boshqa davomiylik
  assert.equal(readResume(0, store, 2000), 20); // davomiylik noma'lum bo'lsa tekshirilmaydi
  assert.equal(readResume(44.6, store, 500), null); // soat orqaga ketgan
  saveResume(44, 44.6, store, 1000);
  assert.equal(readResume(44.6, store, 2000), null); // oxirgi soniya
  store.data.set(RESUME_KEY, '{buzuq');
  assert.equal(readResume(44.6, store, 2000), null);
  store.data.set(RESUME_KEY, JSON.stringify({ t: 'x', d: 44.6, at: 1 }));
  assert.equal(readResume(44.6, store, 2000), null);
  assert.equal(readResume(44.6, null), null);
  assert.doesNotThrow(() => saveResume(5, 10, null));
  const broken: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
  assert.doesNotThrow(() => saveResume(5, 10, broken));
  assert.equal(readResume(10, broken), null);
});

test('yo\'llar: sayr va bron havolasi', () => {
  assert.equal(TOUR_PATH, '/tour/');
  assert.equal(bookingPathForTable(3), '/book/?table=3&from=tour');
  assert.equal(bookingPathForTable(0), '/book/');
  assert.equal(bookingPathForTable(-2), '/book/');
  assert.equal(bookingPathForTable(1.5), '/book/');
  assert.equal(bookingPathForTable(Number.NaN), '/book/');
});
