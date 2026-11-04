/**
 * Brend sahifasining ko'rinadigan nomlari. Modul darajasida matn `tr()` bilan belgilanadi, ko'rsatishda `t()` chaqiriladi
 * (til almashganda yangilanishi uchun). Xom kod ("custom", "ar360", hex) HECH QACHON ko'rsatilmaydi.
 */
import { t, tr } from '@admins/shared';
import type { BrandIssue } from './brandModel';
import type { BusinessType, FontKey, ModuleKey, PaletteKey } from './types';
import type { FileProblem } from './logoFile';

export const PALETTE_LABEL: Record<PaletteKey, string> = {
  classic: tr('Klassik'),
  orange: tr('Apelsin'),
  custom: tr("O'z rangingiz"),
};

export const PALETTE_HINT: Record<PaletteKey, string> = {
  classic: tr('Yashil va krem'),
  orange: tr('Issiq apelsin'),
  custom: tr('Istalgan rang'),
};

export const FONT_LABEL: Record<FontKey, string> = {
  serif: tr('Serif sarlavhali'),
  sans: tr('Sodda'),
  rounded: tr('Yumaloq'),
};

export const FONT_HINT: Record<FontKey, string> = {
  serif: tr('Klassik, sarlavhalar bezakli'),
  sans: tr('Toza va zamonaviy'),
  rounded: tr('Yumshoq va do\'stona'),
};

export const MODULE_LABEL: Record<ModuleKey, string> = {
  menu: tr('Menyu'),
  ar360: tr('360° ko\'rinish'),
  booking: tr('Bron'),
  tour: tr('Video sayr'),
  orders: tr('Buyurtma'),
  waiter_call: tr('Ofitsiantni chaqirish'),
};

/** Bir qator izoh: bo'lim yoqilsa mehmon saytida nima paydo bo'ladi */
export const MODULE_HINT: Record<ModuleKey, string> = {
  menu: tr('Mehmon taomlar ro\'yxatini ko\'radi.'),
  ar360: tr('Mehmon taomni aylantirib, 360° da ko\'radi.'),
  booking: tr('Mehmon saytdan stol band qiladi.'),
  tour: tr('Mehmon zalni video orqali aylanib ko\'radi.'),
  orders: tr('Mehmon stolidan turib buyurtma beradi.'),
  waiter_call: tr('Mehmon tugmani bosib ofitsiantni chaqiradi.'),
};

export const BUSINESS_LABEL: Record<BusinessType, string> = {
  restaurant: tr('Restoran'),
  cafe: tr('Kafe'),
  banquet: tr("To'yxona"),
};

export const BUSINESS_HINT: Record<BusinessType, string> = {
  restaurant: tr("Zal, stollar va to'liq menyu"),
  cafe: tr('Tez xizmat va sodda menyu'),
  banquet: tr('Katta zal, tadbirlar va bronlar'),
};

/** Maydon yo'li -> ko'rinadigan nom (xato xabarlari uchun) */
export function fieldLabel(path: string): string {
  switch (path) {
    case 'name':
      return t('Nomi');
    case 'tagline':
      return t('Shior');
    case 'hero.title':
      return t('Sarlavha');
    case 'hero.subtitle':
      return t('Tavsif');
    case 'hero.cta_text':
      return t('Tugma matni');
    case 'contact.phone':
      return t('Telefon');
    case 'contact.phone2':
      return t('Qo\'shimcha telefon');
    case 'contact.address':
      return t('Manzil');
    case 'contact.instagram':
      return t('Instagram');
    case 'contact.telegram':
      return t('Telegram');
    case 'contact.website':
      return t('Sayt');
    case 'contact.hours_text':
      return t('Ish vaqti');
    default:
      return t('Maydon');
  }
}

export function issueText(issue: BrandIssue): string {
  switch (issue.code) {
    case 'too_long':
      return t('Juda uzun: {max} ta belgidan oshmasin', { max: issue.max ?? 0 });
    case 'bad_color':
      return t("Rang kodi 6 ta belgidan iborat bo'lsin, masalan: 2F4836");
    case 'bad_phone':
      return t("Telefon raqami noto'g'ri. Masalan: +998 90 123 45 67");
    case 'insecure_website':
      return t('Sayt manzili https:// bilan boshlansin. Masalan: https://nomi.uz');
    default:
      return t("Sayt manzili noto'g'ri. Masalan: nomi.uz");
  }
}

export function fileProblemText(problem: FileProblem): string {
  switch (problem) {
    case 'empty':
      return t("Fayl bo'sh. Boshqa rasm tanlang.");
    case 'svg':
      return t('SVG qabul qilinmaydi. PNG yoki JPG rasm tanlang.');
    case 'too_big':
      return t('Rasm juda katta (15 MB dan oshmasin).');
    default:
      return t('Bu rasm emas. PNG yoki JPG tanlang.');
  }
}

export const SWATCH_LABEL: Record<string, string> = {
  forest: tr("O'rmon yashili"),
  burgundy: tr('Bordo'),
  navy: tr("To'q ko'k"),
  teal: tr('Moviy-yashil'),
  plum: tr('Binafsha'),
  orange: tr('Apelsin'),
  brown: tr('Jigarrang'),
  red: tr('Qizil'),
};
