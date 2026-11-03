import { getEnabledLangs } from '../../../i18n';
import { themeSwitchEnabled } from '../../../utils/guestTheme';

/** Til yoki kun/tun almashtirgichidan kamida bittasi yoqilgan bo'lsa true (aks holda sarlavhada tugma ko'rsatilmaydi). */
export function settingsAvailable(): boolean {
  return getEnabledLangs().length > 1 || themeSwitchEnabled();
}
