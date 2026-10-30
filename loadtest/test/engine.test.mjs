// Yuk generatorining o'z testlari (mock server bilan, tashqi tarmoqsiz): node --test test/
import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, test } from 'node:test';
import { Client, Recorder } from '../lib/client.mjs';
import { collectProductIds } from '../lib/context.mjs';
import { assertSafeTarget } from '../lib/guard.mjs';
import { percentile, summarize, windows } from '../lib/stats.mjs';
import { loadProfile, parseArgs, runProfile } from '../run.mjs';

let server;
let base;
let orderSeq = 0;
let dupMode = false;
let flakyCalls = 0;

before(async () => {
  server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const json = (code, obj, headers = {}) => {
      res.writeHead(code, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(obj));
    };
    if (url === '/health/') return json(200, { ok: true });
    if (url === '/menu/' || url === '/') {
      res.writeHead(200, { 'content-type': 'text/html' });
      return res.end('<html>menyu</html>');
    }
    if (url === '/api/v1/restaurant/menu/') {
      return json(200, { categories: [{ name: 'c', products: [{ id: 1, name: 'a', price: 1000, is_available: true }, { id: 2, name: 'b', price: 2000, is_available: true }, { id: 3, name: 'x', price: 1, is_available: false }] }] });
    }
    if (url === '/api/v1/restaurant/orders/create/' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      return req.on('end', () => {
        const data = JSON.parse(body);
        assert.ok(Array.isArray(data.items) && data.items.length > 0);
        assert.equal(data.items.some((i) => 'price' in i), false, 'mijoz narx yubormasligi kerak');
        orderSeq++;
        json(201, { id: orderSeq, order_number: dupMode ? 'DUP-1' : `T-${orderSeq}` });
      });
    }
    if (url === '/flaky') {
      flakyCalls++;
      if (flakyCalls === 2) return req.socket.destroy(); // 2-so'rov ishlatilgan ulanishda uziladi
      res.writeHead(200);
      return res.end('ok');
    }
    if (url === '/admin/login/') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/html', 'set-cookie': ['csrftoken=tok123; Path=/'] });
        return res.end('<form><input type="hidden" name="csrfmiddlewaretoken" value="tok123"></form>');
      }
      let body = '';
      req.on('data', (c) => (body += c));
      return req.on('end', () => {
        const f = new URLSearchParams(body);
        if (f.get('csrfmiddlewaretoken') === 'tok123' && f.get('username') === 'u' && f.get('password') === 'p') {
          res.writeHead(302, { location: '/ra/', 'set-cookie': ['sessionid=abc; Path=/; HttpOnly'] });
        } else res.writeHead(200);
        res.end();
      });
    }
    if (url.startsWith('/api/v1/restaurant/')) {
      if (!(req.headers.cookie || '').includes('sessionid=abc')) return json(403, { detail: 'kirish kerak' });
      return json(200, { results: [] }, { etag: 'W/"v1"' });
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const quick = (extra = {}) => ({ args: { base, 'time-scale': '0.001', duration: '1', ...extra }, quiet: true, log: () => {} });

describe('statistika', () => {
  test('persentil eng yaqin tartib raqami usulida', () => {
    const a = Array.from({ length: 100 }, (_, i) => i + 1);
    assert.equal(percentile(a, 0.5), 50);
    assert.equal(percentile(a, 0.95), 95);
    assert.equal(percentile(a, 0.99), 99);
    assert.ok(Number.isNaN(percentile([], 0.5)));
    assert.equal(summarize([3, 1, 2]).max, 3);
  });
  test('oynalar degradatsiyani ko\'rsatadi', () => {
    const s = [
      { t: 0, ms: 10, status: 200 }, { t: 500, ms: 20, status: 200 },
      { t: 10500, ms: 900, status: 200 }, { t: 11000, ms: 0, status: 0, err: 'timeout' },
    ];
    const w = windows(s, 10000);
    assert.equal(w.length, 2);
    assert.equal(w[0].p95, 20);
    assert.equal(w[1].errors, 1);
  });
  test('menyu JSON\'idan faqat mavjud taomlar olinadi', () => {
    assert.deepEqual(collectProductIds({ a: [{ id: 5, name: 'x', price: 1 }, { id: 6, name: 'y', is_available: false }], id: 99 }), [5]);
  });
});

describe('himoya', () => {
  test('lokal manzil ruxsat, begona manzil taqiq', () => {
    assert.equal(assertSafeTarget('http://127.0.0.1:8000').remote, false);
    assert.equal(assertSafeTarget('http://192.168.1.5').remote, false);
    assert.throws(() => assertSafeTarget('https://example.com', { env: {} }), /Xavfsizlik/);
    assert.throws(() => assertSafeTarget('https://example.com', { env: { LT_ALLOW_REMOTE: '1' }, confirmTarget: 'boshqa.com' }), /Xavfsizlik/);
    assert.equal(assertSafeTarget('https://staging.example.com', { env: { LT_ALLOW_REMOTE: '1' }, confirmTarget: 'staging.example.com' }).remote, true);
  });
  test('argumentlar to\'g\'ri o\'qiladi', () => {
    const a = parseArgs(['smoke', '--users', '10', '--no-report', '--label=x']);
    assert.deepEqual(a, { _: ['smoke'], users: '10', 'no-report': true, label: 'x' });
  });
});

describe('mijoz', () => {
  test('ishlatilgan ulanish uzilsa GET o\'zi qayta uriladi (brauzer kabi)', async () => {
    const rec = new Recorder();
    const c = new Client({ base, recorder: rec });
    flakyCalls = 0;
    const r1 = await c.request('flaky', 'GET', '/flaky');
    const r2 = await c.request('flaky', 'GET', '/flaky');
    c.close();
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(rec.retried, 1);
    assert.equal(rec.samples[1].retried, true);
  });
});

describe('stsenariylar', () => {
  test('smoke profili mock serverda: mehmon + buyurtma, SLO o\'tadi', async () => {
    orderSeq = 0;
    dupMode = false;
    const report = await runProfile(loadProfile('smoke'), quick());
    assert.ok(report.steps.menu.count > 0);
    assert.ok(report.totals.orders.created > 0);
    assert.equal(report.totals.orders.duplicates, 0);
    assert.equal(report.totals.errors, 0);
    assert.notEqual(report.slo.verdict, 'FAIL');
    assert.match(report.slo.warnings.join(' '), /timeScale/); // test rejimi isbot emasligi aytiladi
  });

  test('takroriy buyurtma raqami aniqlanadi va FAIL beradi', async () => {
    orderSeq = 0;
    dupMode = true;
    const report = await runProfile(loadProfile('smoke'), quick());
    dupMode = false;
    assert.ok(report.totals.orders.duplicates > 0);
    assert.equal(report.slo.verdict, 'FAIL');
  });

  test('portlash: bo\'shash vaqti o\'lchanadi', async () => {
    const profile = { name: 'burst-test', durationSec: 5, scenarios: [{ type: 'burst', users: 30, windowSec: 2 }], slo: { maxDrainSec: 30 } };
    const report = await runProfile(profile, quick({ duration: '5', 'time-scale': '0.1' }));
    assert.equal(report.steps.menu.count, 30);
    assert.ok(report.notes.some((n) => /Portlash/.test(n)));
    assert.ok(report.slo.checks.some((c) => /bo'shash/.test(c.name) && c.ok));
  });

  test('xodim ekrani haqiqiy login oqimi orqali kiradi va so\'raydi (304 uchun ETag)', async () => {
    process.env.LT_STAFF_USER = 'u';
    process.env.LT_STAFF_PASS = 'p';
    const profile = { name: 'staff-test', durationSec: 1, scenarios: [{ type: 'staff', screens: 4, waiterShare: 0.5, pollMs: 100, rampSec: 0, conditional: true }], slo: {} };
    const report = await runProfile(profile, quick({ 'time-scale': '1', duration: '1' }));
    assert.ok(report.notes.some((n) => /4\/4 muvaffaqiyatli/.test(n)), report.notes.join('|'));
    assert.ok(report.steps['kds-orders'].count > 0);
    assert.ok(report.steps['waiter-tables'].count > 0);
    assert.equal(report.totals.errors, 0);
  });

  test('stress: tanlangan yo\'llarga o\'ylash vaqtisiz uradi', async () => {
    const report = await runProfile(loadProfile('stress-mixed'), quick({ users: '6', duration: '1', 'time-scale': '1' }));
    assert.ok(report.steps['/menu/'].count > 0 && report.steps['/'].count > 0);
    assert.equal(report.totals.errors, 0);
  });

  test('begona manzilga yuk berilmaydi', async () => {
    await assert.rejects(() => runProfile(loadProfile('smoke'), { args: { base: 'https://example.com' }, quiet: true, log: () => {} }), /Xavfsizlik/);
  });
});
