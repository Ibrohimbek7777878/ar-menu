import React, { useState, useMemo } from 'react';
import { StaffNavHeader } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import { StaffDeviceManagerModal } from '../../core/auth/StaffDeviceManagerModal';
import './AdminDashboardPage.css';

export interface AdminTableItem {
  id: number | string;
  number: string;
  hall: string;
  status: 'free' | 'occupied' | 'reserved' | string;
  capacity?: number;
}

export interface AdminOrderItem {
  id: number | string;
  order_number: string;
  table_name: string;
  customer_name: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  final_amount: number;
  created_at: string;
}

export interface AdminDashboardData {
  shop?: {
    name?: string;
  };
  tables_count: number;
  free_tables_count: number;
  occupied_tables_count: number;
  today_orders_count: number;
  today_revenue: number;
  pending_kds_count: number;
  products_count: number;
  ar_dishes_count: number;
  tables_list: AdminTableItem[];
  recent_orders: AdminOrderItem[];
}

declare global {
  interface Window {
    __GULISTON_ADMIN_DATA__?: AdminDashboardData;
  }
}

export const AdminDashboardPage: React.FC = () => {
  const {
    navigate,
    tables: sharedTables,
    orders: sharedOrders,
    todayRevenue,
    setIsQrModalOpen,
  } = useNavigation();

  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const liveData: AdminDashboardData = useMemo(() => {
    const freeCount = sharedTables.filter((t) => t.status === 'free').length;
    const occCount = sharedTables.filter((t) => t.status === 'occupied' || t.status === 'bill_requested').length;
    const pendingCount = sharedOrders.filter((o) => o.status === 'pending' || o.status === 'preparing').length;

    return {
      shop: { name: 'Guliston' },
      tables_count: sharedTables.length,
      free_tables_count: freeCount,
      occupied_tables_count: occCount,
      today_orders_count: sharedOrders.length,
      today_revenue: todayRevenue,
      pending_kds_count: pendingCount,
      products_count: 42,
      ar_dishes_count: 12,
      tables_list: sharedTables.map((t) => ({
        id: t.id,
        number: String(t.number),
        hall: t.hall,
        status: t.status,
        capacity: t.capacity,
      })),
      recent_orders: sharedOrders.slice(0, 8).map((o) => ({
        id: o.id,
        order_number: o.order_number,
        table_name: o.table_name,
        customer_name: o.customer_name,
        status: (o.status === 'paid' ? 'delivered' : o.status) as any,
        final_amount: o.total_amount,
        created_at: new Date(o.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      })),
    };
  }, [sharedTables, sharedOrders, todayRevenue]);

  const data = liveData;

  const formattedRevenue = useMemo(() => {
    return new Intl.NumberFormat('uz-UZ').format(data.today_revenue) + " so'm";
  }, [data.today_revenue]);

  return (
    <div className="admin-layout">
      {/* ─── YON PANEL (SIDEBAR) ─── */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l8 8H4z" />
            </svg>
          </div>
          <div>
            <h1 className="admin-brand-title">{data.shop?.name || 'Guliston'}</h1>
            <p className="admin-brand-subtitle">Restoran Boshqaruvi</p>
          </div>
        </div>

        <nav className="admin-nav">
          <a
            href="/admin/dashboard/"
            className="admin-nav-item active"
            onClick={(e) => {
              e.preventDefault();
              navigate('/admin/dashboard/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
            <span>Boshqaruv markazi</span>
          </a>
          <a
            href="/kds/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/kds/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
            <span>Oshxona (KDS)</span>
            <span className="admin-nav-badge tabular-nums">{data.pending_kds_count}</span>
          </a>
          <a
            href="/ofitsiant/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/ofitsiant/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
            <span>Ofitsiant paneli</span>
          </a>
          <a
            href="/table/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/table/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
            </svg>
            <span>Stollar &amp; Bron</span>
          </a>
          <a
            href="/arrival/desk/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/arrival/desk/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Hostess paneli</span>
          </a>
          <a
            href="/menu/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/menu/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 2v20M6 2v20M4 6h4M4 10h4M16 6h4M16 10h4" />
            </svg>
            <span>Menyu</span>
          </a>
          <a
            href="/finance/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/finance/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Moliya &amp; Kassa</span>
          </a>
          <a
            href="/ar/"
            className="admin-nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/ar/');
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m21.12 6.4-6.05-4.06a2 2 0 0 0-2.17-.05L2.9 6.25a2 2 0 0 0-1 1.74v7.92a2 2 0 0 0 .98 1.72l6.08 4.07a2 2 0 0 0 2.17.05l9.95-3.96a2 2 0 0 0 1.02-1.74V8.14a2 2 0 0 0-.98-1.74Z" />
              <path d="m3.29 7 8.71 5.37L20.71 7" />
              <path d="M12 12.37V22" />
            </svg>
            <span>3D Taomlar</span>
            <span className="admin-nav-badge tabular-nums">{data.ar_dishes_count}</span>
          </a>
        </nav>

        <div className="admin-user-profile">
          <div className="admin-user-info">
            <div className="admin-avatar">A</div>
            <div>
              <div className="admin-user-name">Menejer</div>
              <div className="admin-user-role">Boshqaruvchi</div>
            </div>
          </div>
          <a
            href="/admin/logout/"
            className="btn-admin-logout"
            title="Tizimdan chiqish"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </a>
        </div>
      </aside>

      {/* ─── ASOSIY MAZMUN (MAIN CONTENT WRAPPER) ─── */}
      <div className="admin-content-wrapper">
        <StaffNavHeader activeTab="admin" />

        <main className="admin-main">
          {/* Yuqori sarlavha paneli */}
          <header className="admin-topbar">
            <div>
              <h2 className="admin-page-title">Restoran Boshqaruv Markazi</h2>
              <p className="admin-page-subtitle">
                Jonli kassa, stollar yuklamasi va oshxona operatsiyalari nazorati
              </p>
            </div>

          <div className="admin-topbar-actions">
            <div className="admin-period-switch">
              <button
                type="button"
                onClick={() => setFilterPeriod('today')}
                className={`btn-period ${filterPeriod === 'today' ? 'active' : ''}`}
              >
                Bugun
              </button>
              <button
                type="button"
                onClick={() => setFilterPeriod('week')}
                className={`btn-period ${filterPeriod === 'week' ? 'active' : ''}`}
              >
                Hafta
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="admin-btn admin-btn-secondary"
              style={{ background: '#1e3a8a', color: '#ffffff', border: 'none' }}
              title="Xodimlar qurilmalariga parolsiz ruxsat berish"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>👥 Xodimlar Ruxsati</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="admin-btn admin-btn-secondary"
              style={{ background: '#213827', color: '#ffffff', border: 'none' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h.01M17 7h.01M7 17h.01M12 12h.01" />
                <path d="M12 7v5M7 12h5M12 17v-2M17 12v5" />
              </svg>
              <span>QR Kodlar (Print)</span>
            </button>

            <a href="/kds/" className="admin-btn admin-btn-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              </svg>
              <span>Oshxona ekrani</span>
            </a>
          </div>
        </header>

        {/* ─── 4 TA KPI METRIKASI ─── */}
        <section className="admin-stats-grid">
          {/* 1. Bugungi Tushum */}
          <div
            className="admin-stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/finance/')}
            title="Batafsil moliya va kassa hisobotini ko'rish"
          >
            <div className="admin-stat-top">
              <span className="admin-stat-label">Bugungi tushum (kassa) ↗</span>
              <div className="admin-stat-icon-wrap icon-green" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>
            <div className="admin-stat-val tabular-nums">{formattedRevenue}</div>
            <div className="admin-stat-trend">
              <span>Sobir Tog'a Moliya Tizimi &rarr;</span>
            </div>
          </div>

          {/* 2. Buyurtmalar Soni */}
          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Buyurtmalar soni</span>
              <div className="admin-stat-icon-wrap icon-gold" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>
            <div className="admin-stat-val tabular-nums">{data.today_orders_count} ta</div>
            <div className="admin-stat-trend text-muted">
              <span>O'rtacha tayyorlanish: 14 daq</span>
            </div>
          </div>

          {/* 3. Stollar Bandligi */}
          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Stollar bandligi</span>
              <div className="admin-stat-icon-wrap icon-terracotta" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 18v3M20 18v3M4 11h16M7 11V4h10v7M6 18h12" />
                </svg>
              </div>
            </div>
            <div className="admin-stat-val tabular-nums">
              {data.occupied_tables_count} / {data.tables_count} band
            </div>
            <div className="admin-stat-trend text-green">
              <span>{data.free_tables_count} ta stol bo'sh</span>
            </div>
          </div>

          {/* 4. Oshxona Navbati */}
          <div className="admin-stat-card">
            <div className="admin-stat-top">
              <span className="admin-stat-label">Oshxona (KDS) navbati</span>
              <div className="admin-stat-icon-wrap icon-blue" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                </svg>
              </div>
            </div>
            <div className="admin-stat-val tabular-nums">{data.pending_kds_count} ta faol</div>
            <div className="admin-stat-trend text-blue">
              <span>Jonli sinxronizatsiya</span>
            </div>
          </div>
        </section>

        {/* ─── STOLLAR HOLATI XARITASI ─── */}
        <section className="admin-section-card">
          <div className="admin-section-header">
            <h3 className="admin-section-title">
              Stollar joylashuvi va holati
            </h3>
            <a
              href="/table/"
              className="admin-link-more"
            >
              Barcha stollarni ko'rish →
            </a>
          </div>

          <div className="admin-tables-matrix">
            {data.tables_list.map((table) => {
              const isOccupied = table.status === 'occupied';
              return (
                <a
                  key={table.id}
                  href={`/ofitsiant/?table=${table.id}`}
                  className={`admin-table-chip ${isOccupied ? 'occupied' : 'free'}`}
                  title={isOccupied ? 'Band stol' : "Bo'sh stol"}
                >
                  <span className="table-num">Stol {table.number}</span>
                  <span className="table-hall">{table.hall}</span>
                  <span
                    className={`table-status-dot ${
                      isOccupied ? 'status-dot-occupied' : 'status-dot-free'
                    }`}
                  >
                    {isOccupied ? 'Band' : "Bo'sh"}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        {/* ─── SO'NGGI BUYURTMALAR OQIMI ─── */}
        <section className="admin-section-card">
          <div className="admin-section-header">
            <h3 className="admin-section-title">
              Jonli buyurtmalar oqimi
            </h3>
            <a
              href="/orders/"
              className="admin-link-more"
            >
              Barcha buyurtmalar →
            </a>
          </div>

          <div className="admin-orders-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Buyurtma №</th>
                  <th>Stol / Joy</th>
                  <th>Mijoz</th>
                  <th>Vaqt</th>
                  <th>Summa</th>
                  <th>Holati</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="tabular-nums" style={{ fontWeight: 700 }}>
                      {ord.order_number}
                    </td>
                    <td style={{ fontWeight: 600 }}>{ord.table_name}</td>
                    <td>{ord.customer_name}</td>
                    <td className="tabular-nums text-muted">{ord.created_at}</td>
                    <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--brand-primary, #213827)' }}>
                      {new Intl.NumberFormat('uz-UZ').format(ord.final_amount)} so'm
                    </td>
                    <td>
                      <span className={`status-pill ${ord.status}`}>
                        {ord.status === 'pending'
                          ? 'Kutilmoqda'
                          : ord.status === 'preparing'
                          ? 'Tayyorlanmoqda'
                          : ord.status === 'ready'
                          ? 'Tayyor'
                          : 'Yetkazildi'}
                      </span>
                    </td>
                    <td>
                      <a
                        href={`/order/${ord.id}/`}
                        className="admin-link-action"
                      >
                        Chekni ko'rish ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ─── Xodimlar Qurilmalari Ruxsatnomasi Modali (Parolsiz) ─── */}
      <StaffDeviceManagerModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />
    </div>
  </div>
);
};
