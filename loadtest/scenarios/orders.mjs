// Yozuv stsenariysi (TZ Q3): doimiy tezlikda (ratePerMin buyurtma/daqiqa, ochiq model: javobni kutmasdan) buyurtma yaratish.
// Tekshiriladi: har javob 201, buyurtma raqamlari noyob (takroriy yo'q). Zaxira/kassa to'g'riligi DB tekshiruvi bilan alohida (README).
import { loadProductIds, placeOrder, randomTables } from './common.mjs';

export const defaults = { ratePerMin: 100, tables: 8 };

export async function run(ctx, params) {
  const p = { ...defaults, ...params };
  const productIds = await loadProductIds(ctx);
  const tables = randomTables(p.tables);
  const meanGapSec = 60 / p.ratePerMin;
  const pending = new Set();
  let fired = 0;
  while (!ctx.stopped) {
    const gap = -Math.log(1 - ctx.rng()) * meanGapSec; // Puasson oqimi (eksponensial oraliq)
    await ctx.sleep(gap / ctx.timeScale); // yuk tezligi timeScale ga bog'liq emas
    if (ctx.stopped) break;
    fired++;
    const job = placeOrder(ctx, ctx.client.newUser(), productIds, tables).finally(() => pending.delete(job));
    pending.add(job);
  }
  await Promise.allSettled([...pending]);
  return { fired };
}
