/**
 * Server xatosini profil oynasidagi maydon va xabarga aylantirish. SOF mantiq: `node --test` bilan sinaladi, hech narsa import qilmaydi.
 *
 * Server xatolari `{error, field?}` ko'rinishida (noto'g'ri kiritish) yoki `{detail}` bilan keladi. `apiClient` xabarni o'zi ham oladi,
 * lekin `field` ni faqat xom JSON (`error.problem`) da saqlaydi — shuning uchun maydon shu yerdan o'qiladi (Menu/DishForm/saveErrors.ts
 * kabi). `ApiError` sinfi import qilinmaydi: faqat shakli tekshiriladi.
 */

export type ProfileField =
  | 'first_name'
  | 'last_name'
  | 'phone'
  | 'email'
  | 'username'
  | 'password'
  | 'current_password'
  | 'role'
  | 'permissions'
  | 'general';

const FIELD_BY_SERVER: Record<string, ProfileField> = {
  first_name: 'first_name',
  last_name: 'last_name',
  full_name: 'first_name',
  phone: 'phone',
  email: 'email',
  username: 'username',
  password: 'password',
  current_password: 'current_password',
  role: 'role',
  extra_capabilities: 'permissions',
  revoked_capabilities: 'permissions',
  capabilities: 'permissions',
};

export interface ProfileError {
  field: ProfileField;
  /** Server xabari (o'zbekcha) yoki bo'sh (u holda chaqiruvchi o'zining standart xabarini ko'rsatadi). */
  message: string;
  /** HTTP holati; 0 = javob umuman kelmadi (internet yo'q). */
  status: number;
  /** 403: ruxsat yo'q (masalan, boshqa odam ruxsatlarni o'zgartirgan yoki huquq olib tashlangan). */
  forbidden: boolean;
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

export function readProfileError(error: unknown): ProfileError {
  const status = isRecord(error) && typeof error.status === 'number' ? error.status : 0;
  const body = isRecord(error) && isRecord(error.problem) ? error.problem : {};
  const serverField = typeof body.field === 'string' ? body.field : '';
  const field = Object.prototype.hasOwnProperty.call(FIELD_BY_SERVER, serverField) ? FIELD_BY_SERVER[serverField] : 'general';
  // Xom JSON'da xabar bo'lmasa, `apiClient` yasagan xabar (masalan "So'rov muvaffaqiyatsiz tugadi (400)") ham foydali emas: bo'sh qoldiramiz
  const message = firstString(body.error, body.detail, body.title);
  return { field, message, status, forbidden: status === 403 };
}
