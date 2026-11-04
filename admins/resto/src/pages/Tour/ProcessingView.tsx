import React from 'react';
import { Button, t } from '@admins/shared';
import { hintStyle, innerCardStyle, tapButton } from './styles';
import { Notice, Spinner } from './ui';

interface Props {
  stalled: boolean;
  connectionLost: boolean;
  onResume: () => void;
  onBack: () => void;
}

/** Video qayta ishlanmoqda: foiz yo'q — aylanuvchi belgi va matn (server har 2 soniyada so'raladi). */
export const ProcessingView: React.FC<Props> = ({ stalled, connectionLost, onResume, onBack }) => (
  <div style={{ ...innerCardStyle, alignItems: 'flex-start', gap: 14 }}>
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 17, fontWeight: 600, color: 'var(--text-main)' }}>
      <Spinner size={26} />
      {t('Qayta ishlanmoqda…')}
    </div>
    <p style={{ ...hintStyle, margin: 0 }}>{t("Video mehmonlar uchun yengil ko'rinishga keltirilmoqda. Bu bir necha daqiqa olishi mumkin. Sahifani yopsangiz ham bo'ladi: tayyor bo'lgach shu yerda ko'rinadi.")}</p>
    {connectionLost && <Notice tone="warn">{t("Internet bilan aloqa uzildi. Qayta urinilmoqda…")}</Notice>}
    {stalled && (
      <Notice tone="warn">
        <div>{t("Qayta ishlash odatdagidan uzoq davom etmoqda. Birozdan keyin sahifani yangilab ko'ring.")}</div>
        <Button variant="secondary" style={{ ...tapButton, marginTop: 8 }} onClick={onResume}>
          {t('Qayta tekshirish')}
        </Button>
      </Notice>
    )}
    <Button variant="secondary" style={tapButton} onClick={onBack}>
      {t("Sayrlar ro'yxatiga qaytish")}
    </Button>
  </div>
);
