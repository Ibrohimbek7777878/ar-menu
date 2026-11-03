/**
 * Taom tarjimalari (Русский / English): forma holati va serverga yuborish yordamchilari.
 * Sof funksiyalar (React'siz), shuning uchun `node --test` bilan tekshiriladi.
 */

export interface TranslationValues {
  name_ru: string;
  name_en: string;
  description_ru: string;
  description_en: string;
}

export type TranslationField = keyof TranslationValues;

// Server chegaralari (backend/orders/interfaces/api/menu_admin.py: NAME_MAX, DESCRIPTION_MAX)
export const TRANSLATION_NAME_MAX = 200;
export const TRANSLATION_DESCRIPTION_MAX = 5000;

export const TRANSLATION_FIELDS: TranslationField[] = ['name_ru', 'name_en', 'description_ru', 'description_en'];

export function emptyTranslations(): TranslationValues {
  return { name_ru: '', name_en: '', description_ru: '', description_en: '' };
}

/** Taomdan forma qiymatlari; eski/to'liq bo'lmagan javobda yetishmagan maydon bo'sh qatorga aylanadi. */
export function translationsFromProduct(
  product?: Partial<Record<TranslationField, string | null>> | null,
): TranslationValues {
  const values = emptyTranslations();
  if (!product) return values;
  for (const field of TRANSLATION_FIELDS) values[field] = product[field] ?? '';
  return values;
}

/** Qaysi tillarda kamida bitta maydon to'ldirilgan (yig'ilgan bo'limda "To'ldirilgan: Русский, English" uchun). */
export function filledLanguages(values: TranslationValues): Array<'ru' | 'en'> {
  const result: Array<'ru' | 'en'> = [];
  if (values.name_ru.trim() || values.description_ru.trim()) result.push('ru');
  if (values.name_en.trim() || values.description_en.trim()) result.push('en');
  return result;
}

/**
 * To'rttala maydonni ham yuboradi (bo'sh bo'lsa ham): tahrirlashda egasi tarjimani o'chirsa, server uni tozalashi uchun.
 * Bo'sh qiymat serverda "tarjima yo'q" degani; mehmon o'zbekcha ko'radi.
 */
export function appendTranslations(formData: FormData, values: TranslationValues): void {
  for (const field of TRANSLATION_FIELDS) formData.append(field, values[field].trim());
}
