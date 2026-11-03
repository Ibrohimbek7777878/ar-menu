import { t } from '@admins/shared';
import type { ProfileError } from './profileErrors';

/** Server xabari bo'lsa o'sha (tarjima qilinadi, bo'lmasa o'zbekcha qoladi), bo'lmasa: internet yo'q / umumiy xato. */
export function profileErrorText(error: ProfileError): string {
  if (error.message) return t(error.message);
  if (error.status === 0) return t("Internet bilan aloqa yo'q. Ulanishni tekshirib, qayta urinib ko'ring.");
  if (error.forbidden) return t("Bu amal uchun ruxsatingiz yo'q.");
  return t("Saqlab bo'lmadi. Qayta urinib ko'ring.");
}
