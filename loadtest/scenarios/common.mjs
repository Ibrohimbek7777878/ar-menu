// Stsenariylar uchun umumiy amallar: menyu aniqlash va buyurtma yuborish.
import { collectProductIds } from '../lib/context.mjs';

export const MENU_API = '/api/v1/restaurant/menu/';
export const ORDER_CREATE = '/api/v1/restaurant/orders/create/';

/** Menyu API'sidan taom id'larini oladi ("setup-" qadamlari SLO hisobiga kirmaydi). */
export async function loadProductIds(ctx, menuApi = MENU_API) {
  const r = await ctx.client.request('setup-menu', 'GET', menuApi, { wantBody: true });
  if (r.status !== 200) throw new Error(`Menyu API ${r.status} qaytardi (${r.err ?? 'xato'}): ${menuApi}`);
  const ids = collectProductIds(JSON.parse(r.body));
  if (!ids.length) throw new Error('Menyuda mavjud taom topilmadi: buyurtma yuborib bo\'lmaydi (seed ma\'lumot kerak)');
  return ids;
}

export function randomTables(count) {
  return Array.from({ length: count }, (_, i) => String(i + 1));
}

/** Haqiqiy mehmon kabi buyurtma yuboradi (narxni mijoz yubormaydi: server menyudan oladi). */
export async function placeOrder(ctx, user, productIds, tables, step = 'order') {
  const lines = 1 + Math.floor(ctx.rng() * 4);
  const items = Array.from({ length: lines }, () => ({ product_id: ctx.pick(productIds), quantity: 1 + Math.floor(ctx.rng() * 3) }));
  const payload = { table_number: ctx.pick(tables), customer_name: 'Yuk testi', notes: 'loadtest', items };
  const r = await ctx.client.request(step, 'POST', ORDER_CREATE, {
    user,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    wantBody: true,
  });
  if (r.status === 201) {
    try {
      ctx.shared.orderNumbers.push(JSON.parse(r.body).order_number);
    } catch {
      ctx.shared.orderFailures++;
    }
  } else {
    ctx.shared.orderFailures++;
    // Xato sababini yig'amiz (hisobotda "Buyurtma xatosi: <matn> xN" ko'rinadi), aks holda 400 ning sababi noma'lum qoladi
    let why = r.err ?? `HTTP ${r.status}`;
    try {
      why = `${r.status}: ${JSON.parse(r.body).error ?? r.body.slice(0, 120)}`;
    } catch { /* javob JSON emas */ }
    const errors = (ctx.shared.orderErrors ??= new Map());
    errors.set(why, (errors.get(why) ?? 0) + 1);
  }
  return r;
}
