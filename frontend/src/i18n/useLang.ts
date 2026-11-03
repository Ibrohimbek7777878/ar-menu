import { useSyncExternalStore } from 'react'
import { getLang, subscribe, type Lang } from './index'

/** Joriy til; til almashganda komponent qayta chiziladi. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang)
}
