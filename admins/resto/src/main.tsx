import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
} from 'react-router-dom';
import {
  SessionProvider,
  ToastProvider,
  useSession,
  commonUz,
  Skeleton,
} from '@admins/shared';
import '@admins/shared/ui/tokens.css';
import { restoUz } from './i18n/uz';
import { adminRoutes } from './routes';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  QrCode,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Store,
  ArrowLeftRight,
} from 'lucide-react';

const AppLayout: React.FC = () => {
  const { session, logout, hasCapability } = useSession();

  const navItems = [
    { to: '', label: restoUz.dashboard, icon: LayoutDashboard, cap: 'kds' },
    { to: 'orders', label: restoUz.orders, icon: ShoppingBag, cap: 'kds' },
    { to: 'menu', label: restoUz.menu, icon: UtensilsCrossed, cap: 'menu_admin' },
    { to: 'tables', label: restoUz.tables, icon: QrCode, cap: 'tables_read' },
    { to: 'staff', label: restoUz.staff, icon: Users, cap: 'menu_admin' },
    { to: 'finance', label: restoUz.finance, icon: DollarSign, cap: 'finance' },
    { to: 'settings', label: restoUz.settings, icon: Settings, cap: 'menu_admin' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Do'kon sarlavhasi */}
        <div
          style={{
            padding: '20px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-emerald-bg)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={20} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h2
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {session?.tenant?.name || restoUz.appName}
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {restoUz.appName}
            </span>
          </div>
        </div>

        {/* Navigatsiya menyusi */}
        <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems
            .filter((item) => hasCapability(item.cap))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ''}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isActive ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--accent-emerald-bg)' : 'transparent',
                  transition: 'all var(--transition-fast)',
                })}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        {/* Strangler Fig: Klassik boshqaruvga o'tish */}
        <div style={{ padding: '0 8px 12px 8px' }}>
          <a
            href="/seller/tables/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-dim)',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              transition: 'all var(--transition-fast)',
            }}
          >
            <ArrowLeftRight size={14} />
            <span>Klassik panelga o'tish</span>
          </a>
        </div>

        {/* Xodim profili va chiqish */}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {session?.user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'capitalize' }}>
              {session?.user.role}
            </div>
          </div>
          <button
            onClick={logout}
            title={commonUz.logout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-rose)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Asosiy kontent maydoni */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Suspense
          fallback={
            <div style={{ padding: '32px' }}>
              <Skeleton height="40px" width="200px" style={{ marginBottom: '16px' }} />
              <Skeleton height="200px" borderRadius="var(--radius-lg)" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const isRaPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/ra');
  const basename = isRaPath ? '/ra' : '/';

  return (
    <BrowserRouter basename={basename}>
      <SessionProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {adminRoutes.map((r, i) => (
                <Route key={i} path={r.path} element={r.element} />
              ))}
            </Route>
          </Routes>
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
