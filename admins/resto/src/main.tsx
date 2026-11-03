import React, { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom';
import {
  SessionProvider,
  ToastProvider,
  AppearanceMenu,
  LangBoundary,
  useSession,
  commonUz,
  initLang,
  initTheme,
  t,
  Skeleton,
} from '@admins/shared';
import '@admins/shared/ui/tokens.css';
import './shell.css';
import './i18n/register';
import { restoUz, roleLabel } from './i18n/uz';
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
  Menu as MenuIcon,
  X,
} from 'lucide-react';

/** Telefon: 768 px dan tor ekranda yon panel yashirinadi va hamburger bilan ochiladigan drawerga aylanadi (shell.css bilan bir xil chegara). */
const NARROW_QUERY = '(max-width: 767px)';

function subscribeNarrow(callback: () => void): () => void {
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}

const AppLayout: React.FC = () => {
  const { session, logout, hasCapability } = useSession();
  const location = useLocation();
  const narrow = useIsNarrow();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const open = drawerOpen && narrow;

  const closeDrawer = useCallback((restoreFocus: boolean) => {
    setDrawerOpen(false);
    if (restoreFocus) menuBtnRef.current?.focus();
  }, []);

  // Sahifaga o'tilganda (bandni bosganda) drawer yopiladi
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Drawer ochiq: Esc yopadi, orqa fon aylanmaydi, fokus birinchi bandga o'tadi
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer(true);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLElement>('a[href]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, closeDrawer]);

  // Brauzer sarlavhasi tanlangan tilda (til almashganda daraxt qayta ulanadi, shuning uchun bu yerda yangilanadi)
  useEffect(() => {
    document.title = `${restoUz.appName} — ${restoUz.dashboard}`;
  }, []);

  const navItems = [
    { to: '', label: restoUz.dashboard, icon: LayoutDashboard, cap: 'kds' },
    { to: 'orders', label: restoUz.orders, icon: ShoppingBag, cap: 'kds' },
    { to: 'menu', label: restoUz.menu, icon: UtensilsCrossed, cap: 'menu_admin' },
    { to: 'tables', label: restoUz.tables, icon: QrCode, cap: 'tables_read' },
    { to: 'staff', label: restoUz.staff, icon: Users, cap: 'staff_admin' },
    { to: 'finance', label: restoUz.finance, icon: DollarSign, cap: 'finance' },
    { to: 'settings', label: restoUz.settings, icon: Settings, cap: 'settings_admin' },
  ];

  const shopName = session?.tenant?.name || restoUz.appName;

  return (
    <div className="ra-shell">
      {/* Telefon: yuqori panel (kompyuterda yashirin) */}
      <header className="ra-topbar">
        <button
          ref={menuBtnRef}
          type="button"
          className="ra-menu-btn"
          aria-label={open ? t('Menyuni yopish') : t('Menyuni ochish')}
          aria-expanded={open}
          aria-controls="ra-sidebar"
          onClick={() => setDrawerOpen((v) => !v)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <MenuIcon size={22} aria-hidden="true" />}
        </button>
        <div className="ra-topbar-title">{shopName}</div>
        <AppearanceMenu placement="down" align="end" />
      </header>

      <div className="ra-backdrop" data-open={open} aria-hidden="true" onClick={() => closeDrawer(true)} />

      {/* Yon panel (kompyuter) / drawer (telefon) */}
      <aside
        id="ra-sidebar"
        ref={sidebarRef}
        className="ra-sidebar"
        data-open={open}
        onBlur={(e) => {
          // Fokus drawer'dan tashqariga chiqsa (Tab) drawer yopiladi: fokus tuzog'i yo'q
          const next = e.relatedTarget;
          if (open && next instanceof Node && !sidebarRef.current?.contains(next) && next !== menuBtnRef.current) {
            setDrawerOpen(false);
          }
        }}
      >
        {/* Do'kon sarlavhasi */}
        <div className="ra-brand">
          <div className="ra-brand-icon">
            <Store size={20} aria-hidden="true" />
          </div>
          <div className="ra-brand-text">
            <h2 className="ra-brand-name">{shopName}</h2>
            <span className="ra-brand-sub">{restoUz.appName}</span>
          </div>
        </div>

        {/* Navigatsiya menyusi */}
        <nav className="ra-nav" aria-label={t('Asosiy menyu')}>
          {navItems
            .filter((item) => hasCapability(item.cap))
            .map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === ''} className="ra-nav-link">
                <item.icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        {/* Strangler Fig: Klassik boshqaruvga o'tish */}
        <div className="ra-classic-wrap">
          <a href="/seller/tables/" className="ra-classic-link">
            <ArrowLeftRight size={14} aria-hidden="true" />
            <span>{t("Klassik panelga o'tish")}</span>
          </a>
        </div>

        {/* Xodim profili, til/kun-tun va chiqish */}
        <div className="ra-user">
          <div className="ra-user-text">
            <div className="ra-user-name">{session?.user.name}</div>
            <div className="ra-user-role" style={{ textTransform: 'capitalize' }}>
              {session ? roleLabel(session.user.role) : ''}
            </div>
          </div>
          <AppearanceMenu placement="up" align="start" />
          <button
            type="button"
            className="ra-icon-btn ra-icon-btn--danger"
            onClick={logout}
            title={commonUz.logout}
            aria-label={commonUz.logout}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Asosiy kontent maydoni */}
      <main className="ra-main">
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
          {/* Til almashganda shu yerdan pastki daraxt qayta ulanadi; router, sessiya va xabarlar saqlanadi */}
          <LangBoundary>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                {adminRoutes.map((r, i) => (
                  <Route key={i} path={r.path} element={r.element} />
                ))}
              </Route>
            </Routes>
          </LangBoundary>
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) {
  // Kun/tun (data-theme) va til: birinchi chizishdan oldin. Til lug'ati yuklanmaguncha chizilmaydi (o'zbekcha yonib o'chmasin).
  initTheme();
  void initLang().finally(() => {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
}
