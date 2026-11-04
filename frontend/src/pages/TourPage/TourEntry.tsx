// "Zalni ko'rish" kirish tugmasi (TableHub, Menyu): faqat bo'lim yoqiq VA server sayrni bergan bo'lsa chiziladi; aks holda hech narsa ko'rinmaydi.
// Ko'rinish bron kirish tugmalari bilan bir xil (bk-entry-* sinflari, faqat tokenlar).
import React from 'react';
import { useNavigation } from '../../context/NavigationContext';
import { t } from '../../i18n';
import { tm } from '../../utils/brandText';
import { TOUR_PATH } from './paths';
import { TourIcon } from './TourIcon';
import { useTourEnabled } from './useTour';

interface TourEntryProps {
  /** pill — ixcham tugma; strip — Menyu tepasidagi yupqa satr; plain — joylashgan sahifaning o'z sinfi (`className`) bilan */
  variant?: 'pill' | 'strip' | 'plain';
  className?: string;
  label?: string;
}

export const TourEntry: React.FC<TourEntryProps> = ({ variant = 'plain', className = '', label }) => {
  const enabled = useTourEnabled();
  const { navigate } = useNavigation();
  if (!enabled) return null;
  const open = () => navigate(TOUR_PATH);

  if (variant === 'strip') {
    return (
      <button type="button" className={`bk-entry-strip ${className}`} onClick={open}>
        <span className="bk-entry-strip-icon"><TourIcon name="eye" size={20} /></span>
        <span className="bk-entry-strip-text">
          <strong>{t("Zalni ko'rish")}</strong>
          <small>{tm(t("Zalga kiring, sayr qiling va o'zingizga yoqqan stolni tanlang"))}</small>
        </span>
        <TourIcon name="forward" size={18} />
      </button>
    );
  }

  return (
    <button type="button" className={variant === 'pill' ? `bk-entry-pill ${className}` : className} onClick={open}>
      <TourIcon name="eye" size={variant === 'pill' ? 16 : 18} />
      <span>{label || t("Zalni ko'rish")}</span>
    </button>
  );
};
