import React from 'react';
import { EmptyState, commonUz, useSession } from '@admins/shared';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { isPlatformMode, platformRouteAccess } from './mode';

/** "Mijozlar" bo'limi faqat platforma rejimida (platforma administratori + platforma hosti); boshqacha kirilsa — "ruxsat yo'q" */
export const PlatformGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useSession();
  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{commonUz.loading}</div>;
  if (!session) return null;
  if (!isPlatformMode(session)) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <EmptyState icon={<ShieldAlert size={32} style={{ color: 'var(--accent-rose)' }} />} title={commonUz.unauthorized} description={commonUz.accessDenied} />
      </div>
    );
  }
  return <>{children}</>;
};

/**
 * Bosh sahifa (`/ra/`): platforma rejimida Boshqaruv Markazi o'rniga "Mijozlar" ochiladi (platforma hostida restoran ma'lumotlari yo'q),
 * oddiy rejimda bolalar o'zgarishsiz.
 */
export const PlatformHome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useSession();
  if (!loading && session && isPlatformMode(session)) return <Navigate to="clients" replace />;
  return <>{children}</>;
};

/**
 * Har marshrutni o'raydi (`routes.tsx`): platforma rejimida restoran-doiradagi sahifalar (Menyu, Buyurtmalar, Brend ...) to'g'ridan-to'g'ri
 * havola bilan ham ochilmaydi — "Mijozlar"ga yo'naltiriladi (yon menyu ularni allaqachon yashirgan). Sessiya aniq bo'lmaguncha sahifa
 * ulanmaydi: restoran sahifalari platforma hostida so'rov yubormasin. Mijoz hostida hech narsa o'zgarmaydi.
 */
export const PlatformRouteGate: React.FC<{ routePath: string; children: React.ReactNode }> = ({ routePath, children }) => {
  const { session, loading } = useSession();
  if (loading) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>{commonUz.loading}</div>;
  if (session && platformRouteAccess(routePath, session) === 'redirect_clients') return <Navigate to="/clients" replace />;
  return <>{children}</>;
};
