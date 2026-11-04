// Zaxira ko'rinish: video yo'q yoki ochilmadi -> poster + matnli stollar ro'yxati (bron to'liq ishlaydi).
import React, { useMemo } from 'react';
import { BottomNav, HeaderNav } from '../../components/ui';
import { useNavigation } from '../../context/NavigationContext';
import { t } from '../../i18n';
import { brandName, moduleEnabled } from '../../utils/brand';
import { tm } from '../../utils/brandText';
import { bookingPathForTable } from './paths';
import { tableEntries } from './stops';
import { TableList } from './TableList';
import type { TourData } from './types';

interface TourFallbackProps {
  tour: TourData;
  reason: 'no-video' | 'failed';
  onRetry?: () => void;
}

export const TourFallback: React.FC<TourFallbackProps> = ({ tour, reason, onRetry }) => {
  const { navigate, cartCount } = useNavigation();
  const entries = useMemo(() => tableEntries(tour.hotspots), [tour.hotspots]);
  const menuOn = moduleEnabled('menu');

  return (
    <div className="tr-fb">
      <HeaderNav brandName={brandName()} cartCount={cartCount} onCartClick={() => navigate('/cart')} />
      <main className="tr-fb-main">
        <h1 className="tr-fb-title">{tour.title || t('Zal sayri')}</h1>
        {tour.video.poster && <img className="tr-fb-poster" src={tour.video.poster} alt="" decoding="async" />}
        <p className="tr-fb-note" role="status">
          {reason === 'failed'
            ? tm(t("Videoni ochib bo'lmadi. Stolni ro'yxatdan tanlang."))
            : tm(t("Hozircha video yo'q. Stolni ro'yxatdan tanlang."))}
        </p>
        {reason === 'failed' && onRetry && (
          <button type="button" className="tr-btn tr-btn--light" onClick={onRetry}>{t('Qayta urinish')}</button>
        )}
        <section aria-label={t("Stollar ro'yxati")} className="tr-fb-list">
          <TableList entries={entries} onBook={(id) => navigate(bookingPathForTable(id))} />
        </section>
        <button type="button" className="tr-btn tr-btn--light" onClick={() => navigate(menuOn ? '/menu/' : '/')}>
          {menuOn ? t('Menyuga qaytish') : t('Bosh sahifaga')}
        </button>
      </main>
      <BottomNav
        activeTab={menuOn || !moduleEnabled('booking') ? 'home' : 'book'}
        cartCount={cartCount}
        onTabChange={(tab) => {
          if (tab === 'home') navigate('/');
          else if (tab === 'menu') navigate('/menu/');
          else if (tab === 'ar') navigate('/ar/');
          else if (tab === 'cart') navigate('/cart/');
          else if (tab === 'orders') navigate('/orders/');
        }}
      />
    </div>
  );
};
