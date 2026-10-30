import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLog, summarizeLog } from '../parse_access_log.mjs';

// backend/gunicorn.conf.py dagi format: standart maydonlar + %(D)s (mikrosekund) + so'rov id
const SAMPLE = [
  '127.0.0.1 - - [30/Oct/2026:21:17:16 +0500] "GET /health/ HTTP/1.1" 200 670 "-" "curl/8.5.0" 161023 -',
  '127.0.0.1 - - [30/Oct/2026:21:17:19 +0500] "GET /menu/?table=3 HTTP/1.1" 200 49645 "-" "curl/8.5.0" 77300 bdb97b2c-72e2-44bd-ba0e-5e7e829889ef',
  '127.0.0.1 - - [30/Oct/2026:21:17:20 +0500] "GET /menu/ HTTP/1.1" 200 49645 "-" "curl/8.5.0" 4233 87cfe966-32a4-4969-8f03-5e28895eda67',
  '10.0.0.5 - - [30/Oct/2026:21:17:26 +0500] "POST /api/v1/restaurant/orders/create/ HTTP/1.1" 400 43 "-" "k6" 9000 x1',
  'bu jurnal qatori emas',
].join('\n');

test('jurnal qatorlari o\'qiladi, so\'rov id va noto\'g\'ri qatorlar to\'g\'ri ishlanadi', () => {
  const { rows, skipped } = parseLog(SAMPLE);
  assert.equal(rows.length, 4);
  assert.equal(skipped, 1);
  assert.equal(rows[0].rid, '');
  assert.equal(rows[1].rid, 'bdb97b2c-72e2-44bd-ba0e-5e7e829889ef');
  assert.equal(rows[1].path, '/menu/'); // so'rov parametrlari guruhlashda tashlanadi
  assert.equal(rows[1].ms, 77.3);
});

test('yo\'l bo\'yicha guruhlash va vaqt oralig\'i', () => {
  const s = summarizeLog(parseLog(SAMPLE).rows);
  assert.equal(s.spanSec, 10);
  const menu = s.table.find((t) => t.key === 'GET /menu/');
  assert.equal(menu.count, 2);
  assert.equal(menu.max, 77.3);
  assert.deepEqual(s.table.find((t) => t.key.startsWith('POST')).status, { 400: 1 });
});
