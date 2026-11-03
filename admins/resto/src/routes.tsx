import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import { CapabilityGuard } from '@admins/shared';

const DashboardPage = lazy(() => import('./pages/Dashboard/Page'));
const OrdersPage = lazy(() => import('./pages/Orders/Page'));
const MenuPage = lazy(() => import('./pages/Menu/Page'));
const TablesPage = lazy(() => import('./pages/Tables/Page'));
const BookingsPage = lazy(() => import('./pages/Bookings/Page'));
const StaffPage = lazy(() => import('./pages/Staff/Page'));
const FinancePage = lazy(() => import('./pages/Finance/Page'));
const SettingsPage = lazy(() => import('./pages/Settings/Page'));

export const adminRoutes: RouteObject[] = [
  {
    path: '',
    element: (
      <CapabilityGuard capability="kds">
        <DashboardPage />
      </CapabilityGuard>
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
];
