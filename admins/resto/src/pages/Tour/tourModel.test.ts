import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEditable, normalizeSuggestions, normalizeTour, playableSource, toursFromResponse } from './tourModel.ts';

const SERVER_TOUR = {
  id: 1, title: 'Asosiy zal', hall_id: null, status: 'ready', status_label: 'Tayyor', duration_s: 44.6, width: 720, height: 1280,
  variants: { scrub: '/media/s.mp4', play: '/media/p.mp4', low: '/media/l.mp4', poster: '/media/p.jpg' }, error: '',
  stops: [{ id: 2, order: 1, title: 'Zal', t: 10 }, { id: 1, order: 0, title: 'Kirish', t: 0 }],
  hotspots: [{ id: 1, table_id: 3, table_number: '03', label: '', t_start: 12, t_end: 16.5, x: 0.52, y: 0.61 }],
  ai_status: 'idle', ai_suggestions: null, published: false, created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:05:00Z',
};

test('normalizeTour: shartnomadagi to\'liq javob', () => {
  const tour = normalizeTour(SERVER_TOUR);
  assert.ok(tour);
  assert.equal(tour.id, 1);
  assert.equal(tour.status, 'ready');
  assert.equal(tour.duration_s, 44.6);
  assert.deepEqual(tour.stops.map((s) => s.title), ['Kirish', 'Zal']); // vaqt bo'yicha tartiblangan
  assert.deepEqual(tour.hotspots[0], { id: 1, table_id: 3, table_number: '03', label: '', t_start: 12, t_end: 16.5, x: 0.52, y: 0.61 });
  assert.equal(tour.ai_suggestions, null);
  assert.equal(tour.published, false);
});

test('normalizeTour: bo\'sh variants ({}), noma\'lum holat, yaroqsiz kirish', () => {
  const draft = normalizeTour({ id: 5, title: 'X', status: 'draft', variants: {}, stops: [], hotspots: [] });
  assert.ok(draft);
  assert.deepEqual(draft.variants, {});
  assert.equal(draft.duration_s, 0);
  assert.equal(normalizeTour({ id: 5, status: 'archived' })?.status, 'draft');
  for (const bad of [null, undefined, 5, 'x', [], {}, { id: 'a' }, { id: 0 }, { id: -2 }, { id: 1.5 }]) assert.equal(normalizeTour(bad), null, JSON.stringify(bad));
});

test('normalizeTour: published status bo\'lsa published=true', () => {
  assert.equal(normalizeTour({ id: 1, status: 'published' })?.published, true);
  assert.equal(normalizeTour({ id: 1, status: 'ready', published: false })?.published, false);
});

test('normalizeTour: yaroqsiz nuqta va belgilar tashlanadi, koordinata 0..1 ga siqiladi', () => {
  const tour = normalizeTour({
    id: 1,
    stops: [{ id: 1, title: 'ok', t: 1 }, { id: 2, title: 'no t' }, { id: 3, title: 'neg', t: -4 }, null, 'x', { title: 'no id', t: 2 }],
    hotspots: [
      { id: 1, table_id: 3, t_start: 1, t_end: 2, x: 1.4, y: -0.2 },
      { id: 2, table_id: null, t_start: 1, t_end: 2, x: 0.1, y: 0.1 },
      { id: 3, table_id: 4, t_start: 'a', t_end: 2, x: 0.1, y: 0.1 },
      { table_id: 4, t_start: 1, t_end: 2, x: 0.1, y: 0.1 },
    ],
  });
  assert.ok(tour);
  assert.equal(tour.stops.length, 1);
  assert.equal(tour.hotspots.length, 2);
  assert.deepEqual([tour.hotspots[0].x, tour.hotspots[0].y], [1, 0]);
  assert.equal(tour.hotspots[1].table_id, null);
});

test('normalizeSuggestions: null, bo\'sh va yaroqsiz -> null', () => {
  for (const raw of [null, undefined, 3, 'x', [], {}, { stops: [], hotspots: [] }, { stops: 'x', hotspots: null }, { stops: [{ t: 'a' }], hotspots: [{ t: 1 }] }]) {
    assert.equal(normalizeSuggestions(raw, 44), null, JSON.stringify(raw));
  }
});

test('normalizeSuggestions: shartnoma shakli, tartiblash va siqish', () => {
  const result = normalizeSuggestions(
    {
      stops: [{ t: 40, title: ' Terrasa ', confidence: 0.5 }, { t: 4, title: 'Asosiy zal', confidence: 0.8 }, { t: 99, title: 'Oxiri', confidence: 5 }],
      hotspots: [{ t: 13, x: 0.5, y: 0.6, label: 'Yumaloq stol', confidence: 0.6 }, { t: 2, x: 7, y: -1, label: 'x' }, { t: 3, x: Number.NaN, y: 1 }],
    },
    44,
  );
  assert.ok(result);
  assert.deepEqual(result.stops.map((s) => s.t), [4, 40, 44]);
  assert.equal(result.stops[1].title, 'Terrasa');
  assert.equal(result.stops[2].confidence, 1);
  assert.deepEqual(result.hotspots.map((h) => [h.t, h.x, h.y]), [[2, 1, 0], [13, 0.5, 0.6]]);
  assert.equal(result.hotspots[0].confidence, null);
});

test('toursFromResponse: {results} va massiv, yangisi birinchi', () => {
  const a = { ...SERVER_TOUR, id: 1, updated_at: '2026-11-01T00:00:00Z' };
  const b = { ...SERVER_TOUR, id: 2, updated_at: '2026-11-03T00:00:00Z' };
  assert.deepEqual(toursFromResponse({ results: [a, b, null, { id: 'x' }] }).map((x) => x.id), [2, 1]);
  assert.deepEqual(toursFromResponse([a]).map((x) => x.id), [1]);
  assert.deepEqual(toursFromResponse(null), []);
  assert.deepEqual(toursFromResponse({ results: 'x' }), []);
});

test('playableSource va isEditable', () => {
  assert.equal(playableSource({ play: 'p', low: 'l' }), 'p');
  assert.equal(playableSource({ low: 'l', scrub: 's' }), 'l');
  assert.equal(playableSource({ scrub: 's' }), 's');
  assert.equal(playableSource({}), '');
  assert.equal(isEditable('ready'), true);
  assert.equal(isEditable('published'), true);
  for (const status of ['draft', 'processing', 'failed'] as const) assert.equal(isEditable(status), false);
});
