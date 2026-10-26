import React from 'react';
import { useDashboard } from './useDashboard';
import { restoUz } from '../../i18n/uz';
import {
  StatCard,
  Card,
  Button,
  Skeleton,
  EmptyState,
  commonUz,
} from '@admins/shared';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Users,
  AlertTriangle,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data, loading, error, refresh } = useDashboard();

  if (loading && !data) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="220px" height="32px" />
          <Skeleton width="110px" height="36px" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
          <Skeleton height="110px" borderRadius="var(--radius-lg)" />
        </div>
        <Skeleton height="280px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: '48px 24px' }}>
        <EmptyState
          icon={<AlertTriangle size={32} style={{ color: 'var(--accent-rose)' }} />}
          title={commonUz.errorOccurred}
          description={error.message}
          action={
            <Button variant="primary" onClick={refresh} icon={<RefreshCw size={16} />}>
              {commonUz.retry}
            </Button>
          }
        />
      </div>
    );
  }

  const formatSum = (val?: number) => {
    return `${(val || 0).toLocaleString('uz-UZ')} ${commonUz.currency}`;
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Sarlavha va yangilash tugmasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-main)' }}>
            {restoUz.dashboard}
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {restoUz.lastUpdated}: {new Date().toLocaleTimeString('uz-UZ')}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={refresh}
          icon={<RefreshCw size={14} className={loading ? 'spin' : ''} />}
        >
          {restoUz.refreshData}
        </Button>
      </div>

      {/* 4 Ta asosiy metrika */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <StatCard
          title={restoUz.todayRevenue}
          value={formatSum(data?.today_revenue.total)}
          subtitle={`${restoUz.cash}: ${formatSum(data?.today_revenue.cash)} | ${restoUz.card}: ${formatSum(data?.today_revenue.card)}`}
          icon={<DollarSign size={20} />}
        />

        <StatCard
          title={restoUz.activeOrders}
          value={data?.active_orders ?? 0}
          subtitle={`Jami bugun: ${data?.orders_count ?? 0} ta`}
          icon={<ShoppingBag size={20} />}
        />

        <StatCard
          title={restoUz.averageCheck}
          value={formatSum(data?.average_check)}
          icon={<TrendingUp size={20} />}
        />

        <StatCard
          title={restoUz.occupiedTables}
          value={`${data?.occupied_tables ?? 0} / ${data?.total_tables ?? 0}`}
          subtitle={
            data && data.out_of_stock_count > 0
              ? `${data.out_of_stock_count} ta taom stop-listda`
              : 'Barcha taomlar mavjud'
          }
          icon={<Users size={20} />}
        />
      </div>

      {/* Eng ko'p sotilgan taomlar va xabarnomalar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UtensilsCrossed size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{restoUz.topDishes}</h3>
          </div>

          {!data?.top_dishes || data.top_dishes.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
              Bugun hali buyurtmalar rasmiylashtirilmadi.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.top_dishes.map((dish, idx) => (
                <div
                  key={dish.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? 'var(--accent-amber-bg)' : 'var(--bg-surface)',
                        color: idx === 0 ? 'var(--accent-amber)' : 'var(--text-dim)',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{dish.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                      {dish.quantity} {restoUz.soldCount}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {formatSum(dish.total_sum)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tugagan taomlar ogohlantirishi */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--accent-amber)' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{restoUz.outOfStockDishes}</h3>
          </div>

          {(data?.out_of_stock_count ?? 0) === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--accent-emerald)',
                fontSize: '14px',
                backgroundColor: 'var(--accent-emerald-bg)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Hozirda barcha taomlar oshxonada yetarli! Stop-list bo'sh.
            </div>
          ) : (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--accent-amber)',
                fontSize: '14px',
                backgroundColor: 'var(--accent-amber-bg)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {data?.out_of_stock_count} ta taom mijozlar uchun to'xtatilgan (stop-listda).
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
