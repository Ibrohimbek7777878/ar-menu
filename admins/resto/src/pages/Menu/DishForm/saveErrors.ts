/**
 * Saqlash xatosini odam tilidagi xabarga va forma maydoniga aylantirish. Sof funksiya: `node --test` bilan tekshiriladi.
 *
 * Server xatolari `{error, field}` (noto'g'ri kiritish) yoki `{error, detail}` ko'rinishida keladi. `apiClient` (@admins/shared)
 * faqat `detail/title` ni o'qiydi, shuning uchun `{error, field}` xabari yo'qolib, "So'rov muvaffaqiyatsiz tugadi (400)" chiqardi.
 * Bu yerda xom JSON (`error.problem`) ning o'zidan o'qiladi (BulkImport/errors.ts dagi kabi). `ApiError` sinfi import qilinmaydi.
 */

export type SaveField = 'name' | 'price' | 'prepMinutes' | 'category' | 'description' | 'image' | 'translations' | 'general';

const FIELD_BY_SERVER: Record<string, SaveField> = {
  name: 'name',
  price: 'price',
  old_price: 'price',
  category_id: 'category',
  category: 'category',
  prep_minutes: 'prepMinutes',
  cook_min: 'prepMinutes',
  description: 'description',
  image: 'image',
  image_token: 'image',
  name_ru: 'translations',
  name_en: 'translations',
  description_ru: 'translations',
  description_en: 'translations',
};

export interface SaveError {
  field: SaveField;
  message: string;
  /** Server rasm kodini rad etdi (muddati o'tgan, ishlatilgan yoki boshqa restoranniki). */
  imageToken: boolean;
}

export interface SaveErrorTexts {
  /** Server xabar bermagan holatda. */
  fallback: string;
  /** Javob umuman kelmadi. */
  network: string;
  /** Server xabaridagi xom maydon nomi («prep_minutes») o'rniga odam tilidagi nom. */
  labels: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function readSaveError(error: unknown, texts: SaveErrorTexts): SaveError {
  const status = isRecord(error) && typeof error.status === 'number' ? error.status : 0;
  const body = isRecord(error) && isRecord(error.problem) ? error.problem : {};
  const serverField = typeof body.field === 'string' ? body.field : '';
  const field = FIELD_BY_SERVER[serverField] ?? 'general';

  const raw = firstString(body.error, body.detail);
  const message = raw
    ? raw.replace(/«(\w+)»/g, (match, key: string) =>
        Object.prototype.hasOwnProperty.call(texts.labels, key) ? `«${texts.labels[key]}»` : match,
      )
    : status === 0
      ? texts.network
      : texts.fallback;

  return { field, message, imageToken: serverField === 'image_token' };
}
