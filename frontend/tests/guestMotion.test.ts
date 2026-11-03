import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGuestMotion, isWeakDevice, parseGuestMotion, resolveGuestMotion } from '../src/utils/guestMotion.ts';

const g = globalThis as unknown as Record<string, unknown>;

test('parseGuestMotion: noma\'lum qiymat full (hech narsa o\'zgarmaydi)', () => {
  for (const m of ['full', 'light', 'off']) assert.equal(parseGuestMotion(m), m);
  for (const bad of [undefined, null, '', 'neon', 'LIGHT', '<script>', 5, {}]) assert.equal(parseGuestMotion(bad), 'full', String(bad));
});

test('isWeakDevice: ma\'lumot tejash, xotira <= 2 GB yoki yadrolar <= 4 zaif; belgi yo\'q bo\'lsa zaif emas', () => {
  assert.equal(isWeakDevice({ connection: { saveData: true } }), true);
  assert.equal(isWeakDevice({ deviceMemory: 2 }), true);
  assert.equal(isWeakDevice({ deviceMemory: 4 }), false);
  assert.equal(isWeakDevice({ hardwareConcurrency: 4 }), true);
  assert.equal(isWeakDevice({ hardwareConcurrency: 8 }), false);
  assert.equal(isWeakDevice({ hardwareConcurrency: 0 }), false);
  assert.equal(isWeakDevice({}), false);
  assert.equal(isWeakDevice(undefined as unknown as undefined), isWeakDevice());
});

test('resolveGuestMotion: faqat full zaif qurilmada light ga tushadi, off va light o\'zgarmaydi', () => {
  assert.equal(resolveGuestMotion('full', true), 'light');
  assert.equal(resolveGuestMotion('full', false), 'full');
  assert.equal(resolveGuestMotion('light', true), 'light');
  assert.equal(resolveGuestMotion('off', true), 'off');
  assert.equal(resolveGuestMotion('off', false), 'off');
});

function withEnv(motion: unknown, nav: Record<string, unknown>, run: (html: { dataset: Record<string, string> }) => void) {
  const html = { dataset: {} as Record<string, string> };
  g.window = { __GULISTON_SESSION__: motion === undefined ? {} : { motion } };
  g.document = { documentElement: html };
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
  try {
    run(html);
  } finally {
    delete g.window;
    delete g.document;
    delete (globalThis as Record<string, unknown>).navigator;
  }
}

test('applyGuestMotion: daraja <html data-motion> ga qo\'yiladi (dizayn tartibidan qat\'i nazar)', () => {
  withEnv('off', { hardwareConcurrency: 8 }, (html) => {
    assert.equal(applyGuestMotion(), 'off');
    assert.equal(html.dataset.motion, 'off');
  });
  withEnv(undefined, { hardwareConcurrency: 8 }, (html) => {
    assert.equal(applyGuestMotion(), 'full');
    assert.equal(html.dataset.motion, 'full');
  });
});

test('applyGuestMotion: zaif qurilmada standart full -> light', () => {
  withEnv(undefined, { hardwareConcurrency: 2 }, (html) => {
    assert.equal(applyGuestMotion(), 'light');
    assert.equal(html.dataset.motion, 'light');
  });
});

// Egasi qarori: imkoniyatlar dizaynga (`guest_design`) bog'liq emas. Oldin klassik tartibda atribut olib tashlanardi (null);
// endi sessiyada `design: 'classic'` bo'lsa ham animatsiya darajasi xuddi shunday qo'yiladi.
test('applyGuestMotion: klassik tartibda (design=classic) ham daraja qo\'yiladi — egasi qarori: imkoniyatlar dizaynga bog\'liq emas', () => {
  withEnv('off', { hardwareConcurrency: 8 }, (html) => {
    (g.window as { __GULISTON_SESSION__: Record<string, unknown> }).__GULISTON_SESSION__.design = 'classic';
    html.dataset.motion = 'full';
    assert.equal(applyGuestMotion(), 'off');
    assert.equal(html.dataset.motion, 'off');
  });
  withEnv(undefined, { hardwareConcurrency: 8 }, (html) => {
    (g.window as { __GULISTON_SESSION__: Record<string, unknown> }).__GULISTON_SESSION__.design = 'classic';
    assert.equal(applyGuestMotion(), 'full');
    assert.equal(html.dataset.motion, 'full');
  });
});
