import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { CapabilityGuard } from '@admins/shared';
import { PlatformGuard, PlatformHome, PlatformRouteGate } from './pages/Platform/PlatformGuard';

const DashboardPage = lazy(() => import('./pages/Dashboard/Page'));
const OrdersPage = lazy(() => import('./pages/Orders/Page'));
const MenuPage = lazy(() => import('./pages/Menu/Page'));
const TablesPage = lazy(() => import('./pages/Tables/Page'));
const BookingsPage = lazy(() => import('./pages/Bookings/Page'));
const StaffPage = lazy(() => import('./pages/Staff/Page'));
const FinancePage = lazy(() => import('./pages/Finance/Page'));
const SettingsPage = lazy(() => import('./pages/Settings/Page'));
const BrandPage = lazy(() => import('./pages/Brand/Page'));
const TourPage = lazy(() => import('./pages/Tour/Page'));
const ClientsPage = lazy(() => import('./pages/Platform/Page'));

const baseRoutes: RouteObject[] = [
  {
    path: '',
    element: (
      // Platforma rejimida (platforma hosti + platforma administratori) bosh sahifa o'rniga "Mijozlar" ochiladi
      <PlatformHome>
        <CapabilityGuard capability="kds">
          <DashboardPage />
        </CapabilityGuard>
      </PlatformHome>
    ),
  },
  {
    path: 'orders',
    element: (
      <CapabilityGuard capability="kds">
        <OrdersPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'menu',
    element: (
      <CapabilityGuard capability="menu_admin">
        <MenuPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'tables',
    element: (
      <CapabilityGuard capability="tables_read">
        <TablesPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'bookings',
    element: (
      <CapabilityGuard capability="reservations">
        <BookingsPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'staff',
    element: (
      <CapabilityGuard capability="staff_admin">
        <StaffPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'finance',
    element: (
      <CapabilityGuard capability="finance">
        <FinancePage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'settings',
    element: (
      <CapabilityGuard capability="settings_admin">
        <SettingsPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'brand',
    element: (
      <CapabilityGuard capability="settings_admin">
        <BrandPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'tour',
    element: (
      <CapabilityGuard capability="settings_admin">
        <TourPage />
      </CapabilityGuard>
    ),
  },
  {
    path: 'clients',
    element: (
      <PlatformGuard>
        <ClientsPage />
      </PlatformGuard>
    ),
  },
];

/**
 * Platforma rejimida (platforma hosti + platforma administratori) `clients` dan boshqa hamma marshrut "Mijozlar"ga yo'naltiriladi
 * (`platformRouteAccess`). O'rash yagona joyda bajariladi, shuning uchun yangi qo'shilgan marshrut ham avtomatik yopiq bo'ladi.
 */
export const adminRoutes: RouteObject[] = baseRoutes.map((route) => ({
  ...route,
  element: <PlatformRouteGate routePath={route.path ?? ''}>{route.element}</PlatformRouteGate>,
}));
