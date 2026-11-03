import { useSyncExternalStore } from 'react'
import { getThemePref, subscribeTheme, type ThemePref } from './guestTheme'

/** Tanlangan rejim (Kun / Tun / Avto); o'zgarganda komponent qayta chiziladi. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribeTheme, getThemePref, getThemePref)
}
