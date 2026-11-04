import React from 'react';
import { t } from '@admins/shared';
import { Camera } from 'lucide-react';
import { hintStyle, innerCardStyle, sectionTitleStyle } from './styles';

/** Suratga olish yo'riqnomasi: oddiy, 6 band. */
export const ShootingGuide: React.FC = () => {
  const steps = [
    t("Telefonni gimbalda yoki ikki qo'lda barqaror ushlang."),
    t('Bir xil, sekin tezlikda yuring.'),
    t("Har bir stol oldida 2 soniya to'xtang."),
    t("Kun yorug'ida suratga oling."),
    t('Sifat: 1080p, 30 kadr.'),
    t("Video 1–3 daqiqa bo'lsin. Telefonni vertikal yoki gorizontal ushlash — ixtiyoriy."),
  ];
  return (
    <section style={{ ...innerCardStyle, gap: 10 }} aria-labelledby="tour-guide-title">
      <h2 id="tour-guide-title" style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Camera size={18} aria-hidden="true" />
        {t('Qanday suratga olinadi?')}
      </h2>
      <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 15, lineHeight: 1.5, color: 'var(--text-main)' }}>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p style={{ ...hintStyle, margin: 0 }}>{t('Cheklov: 300 MB gacha, 5 daqiqagacha. Qabul qilinadi: MP4, MOV, WebM.')}</p>
    </section>
  );
};
