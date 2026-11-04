import test from 'node:test';
import assert from 'node:assert/strict';
import { SLOW_DOWNLINK_MBPS, planVariants, readConnection, saverReason } from '../src/pages/TourPage/network.ts';
import type { TourVideo } from '../src/pages/TourPage/types.ts';

const FULL: TourVideo = { scrub: '/s.mp4', play: '/p.mp4', low: '/l.mp4', poster: '/p.jpg' };

test('saverReason: saveData ustun; 2g/3g/slow-2g; sekin downlink; 4g va noma\'lum — oddiy', () => {
  assert.equal(saverReason({ saveData: true, effectiveType: '4g' }), 'save-data');
  assert.equal(saverReason({ reducedData: true }), 'save-data');
  assert.equal(saverReason({ saveData: true, effectiveType: '2g' }), 'save-data');
  for (const type of ['slow-2g', '2g', '3g']) assert.equal(saverReason({ effectiveType: type }), 'slow-network', type);
  assert.equal(saverReason({ effectiveType: '4g' }), null);
  assert.equal(saverReason({ effectiveType: '4g', downlink: 0.4 }), 'slow-network');
  assert.equal(saverReason({ downlink: SLOW_DOWNLINK_MBPS }), null);
  assert.equal(saverReason({ downlink: 0 }), null); // 0 = noma'lum
  assert.equal(saverReason({}), null);
  assert.equal(saverReason({ saveData: false, reducedData: false }), null);
});

test('planVariants: oddiy tarmoq — low bilan boshlab scrub ga almashtirish', () => {
  const plan = planVariants(FULL, {});
  assert.ok(plan);
  assert.equal(plan.start, 'low');
  assert.equal(plan.upgrade, 'scrub');
  assert.deepEqual(plan.order, ['low', 'play', 'scrub']);
  assert.equal(plan.saver, null);
  assert.equal(plan.upgradeOnDemand, null);
});

test('planVariants: tejash/sekin tarmoq — low da qoladi, almashtirish faqat mehmon so\'rasa', () => {
  for (const conn of [{ saveData: true }, { effectiveType: '3g' }, { effectiveType: '2g' }]) {
    const plan = planVariants(FULL, conn);
    assert.ok(plan);
    assert.equal(plan.start, 'low');
    assert.equal(plan.upgrade, null);
    assert.equal(plan.upgradeOnDemand, 'scrub');
    assert.notEqual(plan.saver, null);
  }
});

test('planVariants: yetishmayotgan variantlar', () => {
  // scrub yo'q -> play ga yangilash
  let plan = planVariants({ ...FULL, scrub: null }, {});
  assert.equal(plan?.start, 'low');
  assert.equal(plan?.upgrade, 'play');
  // low yo'q -> eng yengil mavjud (play) bilan boshlanadi, scrub ga yangilanadi
  plan = planVariants({ ...FULL, low: null }, {});
  assert.equal(plan?.start, 'play');
  assert.equal(plan?.upgrade, 'scrub');
  // faqat scrub
  plan = planVariants({ scrub: '/s.mp4', play: null, low: null, poster: null }, {});
  assert.equal(plan?.start, 'scrub');
  assert.equal(plan?.upgrade, null);
  assert.deepEqual(plan?.order, ['scrub']);
  // faqat low
  plan = planVariants({ scrub: null, play: null, low: '/l.mp4', poster: null }, {});
  assert.equal(plan?.start, 'low');
  assert.equal(plan?.upgrade, null);
  // tejash + low yo'q: play, scrub — talab bo'yicha
  plan = planVariants({ ...FULL, low: null }, { saveData: true });
  assert.equal(plan?.start, 'play');
  assert.equal(plan?.upgrade, null);
  assert.equal(plan?.upgradeOnDemand, 'scrub');
});

test('planVariants: video yo\'q (faqat poster) -> null', () => {
  assert.equal(planVariants({ scrub: null, play: null, low: null, poster: '/p.jpg' }, {}), null);
});

test('readConnection: Network Information API bo\'lmasa bo\'sh = oddiy; bor bo\'lsa o\'qiladi', () => {
  assert.deepEqual(readConnection({}, undefined), { saveData: false, effectiveType: undefined, downlink: undefined, reducedData: false });
  const info = readConnection({ connection: { saveData: true, effectiveType: '3g', downlink: 0.7 } }, { matchMedia: (q) => ({ matches: q.includes('reduced-data') }) });
  assert.deepEqual(info, { saveData: true, effectiveType: '3g', downlink: 0.7, reducedData: true });
  assert.equal(saverReason(readConnection({}, undefined)), null);
  assert.doesNotThrow(() => readConnection({}, { matchMedia: () => { throw new Error('x'); } }));
});
