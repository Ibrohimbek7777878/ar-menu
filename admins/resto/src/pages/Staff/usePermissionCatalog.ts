import { useCallback, useEffect, useState } from 'react';
import { fetchPermissionCatalog } from './api';
import { normalizeCatalog } from './permissions';
import type { Catalog } from './permissions';

export type CatalogState =
  | { status: 'loading' }
  | { status: 'ready'; catalog: Catalog }
  | { status: 'error' };

/** Katalog sahifa ishlagan davrda o'zgarmaydi: bir marta olinadi va profil qayta ochilganda qayta so'ralmaydi. Xato keshlanmaydi. */
let cached: Catalog | null = null;

export function usePermissionCatalog(): { state: CatalogState; reload: () => void } {
  const [state, setState] = useState<CatalogState>(cached ? { status: 'ready', catalog: cached } : { status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    setState({ status: 'loading' });
    fetchPermissionCatalog()
      .then((raw) => {
        if (cancelled) return;
        const catalog = normalizeCatalog(raw);
        // Bo'sh katalog = server javobi yaroqsiz (ruxsat berishning ma'nosi yo'q): xato deb ko'rsatiladi, keshlanmaydi
        if (catalog.items.length === 0) {
          setState({ status: 'error' });
          return;
        }
        cached = catalog;
        setState({ status: 'ready', catalog });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
