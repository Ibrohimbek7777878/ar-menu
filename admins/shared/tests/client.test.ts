/**
 * Haqiqiy client.ts (apiClient, ApiError) ni sinaydi: global fetch, document va window soxtalashtiriladi.
 * Tarmoqqa hech qachon chiqilmaydi.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, ApiError } from '../src/api/client.ts';

interface Call { url: string; init: RequestInit & { headers: Headers } }

const g = globalThis as unknown as Record<string, unknown>;
const saved = { fetch: g.fetch, document: g.document, window: g.window };
let calls: Call[] = [];
let location: { pathname: string; search: string; href: string };

function mockFetch(make: () => Response) {
  g.fetch = async (url: string, init: RequestInit & { headers: Headers }) => {
    calls.push({ url, init });
    return make();
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  calls = [];
  location = { pathname: '/ra/menu', search: '?q=non', href: '' };
  g.document = { cookie: 'a=1; csrftoken=tok%20en; b=2' };
  g.window = { location };
});

afterEach(() => {
  g.fetch = saved.fetch;
  g.document = saved.document;
  g.window = saved.window;
});

test('muvaffaqiyatli javob: JSON qaytadi, same-origin va JSON sarlavhasi qo\'yiladi', async () => {
  mockFetch(() => json({ ok: true, n: 3 }));
  const data = await apiClient<{ ok: boolean; n: number }>('/api/x/');
  assert.deepEqual(data, { ok: true, n: 3 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/x/');
  assert.equal(calls[0].init.credentials, 'same-origin');
  assert.equal(calls[0].init.headers.get('Content-Type'), 'application/json');
});

test('CSRF: cookie dan o\'qiladi (URL-dekod qilinadi) va X-CSRFToken sarlavhasiga qo\'yiladi', async () => {
  mockFetch(() => json({}));
  await apiClient('/api/x/', { method: 'POST', body: '{}' });
  assert.equal(calls[0].init.headers.get('X-CSRFToken'), 'tok en');
});

test('CSRF: chaqiruvchi o\'zi bergan X-CSRFToken ustidan yozilmaydi', async () => {
  mockFetch(() => json({}));
  await apiClient('/api/x/', { method: 'POST', headers: { 'X-CSRFToken': 'qo\'lda' } });
  assert.equal(calls[0].init.headers.get('X-CSRFToken'), 'qo\'lda');
});

test('CSRF cookie yo\'q bo\'lsa sarlavha qo\'yilmaydi', async () => {
  g.document = { cookie: 'a=1' };
  mockFetch(() => json({}));
  await apiClient('/api/x/');
  assert.equal(calls[0].init.headers.has('X-CSRFToken'), false);
});

test('FormData yuborilganda Content-Type qo\'yilmaydi (brauzer boundary qo\'yadi)', async () => {
  mockFetch(() => json({}));
  const fd = new FormData();
  fd.append('name', 'Osh');
  await apiClient('/api/x/', { method: 'POST', body: fd });
  assert.equal(calls[0].init.headers.has('Content-Type'), false);
});

test('204 No Content: bo\'sh obyekt qaytadi (json parse qilinmaydi)', async () => {
  mockFetch(() => new Response(null, { status: 204 }));
  assert.deepEqual(await apiClient('/api/x/', { method: 'DELETE' }), {});
});

test('401: /admin/login/?next=... ga yo\'naltiradi va ApiError(401) tashlaydi', async () => {
  mockFetch(() => json({ detail: 'x' }, 401));
  await assert.rejects(apiClient('/api/x/'), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 401);
    assert.equal(err.name, 'ApiError');
    return true;
  });
  assert.equal(location.href, `/admin/login/?next=${encodeURIComponent('/ra/menu?q=non')}`);
});

test('xato xaritasi: RFC 7807 `detail` xabar bo\'ladi, status va problem saqlanadi', async () => {
  mockFetch(() => json({ title: 'Forbidden', detail: 'Ruxsat yo\'q.', status: 403 }, 403));
  await assert.rejects(apiClient('/api/x/'), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 403);
    assert.equal(err.message, 'Ruxsat yo\'q.');
    assert.equal(err.problem?.title, 'Forbidden');
    return true;
  });
});

test('xato xaritasi: `detail` yo\'q bo\'lsa `title` olinadi', async () => {
  mockFetch(() => json({ title: 'Not Found' }, 404));
  await assert.rejects(apiClient('/api/x/'), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 404);
    assert.equal(err.message, 'Not Found');
    return true;
  });
});

test('xato xaritasi: javob JSON bo\'lmasa (masalan HTML 500) status bilan umumiy xabar', async () => {
  mockFetch(() => new Response('<html>Server Error</html>', { status: 500, headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(apiClient('/api/x/'), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.status, 500);
    assert.equal(err.message, "So'rov muvaffaqiyatsiz tugadi (500)");
    assert.equal(err.problem, undefined);
    return true;
  });
});

test('xato xaritasi: maydon xatolari (errors) problem ichida saqlanadi', async () => {
  mockFetch(() => json({ detail: 'Tekshiruv xatosi', errors: { price: ['Narx musbat bo\'lishi kerak'] } }, 400));
  await assert.rejects(apiClient('/api/x/'), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal(err.message, 'Tekshiruv xatosi');
    assert.deepEqual(err.problem?.errors, { price: ["Narx musbat bo'lishi kerak"] });
    return true;
  });
});

test('tarmoq uzilsa (fetch rad etsa) xato o\'zgarishsiz yuqoriga chiqadi', async () => {
  g.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(apiClient('/api/x/'), (err: unknown) => err instanceof TypeError && !(err instanceof ApiError));
});
