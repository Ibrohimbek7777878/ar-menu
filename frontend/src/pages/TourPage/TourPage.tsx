// Video sayr (/tour/): mehmon zalga "kiradi", oldinga-orqaga yuradi va o'zi yoqtirgan stolni tanlab bron qiladi.
// Server videoni yengil variantlarga aylantirib beradi; ilova `currentTime` ni boshqaradi, stol belgilari video ustida vaqt oralig'iga qarab chiziladi.
import React, { useMemo, useState } from 'react';
import { ModuleUnavailable } from '../../components/ui/ModuleUnavailable/ModuleUnavailable';
import { useNavigation } from '../../context/NavigationContext';
import { t } from '../../i18n';
import { useLang } from '../../i18n/useLang';
import { moduleEnabled } from '../../utils/brand';
import { planVariants, readConnection } from './network';
import { TourFallback } from './TourFallback';
import { TourIcon } from './TourIcon';
import { TourScene } from './TourScene';
import type { TourData } from './types';
import { useTour } from './useTour';
import './TourPage.css';

const TourExperience: React.FC<{ tour: TourData }> = ({ tour }) => {
  const [attempt, setAttempt] = useState(0);
  // Tarmoq holati sayr ochilganda bir marta o'qiladi (sekin tarmoq / ma'lumot tejash -> yengil video)
  const plan = useMemo(() => planVariants(tour.video, readConnection(undefined, window)), [tour]);
  if (!plan) return <TourFallback tour={tour} reason="no-video" />;
  return <TourScene key={attempt} tour={tour} plan={plan} onRetry={() => setAttempt((n) => n + 1)} />;
};

export const TourPage: React.FC = () => {
  const { state, reload } = useTour();
  const { navigate } = useNavigation();
  useLang();

  if (state.status === 'disabled') return <ModuleUnavailable />;
  if (state.status === 'ready') return <TourExperience tour={state.tour} />;

  const menuOn = moduleEnabled('menu');
  return (
    <div className="tr-root tr-root--message">
      {state.status === 'loading' ? (
        <div className="tr-loading tr-loading--static" role="status" aria-busy="true">
          <span className="tr-spinner" aria-hidden="true"><TourIcon name="spin" size={30} /></span>
          <strong>{t('Zal tayyorlanmoqda...')}</strong>
          <span className="tr-loading-bar" aria-hidden="true"><i /></span>
        </div>
      ) : (
        <div className="tr-loading tr-loading--static" role="alert">
          <strong>{t("Sayrni yuklab bo'lmadi. Aloqani tekshirib, qayta urinib ko'ring.")}</strong>
          <div className="tr-card-actions">
            <button type="button" className="tr-btn tr-btn--primary" onClick={reload}>{t('Qayta urinish')}</button>
            <button type="button" className="tr-btn tr-btn--light" onClick={() => navigate(menuOn ? '/menu/' : '/')}>
              {menuOn ? t('Menyuga qaytish') : t('Bosh sahifaga')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
