/**
 * Rasm o'qish javobi (`POST menu/import/parse/`) -> forma uchun natija. Sof funksiya: `node --test` bilan tekshiriladi.
 *
 *  - kind=dish_photo: bitta taom surati; server rasmni vaqtincha saqlagan (`image_token`) va bitta qator qaytargan;
 *  - kind=menu, 1 qator: rasm aslida menyu surati, lekin bitta taom bor -> nom/narx/kategoriya olinadi, rasm taom surati bo'lmaydi
 *    (istisno: qatorni faqat OCR topgan bo'lsa ishonchsiz, hech narsa to'ldirilmaydi);
 *  - kind=menu, ko'p qator: "Ommaviy qo'shish"ga o'tkaziladi;
 *  - qator yo'q: hech narsa o'qilmadi.
 */
import type { ParseResponse, ParsedRow } from '../BulkImport/types';
import type { ParsedDish } from './types';

// Server chegaralari (backend/orders/interfaces/api/menu_admin.py: NAME_MAX, DESCRIPTION_MAX)
export const DISH_NAME_MAX = 200;
export const DISH_DESCRIPTION_MAX = 5000;

export type ParseOutcome =
  | { kind: 'dish'; dish: ParsedDish; token: string | null }
  | { kind: 'menu_single'; dish: ParsedDish }
  | { kind: 'menu_many'; count: number }
  | { kind: 'nothing' };

function cleanLine(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function cleanMultiline(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '';
}

function toDish(row: ParsedRow | undefined): ParsedDish {
  const price = row && typeof row.price === 'number' && Number.isFinite(row.price) && row.price > 0 ? Math.round(row.price) : null;
  return {
    name: cleanLine(row?.name, DISH_NAME_MAX),
    description: cleanMultiline(row?.description, DISH_DESCRIPTION_MAX),
    category: cleanLine(row?.category, DISH_NAME_MAX),
    price,
  };
}

function tokenOf(row: ParsedRow | undefined): string | null {
  return row && typeof row.image_token === 'string' && row.image_token ? row.image_token : null;
}

export function interpretParse(response: ParseResponse | null | undefined): ParseOutcome {
  const rows = Array.isArray(response?.rows) ? response.rows.filter((row) => row && typeof row === 'object') : [];
  const kind = response?.kind;

  // Taom surati. `kind` kelmagan eski javobda: bitta qator va rasm kodi bor bo'lsa ham taom surati deb olinadi.
  if (kind === 'dish_photo' || (kind === undefined && rows.length === 1 && tokenOf(rows[0]) !== null)) {
    return { kind: 'dish', dish: toDish(rows[0]), token: tokenOf(rows[0]) };
  }

  const named = rows.filter((row) => cleanLine(row.name, DISH_NAME_MAX) !== '');
  if (named.length === 0) return { kind: 'nothing' };
  if (named.length === 1) {
    // AI o'chiq: rasmdan matnni faqat oddiy matn o'qigich (OCR) oladi. Bitta qator — odatda taom suratidagi tasodifiy yozuv
    // ("shovqin"), haqiqiy menyu emas: to'ldirib, rasmni taom surati qilmay qo'ymaymiz, rasm taom surati bo'lib qoladi.
    if (response?.engine === 'ocr') return { kind: 'nothing' };
    return { kind: 'menu_single', dish: toDish(named[0]) };
  }
  return { kind: 'menu_many', count: named.length };
}
