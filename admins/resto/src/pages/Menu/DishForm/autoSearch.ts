/**
 * Taom nomi yozilgach internetdan rasm takliflarini AVTOMATIK qidirish qoidalari. Sof funksiya: soat va holat tashqaridan
 * beriladi, shuning uchun `node --test` bilan tashqi soatsiz tekshiriladi.
 *
 * Maqsad: server chegarasi (restoranga soatiga 60 ta tashqi qidiruv) tez tugab qolmasin:
 *  - kamida 3 belgi va 900 ms yozmay qolish (debounce);
 *  - bir xil nom bir marta (harf registri, bo'shliq va apostrof farq qilmaydi);
 *  - bitta forma ochilishida ko'pi bilan 8 ta YANGI nom;
 *  - xato yoki chegara tugasa avtomatik qidiruv shu forma uchun to'xtaydi (qo'lda tugma ishlayveradi);
 *  - rasm allaqachon bor bo'lsa, nomi tegilmagan bo'lsa yoki egasi takliflarni yopgan bo'lsa qidirilmaydi.
 */

export const AUTO_SEARCH_MIN_CHARS = 3;
export const AUTO_SEARCH_QUIET_MS = 900;
export const AUTO_SEARCH_MAX_NEW_QUERIES = 8;
/** Server qidiruv so'zi chegarasi (BulkImport/images.ts: SEARCH_QUERY_MAX). */
export const AUTO_SEARCH_QUERY_MAX = 100;

/** Bir xil nomni aniqlash kaliti: registr, ortiqcha bo'shliq va turli apostroflar farq qilmaydi. */
export function searchKey(name: string): string {
  return String(name ?? '')
    .normalize('NFKC')
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Serverga yuboriladigan so'z: ortiqcha bo'shliqlar olinadi, uzunligi cheklanadi. */
export function searchQuery(name: string): string {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, AUTO_SEARCH_QUERY_MAX);
}

export interface AutoSearchInput {
  name: string;
  /** Rasm allaqachon tanlangan yoki yuklangan (tahrirlashda hozirgi rasm ham). */
  hasImage: boolean;
  /** Egasi nom maydonini o'zi o'zgartirgan (forma ochilishidagi tayyor nom uchun qidirilmaydi). */
  nameEdited: boolean;
  now: number;
  /** Nom maydoni oxirgi marta o'zgargan payt (ms). */
  lastEditAt: number;
  /** Hozir ko'rsatilayotgan (yoki yuklanayotgan) takliflar kaliti. */
  shownKey: string | null;
  /** Egasi yopib qo'ygan takliflar kaliti. */
  dismissedKey: string | null;
  /** Shu forma ochilishida allaqachon qidirilgan kalitlar. */
  searchedKeys: ReadonlySet<string>;
  /** Shu forma ochilishida yuborilgan YANGI qidiruvlar soni. */
  newQueriesDone: number;
  /** Oldingi qidiruv xato bergan yoki chegara tugagan: avtomatik qidiruv to'xtatilgan. */
  blocked: boolean;
}

export type AutoSearchSkip =
  | 'has_image'
  | 'not_edited'
  | 'too_short'
  | 'already_shown'
  | 'dismissed'
  | 'blocked'
  | 'limit';

export type AutoSearchPlan =
  | { action: 'search'; query: string; key: string; isNew: boolean }
  | { action: 'wait'; ms: number }
  | { action: 'skip'; reason: AutoSearchSkip };

export function planAutoSearch(input: AutoSearchInput): AutoSearchPlan {
  if (input.hasImage) return { action: 'skip', reason: 'has_image' };
  if (!input.nameEdited) return { action: 'skip', reason: 'not_edited' };

  const key = searchKey(input.name);
  if (Array.from(key).length < AUTO_SEARCH_MIN_CHARS) return { action: 'skip', reason: 'too_short' };
  if (key === input.shownKey) return { action: 'skip', reason: 'already_shown' };
  if (key === input.dismissedKey) return { action: 'skip', reason: 'dismissed' };
  if (input.blocked) return { action: 'skip', reason: 'blocked' };

  const isNew = !input.searchedKeys.has(key);
  if (isNew && input.newQueriesDone >= AUTO_SEARCH_MAX_NEW_QUERIES) return { action: 'skip', reason: 'limit' };

  const quietFor = input.now - input.lastEditAt;
  if (quietFor < AUTO_SEARCH_QUIET_MS) return { action: 'wait', ms: AUTO_SEARCH_QUIET_MS - Math.max(0, quietFor) };

  return { action: 'search', query: searchQuery(input.name), key, isNew };
}
