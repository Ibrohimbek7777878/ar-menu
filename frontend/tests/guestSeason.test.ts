import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGuestSeason, parseGuestSeason } from '../src/utils/guestSeason.ts';

const g = globalThis as unknown as Record<string, unknown>;

function withDom(season: unknown, run: (html: { dataset: Record<string, string> }) => void) {
  const html = { dataset: {} as Record<string, string> };
  g.window = { __GULISTON_SESSION__: season === undefined ? {} : { season } };
  g.document = { documentElement: html };
  try {
    run(html);
  } finally {
    delete g.window;
    delete g.document;
  }
}

test('parseGuestSeason: faqat 4 ta fasl nomi qabul qilinadi', () => {
  for (const s of ['kuz', 'qish', 'bahor', 'yoz']) assert.equal(parseGuestSeason(s), s);
  for (const bad of ['off', 'auto', 'neon', '', '<script>', 'KUZ', null, undefined, 5, {}]) {
    assert.equal(parseGuestSeason(bad), null, String(bad));
  }
});

test('applyGuestSeason: fasl <html data-season> ga qo\'yiladi', () => {
  withDom('qish', (html) => {
    assert.equal(applyGuestSeason(), 'qish');
    assert.equal(html.dataset.season, 'qish');
  });
});

// Egasi qarori: imkoniyatlar dizaynga (`guest_design`) bog'liq emas — klassik tartibda ham fasl rangi ishlaydi.
test('applyGuestSeason: klassik tartibda (design=classic) ham fasl qo\'yiladi — egasi qarori: imkoniyatlar dizaynga bog\'liq emas', () => {
  withDom('qish', (html) => {
    (g.window as { __GULISTON_SESSION__: Record<string, unknown> }).__GULISTON_SESSION__.design = 'classic';
    html.dataset.season = 'yoz';
    assert.equal(applyGuestSeason(), 'qish');
    assert.equal(html.dataset.season, 'qish');
  });
});

test('applyGuestSeason: fasl yo\'q yoki noto\'g\'ri bo\'lsa atribut yo\'q (ranglar o\'zgarmaydi)', () => {
  for (const season of [undefined, 'off', 'neon']) {
    withDom(season, (html) => {
      assert.equal(applyGuestSeason(), null);
      assert.equal('season' in html.dataset, false);
    });
  }
});
