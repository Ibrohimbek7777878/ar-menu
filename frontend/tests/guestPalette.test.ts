import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGuestPalette, currentPalette, getGuestPalette, parseGuestPalette, PALETTE_CHROME } from '../src/utils/guestPalette.ts';

const g = globalThis as unknown as Record<string, unknown>;

function withDom(session: unknown, run: (html: { dataset: Record<string, string> }) => void) {
  const html = { dataset: {} as Record<string, string> };
  g.window = { __GULISTON_SESSION__: session };
  g.document = { documentElement: html };
  try {
    run(html);
  } finally {
    delete g.window;
    delete g.document;
  }
}

test('parseGuestPalette: faqat "orange" muqobil; qolgan hamma narsa standart klassik', () => {
  assert.equal(parseGuestPalette('orange'), 'orange');
  for (const bad of ['classic', '', 'ORANGE', 'neon', '<script>', null, undefined, 5, {}]) {
    assert.equal(parseGuestPalette(bad), 'classic', String(bad));
  }
});

test('getGuestPalette: sessiyada palette yo\'q bo\'lsa klassik (server standartda kalit yubormaydi)', () => {
  withDom({}, () => assert.equal(getGuestPalette(), 'classic'));
  withDom(undefined, () => assert.equal(getGuestPalette(), 'classic'));
  withDom({ palette: 'orange' }, () => assert.equal(getGuestPalette(), 'orange'));
});

test('applyGuestPalette: <html data-palette> ga yoziladi (dizayn tartibidan mustaqil)', () => {
  withDom({}, (html) => {
    assert.equal(applyGuestPalette(), 'classic');
    assert.equal(html.dataset.palette, 'classic');
  });
  withDom({ palette: 'orange', design: 'classic' }, (html) => {
    assert.equal(applyGuestPalette(), 'orange');
    assert.equal(html.dataset.palette, 'orange');
    assert.equal(currentPalette(), 'orange');
  });
});

test('currentPalette: DOM atributi sessiyadan ustun (server yozgan qiymat)', () => {
  withDom({}, (html) => {
    html.dataset.palette = 'orange';
    assert.equal(currentPalette(), 'orange');
  });
});

test('PALETTE_CHROME: har palitra va mavzu uchun # bilan 6 xonali rang', () => {
  for (const palette of ['classic', 'orange'] as const) {
    for (const theme of ['light', 'dark'] as const) {
      const c = PALETTE_CHROME[palette][theme];
      assert.match(c.header, /^#[0-9A-F]{6}$/);
      assert.match(c.background, /^#[0-9A-F]{6}$/);
    }
  }
  // apelsin avvalgi qiymatlar bilan bir xil
  assert.equal(PALETTE_CHROME.orange.dark.background, '#141110');
  assert.equal(PALETTE_CHROME.orange.light.background, '#FAF8F5');
});
