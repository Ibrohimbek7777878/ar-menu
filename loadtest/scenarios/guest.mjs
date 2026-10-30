// A-stsenariy (TZ Q1): N ta BIR VAQTDAGI mehmon. Har bir "slot" ketma-ket yangi mehmonlarni o'ynaydi:
// boshlang'ich sahifa (ba'zan) -> menyu sahifasi -> o'ylash (brauzerda ko'rish, so'rovsiz) -> ba'zan buyurtma.
// Mehmon ilovasi polling qilmaydi (frontend/src/utils/pollerRoute.ts), shuning uchun o'ylash paytida so'rov yo'q.
import { loadProductIds, placeOrder, randomTables } from './common.mjs';

export const defaults = {
  users: 100, rampSec: 30, thinkMin: 10, thinkMax: 30, browseMin: 2, browseMax: 4,
  orderRatio: 0.3, welcomeRatio: 0.5, tables: 8, welcomePath: '/', menuPath: '/menu/', assets: [], assetRatio: 0.5,
};

export async function run(ctx, params) {
  const p = { ...defaults, ...params };
  const productIds = p.orderRatio > 0 ? await loadProductIds(ctx) : [];
  const tables = randomTables(p.tables);

  const journey = async (slot) => {
    const user = ctx.client.newUser();
    if (ctx.rng() < p.welcomeRatio) {
      await ctx.client.request('welcome', 'GET', p.welcomePath, { user });
      await ctx.sleep(ctx.between(3, 8));
    }
    if (ctx.stopped) return;
    await ctx.client.request('menu', 'GET', p.menuPath, { user });
    if (p.assets.length && ctx.rng() < p.assetRatio) {
      await Promise.all(p.assets.map((a) => ctx.client.request('asset', 'GET', a, { user })));
    }
    const looks = Math.round(ctx.between(p.browseMin, p.browseMax));
    for (let i = 0; i < looks && !ctx.stopped; i++) await ctx.sleep(ctx.between(p.thinkMin, p.thinkMax));
    if (!ctx.stopped && ctx.rng() < p.orderRatio) await placeOrder(ctx, user, productIds, tables);
    await ctx.sleep(ctx.between(1, 3));
  };

  const slot = async (i) => {
    await ctx.sleep((i / p.users) * p.rampSec); // asta-sekin kirish (ramp-up)
    while (!ctx.stopped) await journey(i);
  };
  await Promise.all(Array.from({ length: p.users }, (_, i) => slot(i)));
  return { concurrentUsers: p.users };
}
