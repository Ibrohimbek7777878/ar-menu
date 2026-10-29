/**
 * Stale-While-Revalidate In-Memory Client Cache (tashqi kutubxonasiz).
 * TZ: 3.2, 1.1
 *
 * Xatti-harakat:
 * - Kesh yangi (ttl ichida) bo'lsa, shu qiymat qaytariladi, tarmoqqa chiqilmaydi.
 * - Kesh eskirgan bo'lsa, eski qiymat DARROV qaytariladi, fonda yangilanadi va yangi qiymat
 *   `onUpdate` orqali chaqiruvchiga yetkaziladi (avval u faqat Map'ga yozilib, ekranga
 *   chiqmas edi: "Yangilash" 10-15 soniya ishlamasdek tuyulardi).
 * - Fonda xato bo'lsa, eski qiymat keshda qoladi va `onUpdate` chaqirilmaydi.
 * - `force: true` keshni chetlab o'tib darrov yangi qiymat oladi ("Yangilash" tugmasi).
 * - `invalidateCache` paytida ketayotgan so'rovlar bekor hisoblanadi: ularning (eskirgan)
 *   javobi keshga yozilmaydi va `onUpdate` ga yetkazilmaydi.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface InflightRequest {
  /** Bekor qilingan (invalidate yoki force) so'rov natijasi keshga yozilmaydi va tinglovchilarga yetmaydi. */
  cancelled: boolean;
  listeners: Set<(fresh: unknown) => void>;
  promise: Promise<unknown>;
}

/** Cheksiz o'sishning oldini olish (masalan, har bir qidiruv matni alohida kalit). */
const MAX_ENTRIES = 200;

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, InflightRequest>();

export interface CacheOptions<T = unknown> {
  /** Qiymat qancha vaqt "yangi" hisoblanadi, millisekund (standart: 30 soniya). */
  ttlMs?: number;
  /**
   * Eskirgan kesh qaytarilgandan keyin fonda yangi qiymat kelsa chaqiriladi.
   * Chaqiruvchi (masalan, React hook) bu orqali holatini yangilaydi.
   * Unmount bo'lgan bo'lsa, chaqiruvchi o'zi e'tiborsiz qoldirishi kerak.
   */
  onUpdate?: (fresh: T) => void;
  /** Keshni chetlab o'tib, darrov yangi ma'lumot olish (xatoda eski qiymat keshda qoladi). */
  force?: boolean;
  /** Soat (testlar uchun). Standart: Date.now. */
  now?: () => number;
}

function writeEntry<T>(key: string, data: T, timestamp: number): void {
  // Qayta yozishda kalit oxiriga o'tadi (eng eskisi birinchi o'chiriladi)
  memoryCache.delete(key);
  memoryCache.set(key, { data, timestamp });
  while (memoryCache.size > MAX_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest === undefined) break;
    memoryCache.delete(oldest);
  }
}

/**
 * Yangi tarmoq so'rovini boshlaydi. Muvaffaqiyatli va bekor qilinmagan bo'lsa natijani keshga
 * yozadi va tinglovchilarga (`onUpdate`) yetkazadi. Xatoda keshdagi eski qiymatga tegilmaydi.
 */
function startRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  now: () => number,
  carriedListeners?: Iterable<(fresh: unknown) => void>
): InflightRequest {
  const request: InflightRequest = {
    cancelled: false,
    listeners: new Set(carriedListeners),
    promise: Promise.resolve(),
  };

  let call: Promise<T>;
  try {
    call = Promise.resolve(fetcher());
  } catch (err) {
    call = Promise.reject(err);
  }

  request.promise = call.then(
    (fresh) => {
      if (inflight.get(key) === request) inflight.delete(key);
      if (!request.cancelled) {
        writeEntry(key, fresh, now());
        for (const listener of request.listeners) {
          try {
            listener(fresh);
          } catch {
            // Bitta tinglovchining xatosi boshqalariga va keshga to'sqinlik qilmasin
          }
        }
      }
      return fresh;
    },
    (err: unknown) => {
      if (inflight.get(key) === request) inflight.delete(key);
      throw err;
    }
  );
  inflight.set(key, request);
  return request;
}

export async function fetchWithSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions<T> = {}
): Promise<{ data: T; isStale: boolean }> {
  const { ttlMs = 30000, onUpdate, force = false, now = Date.now } = options;
  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;

  // Majburiy yangilash: kesh va ketayotgan eski so'rovni chetlab o'tadi. Eski so'rovning
  // tinglovchilari yangi so'rovga ko'chadi (ular ham eng yangi qiymatni oladi).
  if (force) {
    const previous = inflight.get(key);
    if (previous) previous.cancelled = true;
    const request = startRequest(key, fetcher, now, previous?.listeners);
    const fresh = (await request.promise) as T;
    return { data: fresh, isStale: false };
  }

  if (cached) {
    const isStale = now() - cached.timestamp > ttlMs;
    if (isStale) {
      // Fonda yangilash; bir kalit uchun bir vaqtda faqat bitta so'rov ketadi.
      let request = inflight.get(key);
      if (!request) {
        request = startRequest(key, fetcher, now);
        // Fon so'rovi xatosi: eski qiymat keshda qoladi, hech narsa tashqariga chiqmaydi
        request.promise.catch(() => undefined);
      }
      if (onUpdate) request.listeners.add(onUpdate as (fresh: unknown) => void);
    }
    return { data: cached.data, isStale };
  }

  // Keshda yo'q: kutamiz. Shu kalit uchun so'rov allaqachon ketayotgan bo'lsa, unga qo'shilamiz.
  const request = inflight.get(key) ?? startRequest(key, fetcher, now);
  const fresh = (await request.promise) as T;
  return { data: fresh, isStale: false };
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    memoryCache.clear();
    for (const request of inflight.values()) request.cancelled = true;
    inflight.clear();
    return;
  }
  for (const key of Array.from(memoryCache.keys())) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
  for (const [key, request] of Array.from(inflight.entries())) {
    if (key.startsWith(prefix)) {
      request.cancelled = true;
      inflight.delete(key);
    }
  }
}

export function getCached<T>(key: string): T | undefined {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  return entry?.data;
}
