import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface UserSession {
  id: number;
  name: string;
  role: string;
}

export interface TenantInfo {
  id: string; // UUID
  slug: string;
  name: string;
}

export interface SessionData {
  user: UserSession;
  tenant: TenantInfo | null;
  capabilities: string[];
  flags: {
    admin_ui?: string;
    panel_scope?: string;
    guest_design?: string;
  };
  csrf: string;
}

interface SessionContextValue {
  session: SessionData | null;
  loading: boolean;
  error: Error | null;
  hasCapability: (cap: string) => boolean;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const data = await apiClient<SessionData>('/api/restaurant/admin/v1/session/');
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const hasCapability = (cap: string): boolean => {
    if (!session) return false;
    if (session.user.role === 'super_admin' || session.user.role === 'shop_owner') return true;
    return session.capabilities.includes(cap);
  };

  const logout = async () => {
    try {
      await apiClient('/api/restaurant/admin/v1/logout/', { method: 'POST' });
    } finally {
      window.location.href = '/admin/login/';
    }
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        error,
        hasCapability,
        logout,
        refetch: fetchSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
