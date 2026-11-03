/**
 * Bron sahifasining ko'rinadigan nomlari. Modul darajasida matn `tr()` bilan belgilanadi, ko'rsatishda `t()` chaqiriladi
 * (til almashganda yangilanishi uchun). Xom holat kodi, kalit yoki texnik so'z HECH QACHON ko'rsatilmaydi.
 */
import { UZ_MONTHS, getLang, t, tr } from '@admins/shared';
import type { ActionKind, StatusFilter } from './status';
import { isKnownStatus } from './status';
import type { BookingConfig, Reservation } from './types';
import { LIMITS, NONE_EVENT_KEY } from './settingsModel';
import type { IssueCode } from './settingsModel';
import type { GenerateError } from './time';
import { parseISODate, weekdayOf } from './dates';
import { GUESTS_MAX } from './reservationForm';
import type { FormErrorCode } from './reservationForm';

const STATUS_LABEL: Record<string, string> = {
  pending: tr('Kutilmoqda'),
  confirmed: tr('Tasdiqlangan'),
  arrived: tr('Keldi'),
  seated: tr("O'tirdi"),
  no_show: tr('Kelmadi'),
  completed: tr('Yakunlandi'),
  cancelled: tr('Bron bekor qilingan'),
};

/** Holat nomi; noma'lum holat uchun server bergan nom yoki umumiy matn (xom kod emas). */
export function statusLabel(row: Pick<Reservation, 'status' | 'status_display'>): string {
  if (isKnownStatus(row.status)) return t(STATUS_LABEL[row.status]);
  return row.status_display ? t(row.status_display) : t("Noma'lum holat");
}

const FILTER_LABEL: Record<StatusFilter, string> = {
  all: tr('Barchasi'),
  pending: tr('Kutilmoqda'),
  confirmed: tr('Tasdiqlangan'),
  arrived: tr('Kelganlar'),
  completed: tr('Yakunlangan'),
  no_show: tr('Kelmaganlar'),
  cancelled: tr('Bekor qilingan'),
};

export const filterLabel = (filter: StatusFilter): string => t(FILTER_LABEL[filter]);

const ACTION_LABEL: Record<ActionKind, string> = {
  confirm: tr('Tasdiqlash'),
  arrived: tr('Keldi'),
  no_show: tr('Kelmadi'),
  complete: tr('Yakunlash'),
  cancel: tr('Bekor qilish'),
};

export const actionLabel = (kind: ActionKind): string => t(ACTION_LABEL[kind]);

const WEEKDAY_SHORT = [tr('Dush'), tr('Sesh'), tr('Chor'), tr('Pay'), tr('Jum'), tr('Shan'), tr('Yak')];
const WEEKDAY_FULL = [tr('Dushanba'), tr('Seshanba'), tr('Chorshanba'), tr('Payshanba'), tr('Juma'), tr('Shanba'), tr('Yakshanba')];

export const weekdayShort = (weekday: number): string => t(WEEKDAY_SHORT[weekday] ?? '');
export const weekdayFull = (weekday: number): string => t(WEEKDAY_FULL[weekday] ?? '');

/** "5-noyabr" (tilga qarab: "5 ноября", "November 5") */
export function dayMonthLabel(day: number, month: number): string {
  return t('{day}-{month}', { day, month: t(UZ_MONTHS[month] ?? '') });
}

/** "5-noyabr, Chorshanba" */
export function longDateLabel(iso: string): string {
  const parts = parseISODate(iso);
  if (!parts) return iso;
  return `${dayMonthLabel(parts.d, parts.m - 1)}, ${weekdayFull(weekdayOf(iso))}`;
}

/**
 * Tadbir turi matni: tadbirsiz bo'lsa bo'sh. Joriy sozlamada bor tur bo'lsa — tanlangan tildagi nomi (label_ru/label_en),
 * o'chirib yuborilgan tur bo'lsa — bron yaratilganda server yozgan nom. 
 */
export function eventText(row: Pick<Reservation, 'event_type' | 'event_label'>, config: BookingConfig | null): string {
  if (!row.event_type || row.event_type === NONE_EVENT_KEY) return '';
  const found = config?.event_types.find((type) => type.key === row.event_type);
  if (found) return localizedName(found, getLang());
  return row.event_label.trim();
}

/**
 * Sozlamadagi nomni tanlangan tilda ko'rsatish: label_ru / label_en bo'lsa shu; bo'lmasa asosiy nom
 * (tayyor andozadagi nomlar uchun lug'atda tarjima bor: eski sozlamada ham admin panel tilida chiqadi).
 */
export function localizedName(item: { label: string; label_ru?: string; label_en?: string }, lang: 'uz' | 'ru' | 'en'): string {
  if (lang === 'ru' && item.label_ru?.trim()) return item.label_ru.trim();
  if (lang === 'en' && item.label_en?.trim()) return item.label_en.trim();
  return t(item.label);
}

const ACTION_DONE: Record<ActionKind, string> = {
  confirm: tr('Bron tasdiqlandi'),
  arrived: tr('Mehmon keldi deb belgilandi'),
  no_show: tr('Mehmon kelmadi deb belgilandi'),
  complete: tr('Bron yakunlandi'),
  cancel: tr('Bron bekor qilindi'),
};

/** Amal bajarilgach chiqadigan xabar */
export const actionDone = (kind: ActionKind): string => t(ACTION_DONE[kind]);

/** Tasdiq oynasi matnlari (faqat tasdiq so'raydigan amallar: bekor qilish, kelmadi) */
export function confirmTexts(kind: ActionKind, row: Pick<Reservation, 'customer_name' | 'reservation_date' | 'reservation_time'>): { title: string; message: string; button: string } {
  const parts = parseISODate(row.reservation_date);
  const when = `${parts ? dayMonthLabel(parts.d, parts.m - 1) : row.reservation_date}, ${row.reservation_time}`;
  const name = row.customer_name || t('Ismsiz mehmon');
  if (kind === 'no_show') {
    return {
      title: t('Mehmon kelmadimi?'),
      message: t("{name} ({when}) kelmagan deb belgilanadi va stol bo'shaydi.", { name, when }),
      button: t('Ha, kelmadi'),
    };
  }
  return {
    title: t('Bronni bekor qilamizmi?'),
    message: t("{name} ({when}) broni bekor qilinadi va stol bo'shaydi.", { name, when }),
    button: t('Ha, bekor qilish'),
  };
}

/** Forma xato kodlarini matnga aylantiradi (reservationForm.ts kodlar qaytaradi). */
export function formErrorText(code: FormErrorCode): string {
  switch (code) {
    case 'table_required':
      return t('Stolni tanlang');
    case 'date_invalid':
      return t("Sanani to'g'ri kiriting");
    case 'date_past':
      return t("O'tgan sanaga bron qilib bo'lmaydi");
    case 'time_invalid':
      return t('Vaqtni tanlang yoki kiriting (masalan 19:30)');
    case 'guests_range':
      return t("Mehmonlar soni 1 dan {max} gacha bo'lishi kerak", { max: GUESTS_MAX });
    case 'name_short':
      return t("Ism kamida 2 ta harfdan iborat bo'lsin");
    case 'name_long':
      return t('Ism juda uzun');
    case 'phone_invalid':
      return t("Telefon raqami noto'g'ri (kamida 9 ta raqam)");
    case 'notes_long':
      return t('Izoh juda uzun (500 belgigacha)');
  }
}

/** Sozlamalar tekshiruv xatosini (settingsModel.validateBooking) matnga aylantiradi. */
export function issueText(issue: { code: IssueCode; params?: Record<string, number> }): string {
  const params = issue.params;
  switch (issue.code) {
    case 'duration_range':
      return t("Davomiylik {min} dan {max} daqiqagacha bo'lishi kerak", { min: params?.min ?? 0, max: params?.max ?? 0 });
    case 'max_days_range':
      return t("Kunlar soni {min} dan {max} gacha bo'lishi kerak", { min: params?.min ?? 0, max: params?.max ?? 0 });
    case 'min_notice_range':
      return t("Ogohlantirish vaqti {min} dan {max} daqiqagacha bo'lishi kerak", { min: params?.min ?? 0, max: params?.max ?? 0 });
    case 'label_required':
      return t('Nomni kiriting');
    case 'label_too_long':
      return t("Nom {max} ta belgidan oshmasin", { max: params?.max ?? 0 });
    case 'key_duplicate':
      return t("Ichki kod takrorlangan. Shu qatorni olib tashlab, qaytadan qo'shing.");
    case 'times_empty':
      return t("Kamida bitta vaqt qo'shing yoki guruhni olib tashlang");
    case 'time_invalid':
      return t("Vaqt noto'g'ri");
    case 'time_duplicate':
      return t('Bu vaqt takrorlangan');
    case 'no_times':
      return t("Bron yoqilgan, lekin birorta ham vaqt yo'q. Kamida bitta vaqt qo'shing.");
    case 'none_missing':
      return t("«Yo'q» tadbir turi bo'lishi shart");
    case 'all_closed':
      return t("Hamma kunlar yopiq bo'lsa, bron qabul qilinmaydi");
    case 'too_many_times':
      return t("Bir guruhda {max} tadan ko'p vaqt bo'lmasin", { max: params?.max ?? 0 });
  }
}

/** "Har N daqiqada" generatori xatosi */
export function generateErrorText(error: GenerateError | 'full' | 'no_group'): string {
  switch (error) {
    case 'invalid_start':
      return t('Boshlanish vaqtini kiriting');
    case 'invalid_end':
      return t('Tugash vaqtini kiriting');
    case 'invalid_step':
      return t("Qadam noto'g'ri");
    case 'end_before_start':
      return t("Tugash vaqti boshlanishdan keyin bo'lishi kerak (tunga o'tib bo'lmaydi)");
    case 'too_many':
      return t("Juda ko'p vaqt chiqdi. Qadamni kattaroq qiling.");
    case 'full':
      return t("Bir guruhda {max} tadan ko'p vaqt bo'lmasin", { max: LIMITS.timesPerGroup });
    case 'no_group':
      return t("Guruh topilmadi");
  }
}
