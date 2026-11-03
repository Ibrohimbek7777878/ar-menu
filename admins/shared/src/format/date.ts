/**
 * Sana va vaqtni odam tilida ko'rsatish (TZ 1.1: "2026-10-29 13:44:23" o'rniga "bugun 13:44").
 *
 * Qoidalar:
 * - Hisob mahalliy Toshkent vaqti (UTC+5) bo'yicha. O'zbekistonda yozgi/qishki vaqt yo'q,
 *   shuning uchun belgilangan siljish yetarli (brauzer vaqt zonasiga bog'liq emas).
 * - Oy nomlari qo'lda yozilgan: `Intl` o'zbek lokaliga tayanilmaydi (brauzerdan brauzerga farq qiladi).
 * - Bugun -> "bugun 13:44", kecha -> "kecha 18:20", boshqa kun -> "26-sentabr",
 *   yil boshqa bo'lsa -> "26-sentabr 2025".
 * - Matnlar tanlangan tilga o'giriladi (t): rus "сегодня 13:44", "26 сентября 2025"; ingliz "today 13:44", "September 26, 2025".
 *   O'zbekchada natija avvalgidek. UZ_MONTHS o'zbekcha asl nomlar (tarjima kaliti).
 */

import { t } from '../i18n/engine.ts';

export const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

/** Toshkent vaqti UTC dan 5 soat oldinda. */
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface HumanDateOptions {
  /** "Hozir" (testlar uchun beriladi). Berilmasa joriy vaqt. */
  now?: Date | number | string;
  /** Eski sanalarda ham vaqtni ko'rsatish: "26-sentabr 14:59" (chek kabi hujjatlar uchun). */
  alwaysTime?: boolean;
}

function toMs(value: Date | number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return NaN;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return new Date(value).getTime();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * ISO satr / Date / millisekund qiymatini odam tilidagi qisqa matnga aylantiradi.
 * Yaroqsiz yoki bo'sh qiymat uchun bo'sh satr qaytaradi (sahifa yiqilmasin).
 */
export function formatHumanDateTime(
  value: Date | number | string | null | undefined,
  options: HumanDateOptions = {}
): string {
  const ms = toMs(value);
  if (!Number.isFinite(ms)) return '';
  const nowMs = options.now === undefined ? Date.now() : toMs(options.now);
  if (!Number.isFinite(nowMs)) return '';

  const local = new Date(ms + TASHKENT_OFFSET_MS);
  const localNow = new Date(nowMs + TASHKENT_OFFSET_MS);
  const time = `${pad2(local.getUTCHours())}:${pad2(local.getUTCMinutes())}`;

  const dayIndex = Math.floor((ms + TASHKENT_OFFSET_MS) / DAY_MS);
  const nowDayIndex = Math.floor((nowMs + TASHKENT_OFFSET_MS) / DAY_MS);

  if (dayIndex === nowDayIndex) return t('bugun {time}', { time });
  if (dayIndex === nowDayIndex - 1) return t('kecha {time}', { time });

  const day = local.getUTCDate();
  const month = t(UZ_MONTHS[local.getUTCMonth()]);
  const year = local.getUTCFullYear();
  let text =
    year !== localNow.getUTCFullYear()
      ? t('{day}-{month} {year}', { day, month, year })
      : t('{day}-{month}', { day, month });
  if (options.alwaysTime) text += ` ${time}`;
  return text;
}
