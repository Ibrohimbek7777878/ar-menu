import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_SUMMARY_URL,
  REVENUE_REFRESH_MS,
  fetchTodayRevenue,
  parseSummaryRevenue,
  readInjectedTodayRevenue,
  shouldRefreshRevenue,
  sumTodayIncome,
  tashkentDayKey,
} from '../src/utils/todayRevenue.ts';

// ── Birinchi qiymat: server HTML ichiga yozgan haqiqiy tushum (3 480 000 namunaviy qiymat emas) ──

test('readInjectedTodayRevenue: serverdagi qiymatni oladi (300000 -> 300000)', () => {
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: 300000 } }), 300000);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: 0 } }), 0);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: '300000.0' } }), 300000);
});

test('readInjectedTodayRevenue: yo\'q yoki yaroqsiz bo\'lsa null (eski qiymatga tushib ketmaydi)', () => {
  assert.equal(readInjectedTodayRevenue(undefined), null);
  assert.equal(readInjectedTodayRevenue(null), null);
  assert.equal(readInjectedTodayRevenue({}), null);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: {} }), null);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: null } }), null);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: 'abc' } }), null);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: '' } }), null);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: -5 } }), null);
  assert.equal(readInjectedTodayRevenue({ __GULISTON_ADMIN_DATA__: { today_revenue: NaN } }), null);
});

// ── Summary javobi ──

test('parseSummaryRevenue: today_revenue.total ni oladi', () => {
  assert.equal(parseSummaryRevenue({ today_revenue: { total: 300000, cash: 106000, card: 194000 } }), 300000);
});

test('parseSummaryRevenue: ruxsat yo\'q (today_revenue kaliti yo\'q) yoki yaroqsiz bo\'lsa null', () => {
  assert.equal(parseSummaryRevenue({ orders_count: 5 }), null);
  assert.equal(parseSummaryRevenue(null), null);
  assert.equal(parseSummaryRevenue(undefined), null);
  assert.equal(parseSummaryRevenue({ today_revenue: {} }), null);
  assert.equal(parseSummaryRevenue({ today_revenue: { total: 'x' } }), null);
});

test('fetchTodayRevenue: summary endpointini so\'raydi va tushumni qaytaradi', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fakeFetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ today_revenue: { total: 300000 } }), { status: 200 });
  }) as unknown as typeof fetch;

  assert.equal(await fetchTodayRevenue(fakeFetch), 300000);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, DASHBOARD_SUMMARY_URL);
  assert.equal(DASHBOARD_SUMMARY_URL, '/api/restaurant/admin/v1/dashboard/summary/');
  assert.equal(calls[0].init?.credentials, 'same-origin');
});

test('fetchTodayRevenue: xatoda (401/403/500, tarmoq, noto\'g\'ri JSON) null qaytaradi, yiqilmaydi', async () => {
  for (const status of [401, 403, 404, 500]) {
    const f = (async () => new Response('{}', { status })) as unknown as typeof fetch;
    assert.equal(await fetchTodayRevenue(f), null, `status ${status}`);
  }
  const network = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
  assert.equal(await fetchTodayRevenue(network), null);
  const badJson = (async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
  assert.equal(await fetchTodayRevenue(badJson), null);
});

// ── Throttle ──

test('shouldRefreshRevenue: birinchi marta darrov, keyin REVENUE_REFRESH_MS (14 soniya: poller 5 soniyalik tikda 3-tik) dan keyin', () => {
  assert.equal(REVENUE_REFRESH_MS, 14000);
  assert.equal(shouldRefreshRevenue(0, 1_000_000), true);
  const t0 = 1_000_000;
  assert.equal(shouldRefreshRevenue(t0, t0 + 5_000), false);
  assert.equal(shouldRefreshRevenue(t0, t0 + 13_999), false);
  assert.equal(shouldRefreshRevenue(t0, t0 + 14_000), true);
  assert.equal(shouldRefreshRevenue(t0, t0 + 3_000, 2_000), true);
});

// ── Moliya sahifasidagi mijoz tomonidagi hisob: avvalgi xato "butun davr yig'indisi" edi ──

const NOW = new Date('2026-10-29T10:00:00Z'); // Toshkent: 29-oktabr 15:00

test('sumTodayIncome: faqat bugungi kirimlar; kecha va avvalgi kunlar kirmaydi', () => {
  const txs = [
    { type: 'income', amount: 100000, created_at: '2026-10-29T05:00:00Z' }, // bugun 10:00
    { type: 'income', amount: 200000, created_at: '2026-10-29T09:30:00Z' }, // bugun 14:30
    { type: 'income', amount: 999000, created_at: '2026-10-28T09:30:00Z' }, // kecha
    { type: 'income', amount: 5000000, created_at: '2026-09-01T09:30:00Z' }, // o'tgan oy
  ];
  assert.equal(sumTodayIncome(txs, NOW), 300000);
});

test('sumTodayIncome: chiqim va bekor qilingan kirimlar hisobga olinmaydi', () => {
  const txs = [
    { type: 'income', amount: 300000, created_at: '2026-10-29T05:00:00Z' },
    { type: 'expense', amount: 80000, created_at: '2026-10-29T06:00:00Z' },
    { type: 'income', amount: 70000, created_at: '2026-10-29T07:00:00Z', is_cancelled: true },
  ];
  assert.equal(sumTodayIncome(txs, NOW), 300000);
});

test('sumTodayIncome: kun chegarasi Toshkent bo\'yicha (UTC emas)', () => {
  // 2026-10-28T19:30Z = Toshkent 29-oktabr 00:30 -> bugun
  // 2026-10-28T18:59Z = Toshkent 28-oktabr 23:59 -> kecha
  const txs = [
    { type: 'income', amount: 40000, created_at: '2026-10-28T19:30:00Z' },
    { type: 'income', amount: 9000, created_at: '2026-10-28T18:59:00Z' },
  ];
  assert.equal(sumTodayIncome(txs, NOW), 40000);
  assert.equal(tashkentDayKey(new Date('2026-10-28T19:30:00Z')), '2026-10-29');
  assert.equal(tashkentDayKey(new Date('2026-10-28T18:59:00Z')), '2026-10-28');
});

test('sumTodayIncome: bo\'sh ro\'yxat, yaroqsiz sana va summa yiqilmaydi', () => {
  assert.equal(sumTodayIncome([], NOW), 0);
  const txs = [
    { type: 'income', amount: 'xato', created_at: '2026-10-29T05:00:00Z' },
    { type: 'income', amount: 50000, created_at: 'bu sana emas' },
    { type: 'income', amount: 70000 },
    { type: 'income', amount: '25000', created_at: '2026-10-29T05:00:00Z' },
  ];
  assert.equal(sumTodayIncome(txs, NOW), 25000);
});
