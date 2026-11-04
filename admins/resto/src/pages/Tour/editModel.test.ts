import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_DIFF, acceptHotspotSuggestion, acceptStopSuggestion, addHotspot, addStop, baseSignature, confidencePercent, countSuggestions, coverage,
  diffHotspots, diffStops, draftHotspotsFromTour, draftStopsFromTour, findSameHotspot, hotspotsPayload, hotspotSuggestionKey, isDirtyDiff,
  keyedSuggestions, removeHotspot, removeStop, stopIndexAt, stopSuggestionKey, stopsPayload, sumDiff, tourTables, updateHotspot, updateStop, validateDraft,
} from './editModel.ts';
import type { AiSuggestions, DraftHotspot, DraftStop, TableOption, TourHotspot, TourStop } from './types.ts';

const SERVER_STOPS: TourStop[] = [{ id: 1, order: 0, title: 'Kirish', t: 0 }, { id: 2, order: 1, title: 'Asosiy zal', t: 10 }];
const SERVER_SPOTS: TourHotspot[] = [
  { id: 1, table_id: 3, table_number: '03', label: '', t_start: 12, t_end: 16.5, x: 0.52, y: 0.61 },
  { id: 2, table_id: 5, table_number: '05', label: 'Deraza', t_start: 20, t_end: 24, x: 0.3, y: 0.4 },
];
const tables = (): TableOption[] => [
  { id: 3, number: '03', hall: 'Asosiy zal', hallId: 1, capacity: 8 },
  { id: 5, number: '05', hall: 'Asosiy zal', hallId: 1, capacity: 4 },
  { id: 10, number: '10', hall: 'Terrasa', hallId: 2, capacity: 6 },
  { id: 2, number: '2', hall: 'Asosiy zal', hallId: 1, capacity: 2 },
];

test('serverdan qoralamaga: kalitlar id dan, o\'zgarmas nusxa', () => {
  const stops = draftStopsFromTour(SERVER_STOPS);
  assert.deepEqual(stops.map((s) => [s.key, s.id]), [['s1', 1], ['s2', 2]]);
  const spots = draftHotspotsFromTour(SERVER_SPOTS);
  assert.deepEqual(spots.map((h) => h.key), ['h1', 'h2']);
});

test('addStop / updateStop / removeStop: tartib vaqt bo\'yicha, kirish o\'zgarmaydi', () => {
  const base = draftStopsFromTour(SERVER_STOPS);
  const added = addStop(base, '  Terrasa ', 5.04);
  assert.deepEqual(added.list.map((s) => s.title), ['Kirish', 'Terrasa', 'Asosiy zal']);
  assert.equal(added.list[1].t, 5);
  assert.equal(added.list[1].id, null);
  assert.equal(base.length, 2);
  const moved = updateStop(added.list, added.key, { t: 30 });
  assert.deepEqual(moved.map((s) => s.title), ['Kirish', 'Asosiy zal', 'Terrasa']);
  assert.equal(removeStop(moved, added.key).length, 2);
  assert.equal(removeStop(moved, 'yo\'q').length, 3);
});

test('addHotspot: standart oraliq hozirgi -1 / +2.5, stol tanlanmagan, joy siqiladi', () => {
  const result = addHotspot([], { x: 0.52, y: 1.4, now: 13, duration: 44.6 });
  assert.equal(result.list.length, 1);
  const h = result.list[0];
  assert.deepEqual([h.t_start, h.t_end, h.x, h.y, h.table_id, h.id], [12, 15.5, 0.52, 1, null, null]);
  assert.equal(h.key, result.key);
});

test('updateHotspot / removeHotspot', () => {
  const base = draftHotspotsFromTour(SERVER_SPOTS);
  const updated = updateHotspot(base, 'h2', { t_start: 1, t_end: 3 });
  assert.deepEqual(updated.map((h) => h.key), ['h2', 'h1']); // t_start bo'yicha qayta tartiblandi
  assert.equal(base[1].t_start, 20); // asl o'zgarmadi
  assert.equal(removeHotspot(base, 'h1').length, 1);
});

test('stopsPayload: nom kesiladi, vaqt bo\'yicha tartiblanadi, 2 xona', () => {
  const list: DraftStop[] = [{ key: 'a', id: null, title: ' Zal ', t: 10.004 }, { key: 'b', id: 2, title: 'Kirish', t: 0 }];
  assert.deepEqual(stopsPayload(list), [{ title: 'Kirish', t: 0 }, { title: 'Zal', t: 10 }]);
});

test('hotspotsPayload: yorliq bo\'sh bo\'lsa yuborilmaydi, stolsiz belgi tashlanadi', () => {
  const list: DraftHotspot[] = [
    { key: 'a', id: null, table_id: 5, label: '  ', t_start: 20, t_end: 24, x: 0.123456, y: 0.5, },
    { key: 'b', id: null, table_id: null, label: '', t_start: 1, t_end: 2, x: 0.5, y: 0.5 },
    { key: 'c', id: 3, table_id: 3, label: ' Deraza ', t_start: 12, t_end: 16.5, x: 0.52, y: 0.61 },
  ];
  assert.deepEqual(hotspotsPayload(list), [
    { table_id: 3, label: 'Deraza', t_start: 12, t_end: 16.5, x: 0.52, y: 0.61 },
    { table_id: 5, t_start: 20, t_end: 24, x: 0.1235, y: 0.5 },
  ]);
});

test('diffStops: o\'zgarmagan qoralama farqsiz', () => {
  const base = draftStopsFromTour(SERVER_STOPS);
  assert.deepEqual(diffStops(base, draftStopsFromTour(SERVER_STOPS)), NO_DIFF);
  assert.equal(isDirtyDiff(diffStops(base, base)), false);
});

test('diffStops: qo\'shilgan, o\'chirilgan, o\'zgargan', () => {
  const base = draftStopsFromTour(SERVER_STOPS);
  let draft = addStop(base, 'Yangi', 20).list;
  assert.deepEqual(diffStops(base, draft), { added: 1, removed: 0, changed: 0 });
  draft = removeStop(base, 's1');
  assert.deepEqual(diffStops(base, draft), { added: 0, removed: 1, changed: 0 });
  draft = updateStop(base, 's2', { title: 'Boshqa' });
  assert.deepEqual(diffStops(base, draft), { added: 0, removed: 0, changed: 1 });
  draft = updateStop(base, 's2', { t: 10.001 }); // 0.01 dan kichik farq — o'zgarish emas
  assert.equal(isDirtyDiff(diffStops(base, draft)), false);
  draft = updateStop(base, 's2', { title: ' Asosiy zal ' }); // bo'sh joy — o'zgarish emas
  assert.equal(isDirtyDiff(diffStops(base, draft)), false);
  draft = updateStop(removeStop(addStop(base, 'Yangi', 3).list, 's1'), 's2', { t: 11 });
  assert.deepEqual(diffStops(base, draft), { added: 1, removed: 1, changed: 1 });
});

test('diffHotspots: har maydon o\'zgarishi aniqlanadi', () => {
  const base = draftHotspotsFromTour(SERVER_SPOTS);
  assert.equal(isDirtyDiff(diffHotspots(base, draftHotspotsFromTour(SERVER_SPOTS))), false);
  for (const patch of [{ table_id: 10 }, { label: 'x' }, { t_start: 12.5 }, { t_end: 17 }, { x: 0.6 }, { y: 0.7 }]) {
    assert.deepEqual(diffHotspots(base, updateHotspot(base, 'h1', patch)), { added: 0, removed: 0, changed: 1 }, JSON.stringify(patch));
  }
  const withNew = addHotspot(base, { x: 0.5, y: 0.5, now: 5, duration: 44 }).list;
  assert.deepEqual(diffHotspots(base, withNew), { added: 1, removed: 0, changed: 0 });
  assert.deepEqual(diffHotspots(base, removeHotspot(base, 'h2')), { added: 0, removed: 1, changed: 0 });
  assert.equal(sumDiff({ added: 1, removed: 2, changed: 3 }, NO_DIFF), 6);
});

test('baseSignature: bir xil holat bir xil iz, o\'zgarish — boshqa iz', () => {
  const stops = draftStopsFromTour(SERVER_STOPS);
  const spots = draftHotspotsFromTour(SERVER_SPOTS);
  assert.equal(baseSignature(stops, spots), baseSignature(draftStopsFromTour(SERVER_STOPS), draftHotspotsFromTour(SERVER_SPOTS)));
  assert.notEqual(baseSignature(stops, spots), baseSignature(stops, updateHotspot(spots, 'h1', { x: 0.9 })));
});

test('validateDraft: toza qoralama xatosiz', () => {
  assert.deepEqual(validateDraft(draftStopsFromTour(SERVER_STOPS), draftHotspotsFromTour(SERVER_SPOTS), 44.6), []);
});

test('validateDraft: nuqta xatolari', () => {
  const stops: DraftStop[] = [
    { key: 'a', id: null, title: '   ', t: 1 },
    { key: 'b', id: null, title: 'x'.repeat(101), t: 1 },
    { key: 'c', id: null, title: 'Ok', t: Number.NaN },
    { key: 'd', id: null, title: 'Ok', t: 50 },
    { key: 'e', id: null, title: 'Ok', t: 44.6 },
  ];
  assert.deepEqual(validateDraft(stops, [], 44.6).map((i) => `${i.key}:${i.code}`), ['a:title_empty', 'b:title_long', 'c:time_invalid', 'd:time_beyond']);
});

test('validateDraft: belgi xatolari (stol, oraliq, joy)', () => {
  const base = { id: null, label: '', x: 0.5, y: 0.5 };
  const spots: DraftHotspot[] = [
    { ...base, key: 'a', table_id: null, t_start: 1, t_end: 2 },
    { ...base, key: 'b', table_id: 3, t_start: 5, t_end: 5 },
    { ...base, key: 'c', table_id: 3, t_start: 40, t_end: 60 },
    { ...base, key: 'd', table_id: 3, t_start: -1, t_end: 2 },
    { ...base, key: 'e', table_id: 3, t_start: 1, t_end: 2, x: 1.2 },
    { ...base, key: 'f', table_id: 3, t_start: 1, t_end: 2, label: 'x'.repeat(61) },
    { ...base, key: 'g', table_id: 3, t_start: 1, t_end: 2 },
  ];
  assert.deepEqual(validateDraft([], spots, 44.6).map((i) => `${i.key}:${i.code}`), ['a:table_missing', 'b:order', 'c:beyond', 'd:negative', 'e:position_invalid', 'f:label_long']);
});

test('stopIndexAt: hozirgi nuqta', () => {
  const stops = [{ t: 0 }, { t: 10 }, { t: 20 }];
  assert.equal(stopIndexAt(stops, 0), 0);
  assert.equal(stopIndexAt(stops, 9.9), 0);
  assert.equal(stopIndexAt(stops, 9.97), 1); // EPS ichida
  assert.equal(stopIndexAt(stops, 25), 2);
  assert.equal(stopIndexAt([{ t: 5 }], 1), -1);
  assert.equal(stopIndexAt([], 1), -1);
});

test('coverage: ulanmagan stollar, tartib raqam bo\'yicha', () => {
  const result = coverage(tables(), [{ table_id: 3 }, { table_id: 3 }, { table_id: null }]);
  assert.equal(result.total, 4);
  assert.equal(result.linked, 1);
  assert.deepEqual(result.unlinked.map((t) => t.number), ['2', '05', '10']); // 2 < 05 < 10 (raqamli tartib)
  assert.equal(result.orphans, 0);
});

test('coverage: hammasi ulangan, stolsiz, ro\'yxatda yo\'q stol', () => {
  assert.deepEqual(coverage(tables(), [{ table_id: 3 }, { table_id: 5 }, { table_id: 10 }, { table_id: 2 }]).unlinked, []);
  assert.deepEqual(coverage([], []), { total: 0, linked: 0, unlinked: [], orphans: 0 });
  const orphan = coverage(tables(), [{ table_id: 99 }, { table_id: 3 }]);
  assert.equal(orphan.orphans, 1);
  assert.equal(orphan.linked, 1);
});

test('tourTables: zalga biriktirilgan sayr faqat shu zal stollarini qamraydi', () => {
  assert.equal(tourTables(tables(), null).length, 4);
  assert.deepEqual(tourTables(tables(), 2).map((t) => t.number), ['10']);
  assert.deepEqual(tourTables(tables(), 99), []);
});

const AI: AiSuggestions = {
  stops: [{ t: 4, title: 'Asosiy zal', confidence: 0.8 }, { t: 30, title: '', confidence: null }],
  hotspots: [{ t: 13, x: 0.5, y: 0.6, label: 'Yumaloq stol', confidence: 0.6 }],
};

test('keyedSuggestions: kalitlar indeks bo\'yicha, rad etilganlar chiqariladi', () => {
  const all = keyedSuggestions(AI, new Set());
  assert.deepEqual(all.stops.map((s) => s.key), ['stop:0', 'stop:1']);
  assert.deepEqual(all.hotspots.map((s) => s.key), ['hotspot:0']);
  assert.equal(countSuggestions(all), 3);
  const rest = keyedSuggestions(AI, new Set([stopSuggestionKey(0), hotspotSuggestionKey(0)]));
  assert.deepEqual(rest.stops.map((s) => s.key), ['stop:1']);
  assert.equal(countSuggestions(rest), 1);
  assert.equal(countSuggestions(keyedSuggestions(null, new Set())), 0);
});

test('acceptStopSuggestion: ro\'yxatga qo\'shadi, takror qo\'shmaydi, bo\'sh nomga zaxira', () => {
  const base = draftStopsFromTour(SERVER_STOPS);
  const first = acceptStopSuggestion(base, AI.stops[0], 44.6, 'Nuqta');
  assert.ok(first.key);
  assert.deepEqual(first.list.map((s) => s.title), ['Kirish', 'Asosiy zal', 'Asosiy zal']);
  const again = acceptStopSuggestion(first.list, AI.stops[0], 44.6, 'Nuqta');
  assert.equal(again.key, null);
  assert.equal(again.list.length, first.list.length);
  const noTitle = acceptStopSuggestion(base, AI.stops[1], 44.6, 'Nuqta');
  assert.equal(noTitle.list.find((s) => s.key === noTitle.key)?.title, 'Nuqta');
  const beyond = acceptStopSuggestion(base, { t: 99, title: 'Oxir', confidence: null }, 44.6, 'Nuqta');
  assert.equal(beyond.list.find((s) => s.key === beyond.key)?.t, 44.6);
});

test('acceptHotspotSuggestion: stol tanlashni TALAB qiladi', () => {
  const base = draftHotspotsFromTour(SERVER_SPOTS);
  for (const table of [null, 0, -3, 1.5, Number.NaN]) {
    assert.deepEqual(acceptHotspotSuggestion(base, AI.hotspots[0], table, 44.6), { ok: false, reason: 'table_required' }, String(table));
  }
});

test('acceptHotspotSuggestion: tanlangan stol bilan belgi qo\'shiladi', () => {
  const base = draftHotspotsFromTour(SERVER_SPOTS);
  const result = acceptHotspotSuggestion(base, AI.hotspots[0], 10, 44.6);
  assert.ok(result.ok);
  const added = result.list.find((h) => h.key === result.key);
  assert.ok(added);
  assert.deepEqual([added.table_id, added.label, added.x, added.y, added.t_start, added.t_end, added.id], [10, 'Yumaloq stol', 0.5, 0.6, 12, 15.5, null]);
  assert.equal(result.list.length, 3);
  assert.equal(base.length, 2);
  assert.deepEqual(validateDraft([], result.list, 44.6), []);
});

test('findSameHotspot: saqlangandan keyin belgini qayta topish', () => {
  const draft = draftHotspotsFromTour(SERVER_SPOTS);
  const target: DraftHotspot = { ...draft[1], key: 'hn7', id: null };
  assert.equal(findSameHotspot(draft, target)?.key, 'h2');
  assert.equal(findSameHotspot(draft, { ...target, x: 0.9 }), null);
});

test('confidencePercent', () => {
  assert.equal(confidencePercent(0.6), 60);
  assert.equal(confidencePercent(0.805), 81);
  assert.equal(confidencePercent(null), null);
  assert.equal(confidencePercent(4), 100);
});
