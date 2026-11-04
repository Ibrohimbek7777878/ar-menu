/**
 * Sayr bo'limi matnlari (xato, holat, tekshiruv). Kalit — o'zbekcha matnning o'zi (ru/en tarjimalari: i18n/ru/tour.ts, i18n/en/tour.ts).
 * Foydalanuvchiga "hotspot / stop / variant" kabi so'zlar ko'rinmaydi: "belgi", "nuqta".
 */
import { t } from '@admins/shared';
import type { ApiFailure } from '../Bookings/errors';
import { failureKind } from './errorKind';
import type { DraftIssue } from './editModel';
import { LABEL_MAX, TITLE_MAX } from './editModel';
import type { VideoProblem } from './fileCheck';
import type { TourStatus } from './types';

export function statusLabel(status: TourStatus, serverLabel = ''): string {
  switch (status) {
    case 'draft':
      return t('Qoralama');
    case 'processing':
      return t('Qayta ishlanmoqda');
    case 'ready':
      return t('Tayyor');
    case 'published':
      return t("E'lon qilingan");
    case 'failed':
      return t('Xato');
    default:
      return serverLabel;
  }
}

export function videoProblemText(problem: VideoProblem): string {
  switch (problem) {
    case 'empty':
      return t("Fayl bo'sh. Boshqa video tanlang.");
    case 'too_big':
      return t('Video juda katta (300 MB dan oshmasin). Qisqaroq video oling yoki sifatini pasaytiring.');
    case 'bad_type':
      return t('Bu fayl turi qabul qilinmaydi. MP4, MOV yoki WebM video tanlang.');
    case 'too_long':
      return t('Video juda uzun (5 daqiqadan oshmasin). Qisqaroq video tanlang.');
  }
}

/**
 * Server/tarmoq xatosi odam tilida. Server o'z xabarini bergan bo'lsa (`error`) shu; bo'lmasa holatga qarab.
 * `fallback` — umumiy xabar (kontekstga mos, masalan "Saqlab bo'lmadi").
 */
export function failureText(failure: ApiFailure, fallback: string): string {
  if (failure.message) return t(failure.message);
  switch (failureKind(failure.status)) {
    case 'network':
      return t("Internet bilan aloqa yo'q. Ulanishni tekshirib, qayta urinib ko'ring.");
    case 'forbidden':
      return t("Sizda bu amal uchun ruxsat yo'q.");
    case 'too_big':
      return t('Video juda katta (300 MB dan oshmasin).');
    case 'bad_type':
      return t('Bu fayl turi qabul qilinmaydi. MP4, MOV yoki WebM video tanlang.');
    case 'busy':
      return t("Juda ko'p so'rov. Birozdan keyin qayta urinib ko'ring.");
    case 'conflict':
      return t("Sayr hozir band. Birozdan keyin qayta urinib ko'ring.");
    case 'not_found':
      return t("Sayr topilmadi. U arxivlangan bo'lishi mumkin.");
    default:
      return fallback;
  }
}

export function issueText(issue: DraftIssue): string {
  switch (issue.code) {
    case 'title_empty':
      return t('Nuqta nomini yozing.');
    case 'title_long':
      return t('Nuqta nomi juda uzun ({max} belgigacha).', { max: TITLE_MAX });
    case 'time_invalid':
    case 'invalid':
      return t("Vaqtni to'g'ri kiriting.");
    case 'time_beyond':
      return t('Nuqta vaqti video davomiyligidan oshib ketdi.');
    case 'table_missing':
      return t('Belgi uchun stolni tanlang.');
    case 'label_long':
      return t('Yorliq juda uzun ({max} belgigacha).', { max: LABEL_MAX });
    case 'position_invalid':
      return t("Belgi joyi kadr ichida bo'lishi kerak.");
    case 'negative':
      return t("Vaqt manfiy bo'lishi mumkin emas.");
    case 'order':
      return t("Tugash vaqti boshlanishdan keyin bo'lishi kerak.");
    case 'beyond':
      return t('Belgi vaqti video davomiyligidan oshib ketdi.');
  }
}
