// Ko'rinadigan matnlar (tilga bog'liq): komponentlar orasida takrorlanmasin. Matnlar faqat literal t() chaqiruvlarida.
import { t } from '../../i18n';
import type { TableState } from './availability';
import type { FieldIssue, FieldKey } from './flow';

/** "03-stol" (raqam bo'lsa) yoki "Stol VIP-1". */
export function tableTitle(number: string): string {
  return /^\d+$/.test(number) ? t('{num}-stol', { num: number }) : t('Stol {num}', { num: number });
}

export function hallName(name: string): string {
  return name ? t(name) : t('Zal');
}

/** Stol holati yorlig'i (ro'yxat kartochkasi va reja tavsifi). */
export function tableStateLabel(state: TableState | 'unknown'): string {
  switch (state) {
    case 'free': return t("Bo'sh");
    case 'busy': return t('Band');
    case 'past': return t("Vaqt o'tgan");
    case 'closed': return t('Yopiq');
    case 'too_small': return t('Mos emas');
    default: return t('Yuklanmoqda...');
  }
}

/** Vaqt katagi holati (ekran o'qiydigan matn uchun). */
export function slotStateLabel(state: string): string {
  switch (state) {
    case 'free': return t("Bo'sh");
    case 'taken': return t('Band');
    case 'past': return t("Vaqt o'tgan");
    case 'too_small': return t('Mos emas');
    default: return t('Yopiq');
  }
}

/** Bron holati (server kodlari). Noma'lum kod o'z holicha ko'rsatiladi. */
export function bookingStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return t('Kutilmoqda');
    case 'confirmed': return t('Tasdiqlangan');
    case 'arrived': return t('Keldi');
    case 'seated': return t("Stolga o'tirdi");
    case 'completed': return t('Yakunlangan');
    case 'cancelled': return t('Bekor qilingan');
    case 'no_show': return t('Kelmadi');
    default: return status;
  }
}

/** Maydon yonidagi xato matni. */
export function fieldMessage(field: FieldKey, issue: FieldIssue): string {
  if (issue.code === 'server' && issue.message) return issue.message;
  switch (field) {
    case 'time': return t('Vaqtni tanlang');
    case 'guests': return issue.code === 'over_capacity' ? t("Bu stolga bunchalik mehmon sig'maydi") : t("Mehmonlar sonini to'g'ri kiriting");
    case 'name':
      if (issue.code === 'required') return t('Ismingizni kiriting');
      if (issue.code === 'short') return t("Ism juda qisqa");
      if (issue.code === 'long') return t('Ism juda uzun');
      return t("Ismni to'g'ri kiriting");
    case 'phone':
      if (issue.code === 'required') return t('Telefon raqamingizni kiriting');
      if (issue.code === 'short') return t("Raqam to'liq emas: 9 ta raqam kerak");
      return t("Telefon raqamini to'g'ri kiriting");
    case 'notes': return t('Izoh juda uzun (500 belgigacha)');
    default: return t('Stolni tanlang');
  }
}
