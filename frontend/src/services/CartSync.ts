/**
 * React savatini serverdagi sessiya savati bilan bir xil ushlash (TZ: R-GST-04).
 *
 * Avval menyudagi savat faqat brauzerning localStorage'ida yashardi, Django checkout esa sessiya savatini
 * o'qirdi — shuning uchun buyurtmaga mehmon tanlamagan "Plov×2, Somsa×4" tushardi.
 * Endi har bir o'zgarish /api/cart/ ga yuboriladi; savat/checkout sahifalari serverdan haqiqiy ma'lumot oladi.
 */
type CartAction = 'set' | 'clear';

async function post(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/cart/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const CartSync = {
  /** Taomning aniq miqdorini o'rnatish (0 — savatdan olib tashlash). */
  setQuantity(productId: number, quantity: number): Promise<boolean> {
    const action: CartAction = 'set';
    return post({ action, product_id: productId, quantity });
  },

  /** Savatni butunlay bo'shatish. */
  clear(): Promise<boolean> {
    const action: CartAction = 'clear';
    return post({ action });
  },

  /** Brauzerdagi savatni serverga to'liq o'tkazish (server holatini brauzerga tenglashtirish). */
  async replaceAll(cart: Record<number, number>): Promise<boolean> {
    const clearOk = await CartSync.clear();
    const results = await Promise.all(
      Object.entries(cart).map(([id, qty]) => CartSync.setQuantity(Number(id), Number(qty)))
    );
    return clearOk && results.every(Boolean);
  },
};
