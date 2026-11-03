import test from 'node:test';
import assert from 'node:assert/strict';
import { AVAIL_TTL_MS, BookingApiError, CONFIG_FAIL_TTL_MS, CONFIG_TTL_MS, createBookingClient, isAbortError, newSubmissionId } from '../src/pages/BookingPage/client.ts';
import type { BookingPayload } from '../src/pages/BookingPage/types.ts';

interface Call { url: string; init?: RequestInit }

function fakeFetch(handler: (url: string, init: RequestInit | undefined, n: number) => { status?: number; body?: unknown; throws?: Error | 'abort' | 'html' }) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const out = handler(url, init, calls.length);
    if (out.throws === 'abort') {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }
    if (out.throws && out.throws !== 'html') throw out.throws;
    return {
      status: out.status ?? 200,
      json: async () => {
        if (out.throws === 'html') throw new SyntaxError('Unexpected token <');
        return out.body;
      },
    } as unknown as Response;
  }) as typeof fetch;
  return { impl, calls };
}

const CONFIG = { enabled: true, slots: [], event_types: [], max_days_ahead: 30, closed_weekdays: [], halls: [] };
const AVAIL = { date: '2026-11-05', closed: false, tables: [{ id: 1, slots: { '12:30': 'free' } }] };
const PAYLOAD: BookingPayload = { table_id: 1, date: '2026-11-05', time: '12:30', guests: 2, name: 'Ali', phone: '+998901234567', event_type: 'none', notes: '', submission_id: 'sub-1' };

test('sozlama: keshlanadi (bitta so\'rov), TTL dan keyin yangilanadi', async () => {
  let t = 1_000_000;
  const { impl, calls } = fakeFetch(() => ({ body: CONFIG }));
  const client = createBookingClient({ fetch: impl, now: () => t });
  const [a, b] = await Promise.all([client.loadConfig(), client.loadConfig()]);
  assert.equal(a.enabled, true);
  assert.equal(a, b);
  assert.equal(calls.length, 1);
  t += CONFIG_TTL_MS - 1;
  await client.loadConfig();
  assert.equal(calls.length, 1);
  t += 2;
  await client.loadConfig();
  assert.equal(calls.length, 2);
  await client.loadConfig({ force: true });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, '/api/restaurant/guest/booking/config/');
});

test('sozlama: xato (404, HTML, tarmoq) keshlanmaydi, lekin 1 daqiqa qayta so\'ralmaydi; force o\'tkazadi', async () => {
  let t = 5_000;
  let mode: 'html' | '404' | 'ok' = 'html';
  const { impl, calls } = fakeFetch(() => (mode === 'html' ? { throws: 'html' } : mode === '404' ? { status: 404, body: {} } : { body: CONFIG }));
  const client = createBookingClient({ fetch: impl, now: () => t });
  await assert.rejects(client.loadConfig(), BookingApiError);
  assert.equal(calls.length, 1);
  await assert.rejects(client.loadConfig(), BookingApiError); // tez orada: tarmoqqa chiqmaydi
  assert.equal(calls.length, 1);
  t += CONFIG_FAIL_TTL_MS + 1;
  mode = '404';
  await assert.rejects(client.loadConfig(), BookingApiError);
  assert.equal(calls.length, 2);
  mode = 'ok';
  assert.equal((await client.loadConfig({ force: true })).enabled, true);
  assert.equal((await client.loadConfig()).enabled, true); // muvaffaqiyatdan keyin kesh ishlaydi
  assert.equal(calls.length, 3);
});

test('sozlama: tarmoq xatosi ham BookingApiError emas, asl xato; keyin muvaffaqiyatli qayta urinish ishlaydi', async () => {
  let t = 0;
  let fail = true;
  const { impl } = fakeFetch(() => (fail ? { throws: new TypeError('Failed to fetch') } : { body: CONFIG }));
  const client = createBookingClient({ fetch: impl, now: () => t });
  await assert.rejects(client.loadConfig(), TypeError);
  fail = false;
  t += CONFIG_FAIL_TTL_MS + 1;
  assert.equal((await client.loadConfig()).enabled, true);
});

test('availability: so\'rov manzili, kesh, force, sana+mehmon bo\'yicha alohida kesh', async () => {
  let t = 0;
  const { impl, calls } = fakeFetch(() => ({ body: AVAIL }));
  const client = createBookingClient({ fetch: impl, now: () => t });
  assert.equal(client.peekAvailability('2026-11-05', 2), null);
  const a = await client.loadAvailability('2026-11-05', 2);
  assert.equal(a.tables[0].slots['12:30'], 'free');
  assert.equal(calls[0].url, '/api/restaurant/guest/booking/availability/?date=2026-11-05&guests=2');
  assert.ok(client.peekAvailability('2026-11-05', 2));
  await client.loadAvailability('2026-11-05', 2);
  assert.equal(calls.length, 1);
  await client.loadAvailability('2026-11-05', 3); // boshqa mehmon soni -> yangi so'rov
  assert.equal(calls.length, 2);
  await client.loadAvailability('2026-11-05', 2, { force: true });
  assert.equal(calls.length, 3);
  t += AVAIL_TTL_MS + 1;
  assert.equal(client.peekAvailability('2026-11-05', 2), null);
  await client.loadAvailability('2026-11-05', 2);
  assert.equal(calls.length, 4);
});

test('availability: AbortSignal fetch\'ga uzatiladi, bekor qilingan so\'rov keshga yozilmaydi', async () => {
  const { impl, calls } = fakeFetch((_u, init) => (init?.signal?.aborted ? { throws: 'abort' } : { body: AVAIL }));
  const client = createBookingClient({ fetch: impl, now: () => 0 });
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(client.loadAvailability('2026-11-05', 2, { signal: ctl.signal }), (e) => isAbortError(e));
  assert.equal(calls[0].init?.signal, ctl.signal);
  assert.equal(client.peekAvailability('2026-11-05', 2), null);
});

test('availability: 429 va noto\'g\'ri shakl xato beradi, keshga yozilmaydi', async () => {
  let status = 429;
  const { impl } = fakeFetch(() => (status === 429 ? { status: 429, body: {} } : { status: 200, body: { nope: true } }));
  const client = createBookingClient({ fetch: impl, now: () => 0 });
  await assert.rejects(client.loadAvailability('2026-11-05', 2), (e: unknown) => e instanceof BookingApiError && e.status === 429);
  status = 200;
  await assert.rejects(client.loadAvailability('2026-11-05', 2), BookingApiError);
  assert.equal(client.peekAvailability('2026-11-05', 2), null);
});

test('availability keshi cheklangan (eski yozuvlar chiqarib tashlanadi)', async () => {
  const { impl, calls } = fakeFetch(() => ({ body: AVAIL }));
  const client = createBookingClient({ fetch: impl, now: () => 0 });
  for (let g = 1; g <= 45; g++) await client.loadAvailability('2026-11-05', g);
  assert.equal(client.peekAvailability('2026-11-05', 1), null); // eng eskisi chiqdi
  assert.ok(client.peekAvailability('2026-11-05', 45));
  assert.equal(calls.length, 45);
});

test('yuborish: 201 -> natija, tana JSON, CSRF sarlavhasi (cookie bo\'lsa), keshlar tozalanadi', async () => {
  const { impl, calls } = fakeFetch((url) => {
    if (url.includes('availability')) return { body: AVAIL };
    return { status: 201, body: { public_code: 'GS-K7QX2', status: 'pending', table: { id: 1, number: '01', hall: 'Zal' }, date: '2026-11-05', time: '12:30', guests: 2, duration_minutes: 120 } };
  });
  const client = createBookingClient({ fetch: impl, now: () => 0, csrf: () => 'tok123' });
  await client.loadAvailability('2026-11-05', 2);
  const out = await client.submit(PAYLOAD);
  assert.equal(out.ok, true);
  if (out.ok) assert.equal(out.booking.public_code, 'GS-K7QX2');
  const post = calls.find((c) => c.init?.method === 'POST')!;
  assert.equal(post.url, '/api/restaurant/guest/booking/');
  assert.deepEqual(JSON.parse(String(post.init?.body)), PAYLOAD);
  const headers = post.init?.headers as Record<string, string>;
  assert.equal(headers['Content-Type'], 'application/json');
  assert.equal(headers['X-CSRFToken'], 'tok123');
  assert.equal(client.peekAvailability('2026-11-05', 2), null); // bron yaratildi: kesh eskirdi
});

test('yuborish: CSRF cookie bo\'lmasa sarlavha yuborilmaydi', async () => {
  const { impl, calls } = fakeFetch(() => ({ status: 201, body: { public_code: 'A1' } }));
  const client = createBookingClient({ fetch: impl, now: () => 0, csrf: () => '' });
  await client.submit(PAYLOAD);
  const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
  assert.equal('X-CSRFToken' in headers, false);
});

test('yuborish: takroriy (idempotent) javob 200 ham muvaffaqiyat', async () => {
  const { impl } = fakeFetch(() => ({ status: 200, body: { public_code: 'GS-1', status: 'confirmed' } }));
  const out = await createBookingClient({ fetch: impl, now: () => 0 }).submit(PAYLOAD);
  assert.equal(out.ok && out.booking.status, 'confirmed');
});

test('yuborish: xato turlari — 409, 429, 403, 400, 500, tarmoq, kodsiz 201', async () => {
  const cases: [Parameters<typeof fakeFetch>[0], string][] = [
    [() => ({ status: 409, body: { code: 'slot_taken' } }), 'slot_taken'],
    [() => ({ status: 429, body: {} }), 'rate_limited'],
    [() => ({ status: 403, body: { code: 'booking_disabled' } }), 'disabled'],
    [() => ({ status: 400, body: { error: 'x', field: 'name' } }), 'invalid'],
    [() => ({ status: 500, throws: 'html' }), 'server'],
    [() => ({ throws: new TypeError('Failed to fetch') }), 'network'],
    [() => ({ status: 201, body: { status: 'pending' } }), 'server'], // kod yo'q: bron borligini tasdiqlab bo'lmaydi
  ];
  for (const [handler, kind] of cases) {
    const out = await createBookingClient({ fetch: fakeFetch(handler).impl, now: () => 0 }).submit(PAYLOAD);
    assert.equal(out.ok, false);
    if (!out.ok) assert.equal(out.kind, kind);
  }
});

test('bron holati: topildi, 404 -> null, 429/noto\'g\'ri javob -> xato; kod URL ga xavfsiz joylanadi', async () => {
  const { impl, calls } = fakeFetch((url) => {
    if (url.endsWith('/GS-OK/')) return { body: { public_code: 'GS-OK', status: 'confirmed' } };
    if (url.endsWith('/GS-429/')) return { status: 429, body: {} };
    if (url.endsWith('/GS-BAD/')) return { body: { x: 1 } };
    return { status: 404, body: {} };
  });
  const client = createBookingClient({ fetch: impl, now: () => 0 });
  assert.equal((await client.loadStatus('GS-OK'))?.status, 'confirmed');
  assert.equal(await client.loadStatus('GS-NO'), null);
  await assert.rejects(client.loadStatus('GS-429'), (e: unknown) => e instanceof BookingApiError && e.status === 429);
  await assert.rejects(client.loadStatus('GS-BAD'), BookingApiError);
  await client.loadStatus('a/b?c');
  assert.equal(calls[calls.length - 1].url, '/api/restaurant/guest/booking/a%2Fb%3Fc/');
});

test('submission_id: UUID v4 shakli, randomUUID yo\'q bo\'lsa zaxira, hech narsa yo\'q bo\'lsa ham matn', () => {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(newSubmissionId({ randomUUID: () => '11111111-2222-4333-8444-555555555555' }), uuid);
  const viaValues = newSubmissionId({ getRandomValues: (a) => { const u = a as unknown as Uint8Array; u.fill(7); return a; } });
  assert.match(viaValues, uuid);
  assert.ok(newSubmissionId({}).length > 10); // tasodifiy manba yo'q: baribir matn qaytadi
  assert.notEqual(newSubmissionId({}), newSubmissionId({}));
  // randomUUID xato tashlasa (xavfsiz bo'lmagan kontekst) zaxiraga tushadi
  assert.ok(newSubmissionId({ randomUUID: () => { throw new Error('insecure'); } }).length > 10);
});
