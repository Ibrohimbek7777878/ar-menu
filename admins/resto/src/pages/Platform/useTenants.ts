import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTenants } from './api';
import type { Tenant } from './tenants';
import { readFailure } from '../Bookings/errors';
import type { ApiFailure } from '../Bookings/errors';

/** Mijozlar ro'yxati. `refresh()` — ro'yxatni yo'qotmasdan jimgina yangilaydi (amaldan keyin). */
export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    try {
      setTenants(await fetchTenants());
      setFailure(null);
      loaded.current = true;
    } catch (err: unknown) {
      // Jimgina yangilash muvaffaqiyatsiz bo'lsa, eski ro'yxat qoladi (ko'rinib turgan narsa yo'qolmasin)
      if (!silent || !loaded.current) setFailure(readFailure(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { tenants, loading, failure, reload: useCallback(() => load(false), [load]), refresh: useCallback(() => load(true), [load]) };
}
