/**
 * Haqiqiy cache.ts ni sinaydi (funksiyani testning ichida qayta yozmaydi):
 * boshqariladigan soxta fetcher (deferred) va soxta soat bilan.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithSWR, invalidateCache, getCached } from '../src/api/cache.ts';

function fakeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

/** Qo'lda hal qilinadigan va'da: fon so'rovi qachon tugashini test o'zi boshqaradi. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** Mikrotasklar (then zanjirlari) tugashini kutadi. */
const flush = () => new Promise<void>((r) => setImmediate(r));

beforeEach(() => invalidateCache());

test('birinchi chaqiruv: fetcher chaqiriladi va natija keshlanadi', async () => {
  const clock = fakeClock();
  let calls = 0;
  const res = await fetchWithSWR('k1', async () => ++calls, { ttlMs: 1000, now: clock.now });
  assert.deepEqual(res, { data: 1, isStale: false });
  assert.equal(getCached<number>('k1'), 1);
  assert.equal(calls, 1);
});

test('yangi kesh: tarmoqqa chiqilmaydi, onUpdate chaqirilmaydi', async () => {
  const clock = fakeClock();
  let calls = 0;
  let updates = 0;
  await fetchWithSWR('k2', async () => ++calls, { ttlMs: 1000, now: clock.now });
  clock.advance(999);
  const res = await fetchWithSWR('k2', async () => ++calls, { ttlMs: 1000, now: clock.now, onUpdate: () => { updates++; } });
  await flush();
  assert.deepEqual(res, { data: 1, isStale: false });
  assert.equal(calls, 1);
  assert.equal(updates, 0);
});

test('eskirgan kesh: eski qiymat darrov qaytadi, fon yangilanishi onUpdate orqali yetadi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('k3', async () => 'eski', { ttlMs: 1000, now: clock.now });
  clock.advance(1001);

  const bg = deferred<string>();
  const received: string[] = [];
  const res = await fetchWithSWR('k3', () => bg.promise, {
    ttlMs: 1000,
    now: clock.now,
    onUpdate: (fresh) => received.push(fresh),
  });

  // 1) Eski qiymat darrov qaytdi va "eskirgan" deb belgilandi
  assert.deepEqual(res, { data: 'eski', isStale: true });
  // 2) Fon so'rovi hali tugamadi: onUpdate chaqirilmagan, kesh hali eski
  assert.deepEqual(received, []);
  assert.equal(getCached<string>('k3'), 'eski');

  // 3) Fon so'rovi tugadi: yangi qiymat chaqiruvchiga yetdi va keshga yozildi
  bg.resolve('yangi');
  await flush();
  assert.deepEqual(received, ['yangi']);
  assert.equal(getCached<string>('k3'), 'yangi');

  // 4) Endi kesh yangi: keyingi chaqiruv yangi qiymatni isStale=false bilan beradi
  const again = await fetchWithSWR('k3', async () => 'kerak emas', { ttlMs: 1000, now: clock.now });
  assert.deepEqual(again, { data: 'yangi', isStale: false });
});

test('fon yangilanishi xato bo\'lsa: eski qiymat qoladi, onUpdate chaqirilmaydi, ushlanmagan xato yo\'q', async () => {
  const clock = fakeClock();
  await fetchWithSWR('k4', async () => 'eski', { ttlMs: 1000, now: clock.now });
  clock.advance(5000);

  const bg = deferred<string>();
  let updates = 0;
  const res = await fetchWithSWR('k4', () => bg.promise, { ttlMs: 1000, now: clock.now, onUpdate: () => { updates++; } });
  assert.equal(res.data, 'eski');

  bg.reject(new Error('tarmoq uzildi'));
  await flush();

  assert.equal(updates, 0);
  assert.equal(getCached<string>('k4'), 'eski');

  // So'rov tugagani uchun keyingi eskirgan chaqiruv yana fonda urinadi
  const retry = deferred<string>();
  const got: string[] = [];
  await fetchWithSWR('k4', () => retry.promise, { ttlMs: 1000, now: clock.now, onUpdate: (f) => got.push(f) });
  retry.resolve('qayta urinish');
  await flush();
  assert.deepEqual(got, ['qayta urinish']);
});

test('bir kalit uchun bir vaqtda bitta fon so\'rovi; barcha tinglovchilar yangi qiymat oladi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('k5', async () => 1, { ttlMs: 1000, now: clock.now });
  clock.advance(2000);

  const bg = deferred<number>();
  let fetches = 0;
  const fetcher = () => { fetches++; return bg.promise; };
  const a: number[] = [];
  const b: number[] = [];
  await fetchWithSWR('k5', fetcher, { ttlMs: 1000, now: clock.now, onUpdate: (v) => a.push(v) });
  await fetchWithSWR('k5', fetcher, { ttlMs: 1000, now: clock.now, onUpdate: (v) => b.push(v) });
  assert.equal(fetches, 1);

  bg.resolve(2);
  await flush();
  assert.deepEqual(a, [2]);
  assert.deepEqual(b, [2]);
});

test('onUpdate ichidagi xato keshga yozilishiga va boshqa tinglovchilarga xalaqit bermaydi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('k6', async () => 1, { ttlMs: 1000, now: clock.now });
  clock.advance(2000);
  const bg = deferred<number>();
  const ok: number[] = [];
  await fetchWithSWR('k6', () => bg.promise, { ttlMs: 1000, now: clock.now, onUpdate: () => { throw new Error('hook yiqildi'); } });
  await fetchWithSWR('k6', () => bg.promise, { ttlMs: 1000, now: clock.now, onUpdate: (v) => ok.push(v) });
  bg.resolve(7);
  await flush();
  assert.equal(getCached<number>('k6'), 7);
  assert.deepEqual(ok, [7]);
});

test('force: yangi kesh bo\'lsa ham tarmoqdan darrov yangi qiymat oladi', async () => {
  const clock = fakeClock();
  let calls = 0;
  await fetchWithSWR('k7', async () => ++calls, { ttlMs: 60_000, now: clock.now });
  const res = await fetchWithSWR('k7', async () => ++calls, { ttlMs: 60_000, now: clock.now, force: true });
  assert.deepEqual(res, { data: 2, isStale: false });
  assert.equal(calls, 2);
  assert.equal(getCached<number>('k7'), 2);
});

test('force xatosi: xato tashlanadi, keshdagi eski qiymat saqlanadi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('k8', async () => 'eski', { ttlMs: 60_000, now: clock.now });
  await assert.rejects(
    fetchWithSWR('k8', async () => { throw new Error('500'); }, { ttlMs: 60_000, now: clock.now, force: true }),
    /500/
  );
  assert.equal(getCached<string>('k8'), 'eski');
});

test('force ketayotgan eski fon so\'rovini bekor qiladi: eski javob keyin kelib yangisini bosib ketmaydi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('k9', async () => 'v0', { ttlMs: 1000, now: clock.now });
  clock.advance(2000);

  const slow = deferred<string>();
  const updates: string[] = [];
  await fetchWithSWR('k9', () => slow.promise, { ttlMs: 1000, now: clock.now, onUpdate: (v) => updates.push(v) });

  // Foydalanuvchi "Yangilash" bosdi: tez javob keladi
  const forced = await fetchWithSWR('k9', async () => 'v2', { ttlMs: 1000, now: clock.now, force: true });
  assert.equal(forced.data, 'v2');
  // Eski tinglovchi yangi qiymatni oladi (so'rov unga ko'chirilgan)
  await flush();
  assert.deepEqual(updates, ['v2']);

  // Sekin eski so'rov oxiri kelib "v1" ni qaytaradi: u hech narsani o'zgartirmasligi shart
  slow.resolve('v1');
  await flush();
  assert.equal(getCached<string>('k9'), 'v2');
  assert.deepEqual(updates, ['v2']);
});

test('invalidateCache(prefix): faqat mos kalitlar o\'chadi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('menu:a', async () => 1, { now: clock.now });
  await fetchWithSWR('menu:b', async () => 2, { now: clock.now });
  await fetchWithSWR('orders:a', async () => 3, { now: clock.now });
  invalidateCache('menu:');
  assert.equal(getCached('menu:a'), undefined);
  assert.equal(getCached('menu:b'), undefined);
  assert.equal(getCached<number>('orders:a'), 3);
  invalidateCache();
  assert.equal(getCached('orders:a'), undefined);
});

test('invalidateCache fon so\'rovi ketayotganda: eskirgan javob keshga yozilmaydi va onUpdate chaqirilmaydi', async () => {
  const clock = fakeClock();
  await fetchWithSWR('menu:x', async () => 'eski', { ttlMs: 1000, now: clock.now });
  clock.advance(2000);

  const bg = deferred<string>();
  const updates: string[] = [];
  await fetchWithSWR('menu:x', () => bg.promise, { ttlMs: 1000, now: clock.now, onUpdate: (v) => updates.push(v) });

  // Taom holati o'zgardi (mutatsiya) -> kesh bekor
  invalidateCache('menu:');
  // Mutatsiyadan OLDIN boshlangan so'rov endi javob qaytardi: bu eskirgan ma'lumot
  bg.resolve('mutatsiyadan oldingi');
  await flush();

  assert.equal(getCached('menu:x'), undefined);
  assert.deepEqual(updates, []);
});

test('keshda yo\'q bo\'lsa, bir vaqtdagi ikki chaqiruv bitta so\'rovga qo\'shiladi', async () => {
  const clock = fakeClock();
  const d = deferred<string>();
  let fetches = 0;
  const fetcher = () => { fetches++; return d.promise; };
  const p1 = fetchWithSWR('k10', fetcher, { now: clock.now });
  const p2 = fetchWithSWR('k10', fetcher, { now: clock.now });
  d.resolve('natija');
  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(fetches, 1);
  assert.equal(r1.data, 'natija');
  assert.equal(r2.data, 'natija');
});

test('keshda yo\'q va fetcher xato bersa: xato tashlanadi, keyingi chaqiruv qayta urinadi', async () => {
  const clock = fakeClock();
  await assert.rejects(fetchWithSWR('k11', async () => { throw new Error('offline'); }, { now: clock.now }), /offline/);
  assert.equal(getCached('k11'), undefined);
  const res = await fetchWithSWR('k11', async () => 'ok', { now: clock.now });
  assert.equal(res.data, 'ok');
});

test('fetcher sinxron xato tashlasa ham so\'rov "osilib" qolmaydi', async () => {
  const clock = fakeClock();
  const bad = (() => { throw new Error('sinxron'); }) as unknown as () => Promise<number>;
  await assert.rejects(fetchWithSWR('k12', bad, { now: clock.now }), /sinxron/);
  const res = await fetchWithSWR('k12', async () => 5, { now: clock.now });
  assert.equal(res.data, 5);
});

test('kesh hajmi cheklangan: eng eski yozuvlar siqib chiqariladi', async () => {
  const clock = fakeClock();
  for (let i = 0; i < 250; i++) {
    await fetchWithSWR(`big:${i}`, async () => i, { now: clock.now });
  }
  assert.equal(getCached('big:0'), undefined);
  assert.equal(getCached<number>('big:249'), 249);
});
