import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz } from '../../../i18n/uz.ts';
import { extractFailure, failureKind, failureMessage, hasRowErrors } from './errors.ts';

const texts = restoUz.bulkImport.failures;

/** `ApiError` ga o'xshash obyekt (apiClient: status + xom JSON `problem`). */
function apiError(status: number, body?: unknown) {
  return Object.assign(new Error(`So'rov muvaffaqiyatsiz tugadi (${status})`), { name: 'ApiError', status, problem: body });
}

test('extractFailure: server {error, code} ni o\'qiydi (apiClient message ni emas)', () => {
  const failure = extractFailure(apiError(415, { error: 'Excel\'da Boshqacha saqlang', code: 'unsupported_type' }));
  assert.equal(failure.status, 415);
  assert.equal(failure.code, 'unsupported_type');
  assert.equal(failure.message, 'Excel\'da Boshqacha saqlang');
  assert.equal(failure.aborted, false);
});

test('extractFailure: kod kelmasa holat kodidan aniqlanadi', () => {
  assert.equal(extractFailure(apiError(413)).code, 'file_too_large');
  assert.equal(extractFailure(apiError(422)).code, 'nothing_recognized');
  assert.equal(extractFailure(apiError(429)).code, 'rate_limited');
  assert.equal(extractFailure(apiError(503)).code, 'ai_unavailable');
});

test('extractFailure: tarmoq xatosi va bekor qilish', () => {
  const network = extractFailure(new TypeError('Failed to fetch'));
  assert.equal(network.status, 0);
  assert.equal(failureKind(network), 'network');
  const abort = extractFailure(Object.assign(new Error('x'), { name: 'AbortError' }));
  assert.equal(abort.aborted, true);
  assert.equal(failureKind(abort), 'aborted');
  assert.equal(extractFailure(null).status, 0);
  assert.equal(extractFailure('oops').status, 0);
});

test('extractFailure: 400 rows[] qator-xatolari (row_id raqam ham bo\'lishi mumkin)', () => {
  const failure = extractFailure(
    apiError(400, {
      error: 'Qatorlarda xato',
      rows: [
        { row_id: 'r2', field: 'price', message: 'Narx noto\'g\'ri' },
        { row_id: 5, message: 'Nom juda uzun' },
        { field: 'name' },
        'axlat',
      ],
    }),
  );
  assert.equal(hasRowErrors(failure), true);
  assert.deepEqual(failure.rows.map((r) => r.row_id), ['r2', '5']);
  assert.equal(failure.rows[0].field, 'price');
  assert.equal(failure.rows[1].field, undefined);
});

test('hasRowErrors: faqat 400 va qator bor bo\'lsa', () => {
  assert.equal(hasRowErrors(extractFailure(apiError(400, { error: 'x' }))), false);
  assert.equal(hasRowErrors(extractFailure(apiError(500, { rows: [{ row_id: 'r1', message: 'x' }] }))), false);
});

test('failureMessage: server aniq maslahat bergan holatda uning matni, aks holda o\'zimizniki', () => {
  const unsupported = extractFailure(apiError(415, { error: 'Samsung Notes: Ulashish -> PDF', code: 'unsupported_type' }));
  assert.equal(failureMessage(unsupported, texts), 'Samsung Notes: Ulashish -> PDF');

  const nothing = extractFailure(apiError(422, { error: 'Hech narsa topilmadi. Tiniqroq rasm oling.' }));
  assert.equal(failureMessage(nothing, texts), 'Hech narsa topilmadi. Tiniqroq rasm oling.');

  // maslahat matni bo'lmasa o'zimizning matn
  assert.equal(failureMessage(extractFailure(apiError(415)), texts), texts.unsupported);
  assert.equal(failureMessage(extractFailure(apiError(413)), texts), texts.too_large);
  assert.equal(failureMessage(extractFailure(apiError(429, { error: 'rate' })), texts), texts.rate_limited);
  assert.equal(failureMessage(extractFailure(apiError(503, { error: 'ai down' })), texts), texts.ai_unavailable);
  assert.equal(failureMessage(extractFailure(apiError(500)), texts), texts.server);
  assert.equal(failureMessage(extractFailure(apiError(403)), texts), texts.forbidden);
  assert.equal(failureMessage(extractFailure(new TypeError('x')), texts), texts.network);
});

test('failureMessage: texnik status matni (so\'rov muvaffaqiyatsiz...) foydalanuvchiga chiqmaydi', () => {
  for (const status of [400, 404, 409, 413, 429, 500, 502, 503]) {
    const message = failureMessage(extractFailure(apiError(status)), texts);
    assert.doesNotMatch(message, /\(\d{3}\)/, `${status} uchun xom holat kodi chiqdi`);
  }
});
