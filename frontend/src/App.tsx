import React, { Suspense, lazy } from 'react';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { RouteGuard } from './core/guards/RouteGuard';
import { getTabFromPath } from './pages/AdminDashboardPage/tabs';
import { roleService } from './core/auth/RoleService';
import type { BrandModuleKey } from './core/auth/types';
import { moduleEnabled } from './utils/brand';
import { CallWaiterModal, NFCGatewayModal, SettingsSheet } from './components/ui';
import { LangBoundary } from './i18n/LangBoundary';
import './App.css';

// Har sahifa alohida bo'lak (TZ: R8-1): mehmon faqat o'zi ochgan sahifa kodini yuklaydi, xodim kodi (admin, KDS, moliya,
// hostess, ofitsiant, QR generatori, UI laboratoriyasi) mehmonga umuman yuklanmaydi.
// Komponent props turi saqlanadi (eslint-disable'siz): noto'g'ri prop yuborilsa `tsc` ushlaydi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function page<K extends string, M extends Record<K, React.ComponentType<any>>>(loader: () => Promise<M>, name: K) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const WelcomePage = page(() => import('./pages/WelcomePage/WelcomePage'), 'WelcomePage');
const MenuPage = page(() => import('./pages/MenuPage/MenuPage'), 'MenuPage');
const CartPage = page(() => import('./pages/CartPage/CartPage'), 'CartPage');
const CheckoutPage = page(() => import('./pages/CheckoutPage/CheckoutPage'), 'CheckoutPage');
const ARMenuPage = page(() => import('./pages/ARMenuPage/ARMenuPage'), 'ARMenuPage');
const OrdersPage = page(() => import('./pages/OrdersPage/OrdersPage'), 'OrdersPage');
const TableHubPage = page(() => import('./pages/TableHubPage/TableHubPage'), 'TableHubPage');
const ReservationPage = page(() => import('./pages/ReservationPage/ReservationPage'), 'ReservationPage');
const BookingPage = page(() => import('./pages/BookingPage/BookingPage'), 'BookingPage');
const TourPage = page(() => import('./pages/TourPage/TourPage'), 'TourPage');
const WaiterPanelPage = page(() => import('./pages/WaiterPanelPage/WaiterPanelPage'), 'WaiterPanelPage');
const HostessDeskPage = page(() => import('./pages/HostessDeskPage/HostessDeskPage'), 'HostessDeskPage');
const AdminDashboardPage = page(() => import('./pages/AdminDashboardPage/AdminDashboardPage'), 'AdminDashboardPage');
const ComponentShowcase = page(() => import('./showcase/ComponentShowcase'), 'ComponentShowcase');
// Brend: egasi o'chirgan bo'limga to'g'ridan-to'g'ri kirilsa yumshoq "Bu bo'lim hozircha mavjud emas" ekrani (marshrut o'chirilmagan)
const ModuleUnavailable = page(() => import('./components/ui/ModuleUnavailable/ModuleUnavailable'), 'ModuleUnavailable');
const QRGeneratorModal = page(() => import('./components/ui/QRGeneratorModal/QRGeneratorModal'), 'QRGeneratorModal');
const PhotogrammetryStudioModal = page(
  () => import('./components/ui/PhotogrammetryStudioModal/PhotogrammetryStudioModal'), 'PhotogrammetryStudioModal');

/** Bo'lim yoqilgan bo'lsa sahifa, o'chirilgan bo'lsa yumshoq ekran. Brend yo'q bo'lsa hamma bo'lim yoqiq (avvalgi xatti-harakat). */
const gated = (key: BrandModuleKey, node: React.ReactElement): React.ReactElement =>
  moduleEnabled(key) ? node : <ModuleUnavailable />;

const AppContent: React.FC = () => {
  const { currentPath } = useNavigation();

  // ─── ROUTE GUARD MIDDLEWARE ENFORCEMENT (Zero Data Leakage) ───
  const guard = RouteGuard.canActivate(currentPath);
  if (!guard.allowed) {
    if (guard.redirectTo?.includes('/waiter')) return <WaiterPanelPage />;
    if (guard.redirectTo?.includes('/kitchen') || guard.redirectTo?.includes('/kds')) return <AdminDashboardPage initialTab="kds" />;
    if (guard.redirectTo?.includes('/hostess')) return <HostessDeskPage />;
    return gated('menu', <MenuPage />);
  }

  // Showcase laboratoriyasi — dizayn tizimi sahifasi, production'da mehmonga ochiq emas (faqat DEMO/dev)
  if ((currentPath.includes('/ui-components') || currentPath.includes('/design-system')) && roleService.isDemo()) {
    return <ComponentShowcase />;
  }

  // ─── RESTORAN ADMIN PANELI & GULISTON UNIFIED MANAGEMENT SUITE ───
  // Clean paths: /menu/admin, /menu/kitchen, /menu/kds, /menu/waiter, /menu/table, /menu/hostess, /menu/finance, /menu/ar, /admin
  if (
    currentPath.startsWith('/menu/admin') ||
    currentPath.startsWith('/menu/kitchen') ||
    currentPath.startsWith('/menu/kds') ||
    currentPath.startsWith('/menu/waiter') ||
    currentPath.startsWith('/menu/table') ||
    currentPath.startsWith('/menu/hostess') ||
    currentPath.startsWith('/menu/finance') ||
    currentPath.startsWith('/menu/ar') ||
    currentPath.startsWith('/admin')
  ) {
    const tab = getTabFromPath(currentPath);
    return <AdminDashboardPage initialTab={tab} />;
  }

  // Oshxona Ekrani (KDS) (/kds/ yoki /kitchen/ yoki /seller/kds/)
  if (currentPath.includes('/kds') || currentPath.includes('/kitchen')) {
    return <AdminDashboardPage initialTab="kds" />;
  }

  // Stol bron qilish (/book/): zal rejasi -> bron oynasi -> bron kodi. Mavjud /reservation/ oqimi o'zgarmagan (pastda).
  if (/^\/book(\/|$)/.test(currentPath.split('?')[0].split('#')[0])) {
    return gated('booking', <BookingPage />);
  }

  // Video sayr (/tour/): zalga "kirib", oldinga-orqaga yurib, stolni tanlash -> /book/?table=ID. Bo'lim o'chirilgan bo'lsa yumshoq ekran.
  if (/^\/tour(\/|$)/.test(currentPath.split('?')[0].split('#')[0])) {
    return gated('tour', <TourPage />);
  }

  // Bron qidirish & Kelishni tasdiqlash (/reservation/arrival yoki /reservation/find).
  // Hostess va "/ar" tekshiruvlaridan OLDIN turishi shart: "/reservation/arrival" ham "/arrival/" va "/ar" ni o'z ichiga oladi.
  if (currentPath.includes('/reservation/arrival') || currentPath.includes('/reservation/find')) {
    return <ReservationPage />;
  }

  // Hostess / Kutib Olish Paneli — "/ar" tekshiruvidan OLDIN: "/arrival/..." ham "/ar" bilan boshlanadi (/arrival/desk, /arrival/timeline, /arrival/checklist, /hostess)
  if (currentPath.includes('/arrival/') || currentPath.includes('/hostess')) {
    return <HostessDeskPage />;
  }

  // Moliya & Kassa Paneli (/finance)
  if (currentPath.includes('/finance')) {
    return <AdminDashboardPage initialTab="finance" />;
  }

  // 3D / AR Interaktiv Menyu (/ar/)
  if (currentPath.includes('/ar')) {
    return gated('ar360', <ARMenuPage />);
  }

  // Ofitsiant va Xizmat Paneli (/waiter yoki /ofitsiant)
  if (currentPath.includes('/waiter') || currentPath.includes('/ofitsiant')) {
    return <WaiterPanelPage />;
  }

  // Stol & Bron Hubi (/table/ yoki /reservation/)
  if (currentPath.includes('/table') || currentPath.includes('/reservation')) {
    return <TableHubPage />;
  }

  // Buyurtmalar & Hisob (/orders/ yoki /order/)
  if (currentPath.includes('/orders') || currentPath.includes('/order')) {
    return gated('orders', <OrdersPage />);
  }

  // Buyurtmani rasmiylashtirish (Checkout)
  if (currentPath.includes('/checkout')) {
    return gated('menu', <CheckoutPage />);
  }

  // Savat sahifasi
  if (currentPath.includes('/cart')) {
    return gated('menu', <CartPage />);
  }

  // Bosh sahifa (Welcome / Root)
  if (currentPath === '/' || currentPath.includes('/welcome')) {
    return <WelcomePage />;
  }

  // Standart: Asosiy Menyu sahifasi (/menu/)
  return gated('menu', <MenuPage />);
};

const GlobalModals: React.FC = () => {
  const { isQrModalOpen, setIsQrModalOpen, isStudioModalOpen, setIsStudioModalOpen } = useNavigation();
  return (
    <>
      <CallWaiterModal />
      <NFCGatewayModal />
      <SettingsSheet />
      {/* Xodim vositalari: faqat ochilganda yuklanadi (qrcode kutubxonasi mehmonga tushmaydi) */}
      {isQrModalOpen && (
        <Suspense fallback={null}>
          <QRGeneratorModal isOpen onClose={() => setIsQrModalOpen(false)} />
        </Suspense>
      )}
      {isStudioModalOpen && (
        <Suspense fallback={null}>
          <PhotogrammetryStudioModal
            isOpen
            onClose={() => setIsStudioModalOpen(false)}
            onSaveProduct3D={(dish) => {
              try {
                const raw = localStorage.getItem('guliston_custom_products');
                const list = raw ? JSON.parse(raw) : [];
                const updated = [dish, ...list.filter((x: any) => x.id !== dish.id)];
                localStorage.setItem('guliston_custom_products', JSON.stringify(updated));
                window.dispatchEvent(new Event('guliston_menu_updated'));
              } catch (err) {
                console.error('Save custom product failed:', err);
              }
            }}
          />
        </Suspense>
      )}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <NavigationProvider>
      <LangBoundary>
        <Suspense fallback={null}>
          <AppContent />
        </Suspense>
        <GlobalModals />
      </LangBoundary>
    </NavigationProvider>
  );
};

export default App;
