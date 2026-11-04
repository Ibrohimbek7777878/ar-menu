import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UploadError, isUploadAborted, parseUploadResponse } from './upload.ts';

test('parseUploadResponse: 202 + Tour JSON', () => {
  const result = parseUploadResponse(202, '{"id":1,"status":"processing"}');
  assert.deepEqual(result, { ok: true, body: { id: 1, status: 'processing' } });
});

test('parseUploadResponse: 2xx bo\'sh yoki JSON bo\'lmagan javob ham qulamaydi', () => {
  assert.deepEqual(parseUploadResponse(204, ''), { ok: true, body: null });
  assert.deepEqual(parseUploadResponse(200, '<html>'), { ok: true, body: null });
});

test('parseUploadResponse: xato shakli {error, code, field}', () => {
  const result = parseUploadResponse(400, '{"error":"Video juda uzun","code":"too_long","field":"video"}');
  assert.deepEqual(result, { ok: false, status: 400, problem: { error: 'Video juda uzun', code: 'too_long', field: 'video' } });
});

test('parseUploadResponse: HTML xato sahifasi (413 nginx) yoki bo\'sh javob — problem null', () => {
  assert.deepEqual(parseUploadResponse(413, '<html><body>Request Entity Too Large</body></html>'), { ok: false, status: 413, problem: null });
  assert.deepEqual(parseUploadResponse(500, ''), { ok: false, status: 500, problem: null });
  assert.deepEqual(parseUploadResponse(400, '[1,2]'), { ok: false, status: 400, problem: null });
  assert.deepEqual(parseUploadResponse(400, 'null'), { ok: false, status: 400, problem: null });
});

test('parseUploadResponse: 3xx va 1xx muvaffaqiyat emas', () => {
  assert.equal(parseUploadResponse(301, '').ok, false);
  assert.equal(parseUploadResponse(199, '').ok, false);
  assert.equal(parseUploadResponse(299, '{}').ok, true);
  assert.equal(parseUploadResponse(300, '{}').ok, false);
});

test('UploadError: status va problem saqlanadi, Error sifatida ishlaydi', () => {
  const error = new UploadError(409, 'Band', { code: 'busy' });
  assert.ok(error instanceof Error);
  assert.equal(error.status, 409);
  assert.deepEqual(error.problem, { code: 'busy' });
  assert.equal(error.message, 'Band');
});

test('isUploadAborted: faqat AbortError', () => {
  assert.equal(isUploadAborted(Object.assign(new Error('x'), { name: 'AbortError' })), true);
  assert.equal(isUploadAborted(new Error('x')), false);
  assert.equal(isUploadAborted(new UploadError(0, '', null)), false);
  assert.equal(isUploadAborted(null), false);
});
