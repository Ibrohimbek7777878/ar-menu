import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AT_STOP_TOLERANCE, compareTableNumbers, currentStopIndex, hotspotSignature, nearestHotspotDirection, nearestStopIndex, nextStop, prevStop,
  stopByDigit, tableEntries, visibleHotspots,
} from '../src/pages/TourPage/stops.ts';
import type { TourHotspot, TourStop } from '../src/pages/TourPage/types.ts';

const stop = (id: number, time: number, title = `n${id}`): TourStop => ({ id, title, time });
const STOPS = [stop(1, 0), stop(2, 9.5), stop(3, 20), stop(4, 40)];
const spot = (id: number, tableId: number | null, number: string, tStart: number, tEnd: number, extra: Partial<TourHotspot> = {}): TourHotspot => ({
  id, tableId, tableNumber: number, capacity: 4, label: '', tStart, tEnd, x: 0.5, y: 0.5, ...extra,
});

test('currentStopIndex: nuqtada yoki oralig\'ida; birinchi nuqtadan oldin -1; bo\'sh -1', () => {
  assert.equal(currentStopIndex(STOPS, 0), 0);
  assert.equal(currentStopIndex(STOPS, 5), 0);
  assert.equal(currentStopIndex(STOPS, 9.5), 1);
  assert.equal(currentStopIndex(STOPS, 9.5 - AT_STOP_TOLERANCE + 0.01), 1); // yetib kelish
  assert.equal(currentStopIndex(STOPS, 9.5 - AT_STOP_TOLERANCE - 0.01), 0);
  assert.equal(currentStopIndex(STOPS, 100), 3);
  assert.equal(currentStopIndex([], 5), -1);
  assert.equal(currentStopIndex([stop(1, 5)], 1), -1);
  assert.equal(currentStopIndex([stop(1, 5)], 5), 0);
});

test('nearestStopIndex: eng yaqin; teng masofada oldingisi; bo\'sh -1; bitta nuqta', () => {
  assert.equal(nearestStopIndex(STOPS, 0), 0);
  assert.equal(nearestStopIndex(STOPS, 4), 0);
  assert.equal(nearestStopIndex(STOPS, 6), 1);
  assert.equal(nearestStopIndex(STOPS, 14.75), 1); // 9.5 va 20 dan teng masofa (5.25 / 5.25)
  assert.equal(nearestStopIndex(STOPS, 1000), 3);
  assert.equal(nearestStopIndex(STOPS, -50), 0);
  assert.equal(nearestStopIndex([], 5), -1);
  assert.equal(nearestStopIndex([stop(1, 7)], 100), 0);
});

test('prevStop/nextStop: nuqtada turganda qo\'shnilar; oralig\'ida — bob boshi / keyingi', () => {
  assert.equal(prevStop(STOPS, 9.5)?.id, 1);
  assert.equal(nextStop(STOPS, 9.5)?.id, 3);
  assert.equal(prevStop(STOPS, 15)?.id, 2);
  assert.equal(nextStop(STOPS, 15)?.id, 3);
  assert.equal(prevStop(STOPS, 9.6)?.id, 1); // hali nuqta ichida (tolerance)
  assert.equal(prevStop(STOPS, 9.5 + AT_STOP_TOLERANCE + 0.01)?.id, 2);
});

test('prevStop/nextStop: chegaralar (boshi, oxiri, bo\'sh, bitta nuqta)', () => {
  assert.equal(prevStop(STOPS, 0), null);
  assert.equal(nextStop(STOPS, 0)?.id, 2);
  assert.equal(nextStop(STOPS, 40), null);
  assert.equal(prevStop(STOPS, 40)?.id, 3);
  assert.equal(prevStop([], 5), null);
  assert.equal(nextStop([], 5), null);
  assert.equal(prevStop([stop(1, 5)], 5), null);
  assert.equal(nextStop([stop(1, 5)], 5), null);
  assert.equal(prevStop([stop(1, 5)], 30)?.id, 1);
  assert.equal(nextStop([stop(1, 5)], 0)?.id, 1);
});

test('stopByDigit: 1..9 -> nuqta, tashqarisi null', () => {
  assert.equal(stopByDigit(STOPS, 1)?.id, 1);
  assert.equal(stopByDigit(STOPS, 4)?.id, 4);
  assert.equal(stopByDigit(STOPS, 5), null);
  assert.equal(stopByDigit(STOPS, 0), null);
  assert.equal(stopByDigit(STOPS, -1), null);
  assert.equal(stopByDigit(STOPS, 1.5), null);
  assert.equal(stopByDigit([], 1), null);
});

test('visibleHotspots: chegaralar ikkalasi ham kiradi; t=0 va davomiylik oxiri; barqaror tartib', () => {
  const list = [spot(2, 2, '2', 12, 16.5), spot(1, 1, '1', 0, 3), spot(3, 3, '3', 12, 20), spot(4, 4, '4', 43, 44.6)];
  assert.deepEqual(visibleHotspots(list, 0).map((h) => h.id), [1]);
  assert.deepEqual(visibleHotspots(list, 3).map((h) => h.id), [1]);
  assert.deepEqual(visibleHotspots(list, 3.001).map((h) => h.id), []);
  assert.deepEqual(visibleHotspots(list, 12).map((h) => h.id), [2, 3]);
  assert.deepEqual(visibleHotspots(list, 16.5).map((h) => h.id), [2, 3]);
  assert.deepEqual(visibleHotspots(list, 16.51).map((h) => h.id), [3]);
  assert.deepEqual(visibleHotspots(list, 44.6).map((h) => h.id), [4]);
  assert.deepEqual(visibleHotspots(list, 50), []);
  assert.deepEqual(visibleHotspots([], 5), []);
  assert.deepEqual(visibleHotspots([spot(9, 9, '9', 5, 5)], 5).map((h) => h.id), [9]); // nol uzunlikdagi oyna
});

test('hotspotSignature: tartibli id\'lar; bo\'sh -> ""', () => {
  assert.equal(hotspotSignature([]), '');
  assert.equal(hotspotSignature([spot(2, 2, '2', 0, 1), spot(7, 3, '3', 0, 1)]), '2,7');
});

test('nearestHotspotDirection: ko\'rinayotgan belgi bor/yo\'q, oldinda/orqada, teng masofa', () => {
  const list = [spot(1, 1, '1', 10, 15), spot(2, 2, '2', 30, 35)];
  assert.equal(nearestHotspotDirection(list, 12), null); // belgi ko'rinib turibdi
  assert.equal(nearestHotspotDirection(list, 0), 'forward');
  assert.equal(nearestHotspotDirection(list, 8), 'forward'); // 2 s oldinda
  assert.equal(nearestHotspotDirection(list, 17), 'back'); // 2 s orqada, keyingisi 13 s oldinda
  assert.equal(nearestHotspotDirection(list, 22.5), 'forward'); // teng masofa -> oldinga
  assert.equal(nearestHotspotDirection(list, 40), 'back');
  assert.equal(nearestHotspotDirection([], 5), null);
});

test('compareTableNumbers: tabiiy tartib (2 < 10 < VIP)', () => {
  const sorted = ['10', 'VIP-2', '2', 'VIP-10', '03', 'A1'].sort(compareTableNumbers);
  assert.deepEqual(sorted, ['2', '03', '10', 'A1', 'VIP-2', 'VIP-10']);
  assert.equal(compareTableNumbers('5', '5'), 0);
});

test('tableEntries: har stol bir marta (birinchi oyna), stolsiz belgilar tashlanadi, raqam bo\'yicha tartib', () => {
  const list = [
    spot(1, 10, '10', 20, 24),
    spot(2, 3, '03', 12, 16.5, { capacity: 8 }),
    spot(3, 3, '03', 30, 34),
    spot(4, null, '', 5, 6, { label: 'Bar' }),
    spot(5, 7, 'VIP-1', 40, 42),
  ];
  const entries = tableEntries(list);
  assert.deepEqual(entries.map((e) => e.tableId), [3, 10, 7]);
  assert.equal(entries[0].capacity, 8);
  assert.equal(entries[0].seekTime, 14.25); // birinchi oynaning o'rtasi
  assert.deepEqual(tableEntries([]), []);
  assert.deepEqual(tableEntries([spot(1, null, '', 0, 1)]), []);
});
