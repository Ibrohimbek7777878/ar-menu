/**
 * Rasmdan o'qilgan kategoriya nomini menyudagi kategoriyalarga moslash.
 * Sof funksiyalar: `node --test` bilan tekshiriladi.
 *
 * Diqqat: `normalizeCategoryName` ommaviy qo'shishdagi `normalizeName` (BulkImport/rows.ts) bilan BIR XIL qoida.
 * Sof modul boshqa fayldan qiymat import qila olmaydi (`node --test` kengaytmasiz importni topmaydi), shuning uchun nusxa;
 * ikkalasining bir xilligini `categoryMatch.test.ts` tekshiradi.
 */
import type { CategoryMatch, CategoryRef } from './types';

/** Server chegarasi: `POST menu/categories/` nomi 100 belgigacha (menu_admin.py). */
export const CATEGORY_NAME_MAX = 100;

/** Harf registri, ortiqcha bo'shliq va turli apostroflar (ʻ ʼ ‘ ’ ` ´) farq qilmasin. */
export function normalizeCategoryName(value: string): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Yangi kategoriya sifatida yuboriladigan nom: bo'shliqlar yig'iladi, 100 belgigacha kesiladi. */
export function cleanCategoryName(value: string): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, CATEGORY_NAME_MAX);
}

/**
 * Taklif qilingan nom mavjud kategoriyalardan birimi (-> existing), yangimi (-> new) yoki bo'shmi (-> none).
 * Bir nechta mos kelsa birinchisi olinadi (menyudagi tartib).
 */
export function matchCategory(suggested: string | null | undefined, categories: CategoryRef[]): CategoryMatch {
  const name = cleanCategoryName(suggested ?? '');
  if (!name) return { kind: 'none' };
  const key = normalizeCategoryName(name);
  const found = categories.find((category) => normalizeCategoryName(category.name) === key);
  if (found) return { kind: 'existing', id: found.id, name: found.name };
  return { kind: 'new', name };
}
