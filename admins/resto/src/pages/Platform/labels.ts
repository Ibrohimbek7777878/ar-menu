/**
 * Mijozlar sahifasining ko'rinadigan nomlari (`tr()` + ko'rsatishda `t()`). Xom kod (restaurant, suspended ...) HECH QACHON ko'rsatilmaydi.
 * "Restoran/Kafe/To'yxona" matnlari Brend bo'limidagi bilan bir xil kalitlar (tarjimasi i18n/{ru,en}/brand.ts da).
 */
import { t, tr } from '@admins/shared';
import type { SubdomainProblem, OwnerLoginProblem } from './subdomain';
import type { PasswordIssue } from '../Staff/password';

export const BUSINESS_TYPES = ['restaurant', 'cafe', 'banquet'] as const;

const BUSINESS_LABEL: Record<string, string> = {
  restaurant: tr('Restoran'),
  cafe: tr('Kafe'),
  banquet: tr("To'yxona"),
};

export function businessLabel(type: string): string {
  return BUSINESS_LABEL[type] ? t(BUSINESS_LABEL[type]) : t("Boshqa tur");
}

export function statusLabel(status: string): string {
  if (status === 'active') return t('Faol');
  if (status === 'suspended') return t("To'xtatilgan");
  return t("Noma'lum holat");
}

export function subdomainProblemText(problem: SubdomainProblem): string {
  switch (problem) {
    case 'empty':
      return t('Subdomen nomini yozing');
    case 'too_short':
      return t('Kamida 3 ta belgi bo\'lsin');
    case 'too_long':
      return t('40 ta belgidan oshmasin');
    case 'edge_hyphen':
      return t('Chiziqcha bilan boshlanmasin va tugamasin');
    default:
      return t('Bu nom band qilingan. Boshqasini tanlang');
  }
}

export function loginProblemText(problem: OwnerLoginProblem): string {
  switch (problem) {
    case 'empty':
      return t('Ega loginini yozing');
    case 'too_short':
      return t('Login kamida 3 ta belgidan iborat bo\'lsin');
    case 'too_long':
      return t('Login 30 ta belgidan oshmasin');
    default:
      return t('Faqat lotin harflari, raqam va _ . - belgilari mumkin');
  }
}

export function passwordIssueText(issue: PasswordIssue): string {
  switch (issue) {
    case 'short':
      return t("Parol kamida 8 ta belgidan iborat bo'lsin");
    case 'long':
      return t('Parol 128 ta belgidan oshmasin');
    case 'spaces':
      return t("Parol boshida va oxirida bo'sh joy bo'lmasin");
    case 'numeric':
      return t("Parol faqat raqamlardan iborat bo'lmasin");
    case 'common':
      return t('Bu parol juda oddiy, boshqasini tanlang');
    default:
      return t("Parol loginga o'xshash bo'lmasin");
  }
}
