import { useSyncExternalStore } from 'react'
import { getResolvedTheme, getThemePref, subscribeTheme } from './theme.ts'
import type { ResolvedTheme, ThemePref } from './core.ts'

/** Tanlangan rejim (Kun / Tun / Avto); o'zgarsa komponent qayta chiziladi. */
export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribeTheme, getThemePref, getThemePref)
}

/** Amaldagi mavzu (light / dark). */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeTheme, getResolvedTheme, getResolvedTheme)
}
