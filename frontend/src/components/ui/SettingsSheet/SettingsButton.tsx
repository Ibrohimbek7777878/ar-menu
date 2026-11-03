import React from 'react';
import { useNavigation } from '../../../context/NavigationContext';
import { t } from '../../../i18n';
import { settingsAvailable } from './settingsAvailable';

/** Sarlavhadagi kichik "sozlamalar" tugmasi (til va kun/tun). Almashtirgich yoqilmagan bo'lsa umuman chizilmaydi. */
export const SettingsButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { setIsSettingsOpen } = useNavigation();
  if (!settingsAvailable()) return null;
  return (
    <button
      type="button"
      className={`settings-btn ${className}`}
      onClick={() => setIsSettingsOpen(true)}
      aria-label={t('Sozlamalar')}
      title={t('Til va ko\'rinish')}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
      </svg>
    </button>
  );
};
