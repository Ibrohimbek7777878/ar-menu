/**
 * Klassik (React) admin dashboard "Bugungi tushum" qiymati (P7).
 *
 * Muammo: dashboard marshrutida moliya so'rovi yuborilmaydi (TZ 0.5), shuning uchun `todayRevenue`
 * hech qachon yangilanmasdi va brauzer xotirasidagi eski/demo qiymat (3 480 000) ko'rinib qolardi,
 * server esa to'g'ri qiymatni (masalan 300 000) allaqachon HTML ichiga yozib yuborgan bo'lsa ham.
 *
 * Yechim:
 *  1) Birinchi qiymat: server sahifa bilan yuborgan `window.__GULISTON_ADMIN_DATA__.today_revenue`.
 *  2) Dashboard ochiq turganda: yengil `/api/restaurant/admin/v1/dashboard/summary/` (butun moliya
 *     ro'yxati EMAS) har ~15 soniyada so'raladi; qiymatni server hisoblaydi (Toshkent kuni bo'yicha).
 *  3) Moliya sahifasi ochiqligida mijoz tomonida hisoblash (`sumTodayIncome`) faqat bugungi kirimlarni sanaydi.
 */

export const DASHBOARD_SUMMARY_URL = '/api/restaurant/admin/v1/dashboard/summary/';

/** Dashboard tushumini serverdan qayta o'qish oralig'i (poller 5 soniyada ishlaydi: har 3-tikda, taxminan 15 soniyada bir). */
export const REVENUE_REFRESH_MS = 14000;

const TASHKENT_TZ = 'Asia/Tashkent';

function toValidAmount(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

/** Server HTML ichiga yozgan `window.__GULISTON_ADMIN_DATA__.today_revenue` (bo'lmasa yoki yaroqsiz bo'lsa null). */
export function readInjectedTodayRevenue(win?: object | null): number | null {
  const data = (win as { __GULISTON_ADMIN_DATA__?: { today_revenue?: unknown } } | null | undefined)
    ?.__GULISTON_ADMIN_DATA__;
  return toValidAmount(data?.today_revenue);
}

/** `/dashboard/summary/` javobidan bugungi tushumni oladi. Ruxsat bo'lmasa (kalit yo'q) yoki yaroqsiz bo'lsa null. */
export function parseSummaryRevenue(payload: unknown): number | null {
  const revenue = (payload as { today_revenue?: { total?: unknown } } | null | undefined)?.today_revenue;
  return toValidAmount(revenue?.total);
}

/** Yengil summary so'rovi. Xatoda null (chaqiruvchi oxirgi ma'lum qiymatni saqlab qoladi). */
export async function fetchTodayRevenue(fetchImpl?: typeof fetch): Promise<number | null> {
  try {
    const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
    const res = await doFetch(DASHBOARD_SUMMARY_URL, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return parseSummaryRevenue(await res.json());
  } catch {
    return null;
  }
}

/** Qayta so'rash vaqti keldimi (birinchi marta `lastAt = 0` bo'lgani uchun darrov true). */
export function shouldRefreshRevenue(lastAt: number, now: number, intervalMs: number = REVENUE_REFRESH_MS): boolean {
  return now - lastAt >= intervalMs;
}

export interface RevenueTransactionLike {
  type?: string;
  amount?: unknown;
  created_at?: string;
  is_cancelled?: boolean;
}

/** Toshkent kuni kaliti: "2026-10-29". */
export function tashkentDayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: TASHKENT_TZ });
}

/**
 * Faqat BUGUNGI (Toshkent kuni), bekor qilinmagan kirimlar yig'indisi.
 * (Avval butun davr yig'indisi "bugungi tushum" deb ko'rsatilgan.)
 */
export function sumTodayIncome(transactions: RevenueTransactionLike[], now: Date = new Date()): number {
  const today = tashkentDayKey(now);
  let sum = 0;
  for (const t of transactions) {
    if (t.type !== 'income' || t.is_cancelled || !t.created_at) continue;
    const created = new Date(t.created_at);
    if (Number.isNaN(created.getTime())) continue;
    if (tashkentDayKey(created) !== today) continue;
    const amount = Number(t.amount || 0);
    if (Number.isFinite(amount)) sum += amount; // yaroqsiz summa butun yig'indini NaN qilmasin
  }
  return sum;
}
