// "Stol bron qilish" kirish tugmasi (Welcome, TableHub, Menyu): faqat bron yoqiq bo'lsa chiziladi; aks holda hech narsa ko'rinmaydi.
import React from 'react';
import { Icon } from '../../components/ui/Icon/Icon';
import { useNavigation } from '../../context/NavigationContext';
import { t } from '../../i18n';
import { tm } from '../../utils/brandText';
import { useBookingEnabled } from './useBooking';

export const BOOKING_PATH = '/book/';

interface BookingEntryProps {
  /** pill — ixcham tugma; strip — Menyu tepasidagi yupqa satr; plain — joylashgan sahifaning o'z sinfi (`className`) bilan */
  variant?: 'pill' | 'strip' | 'plain';
  className?: string;
  /** Tugma matni (brend: bosh sahifa tugmasi matni); berilmasa "Stol bron qilish" */
  label?: string;
}

export const BookingEntry: React.FC<BookingEntryProps> = ({ variant = 'plain', className = '', label }) => {
  const enabled = useBookingEnabled();
  const { navigate } = useNavigation();
  if (!enabled) return null;
  const open = () => navigate(BOOKING_PATH);

  if (variant === 'strip') {
    return (
      <button type="button" className={`bk-entry-strip ${className}`} onClick={open}>
        <span className="bk-entry-strip-icon"><Icon name="calendar" size={20} /></span>
        <span className="bk-entry-strip-text">
          <strong>{tm(t('Stol bron qilish'))}</strong>
          <small>{tm(t('Sana va vaqtni tanlang, stol sizni kutadi'))}</small>
        </span>
        <Icon name="arrow" size={18} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button type="button" className={variant === 'pill' ? `bk-entry-pill ${className}` : className} onClick={open}>
      <Icon name="calendar" size={variant === 'pill' ? 16 : 18} />
      <span>{label || tm(t('Stol bron qilish'))}</span>
    </button>
  );
};
