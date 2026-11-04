import React from 'react';
import { t } from '@admins/shared';
import { Palette } from 'lucide-react';
import { ColorField } from './ColorField';
import { PRESET_COLORS } from './brandModel';
import { PALETTE_HINT, PALETTE_LABEL } from './labels';
import { PALETTE_KEYS } from './types';
import { Notice, RadioCards, Section } from './ui';
import type { RadioOption, SectionProps } from './ui';
import type { PaletteKey } from './types';

/** Palitra kartochkasi tepasidagi belgi: tayyor palitrada ikki nuqta, "O'z rangingiz"da palitra belgisi */
const Dots: React.FC<{ palette: PaletteKey }> = ({ palette }) => {
  if (palette === 'custom') return <Palette size={22} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />;
  const colors = PRESET_COLORS[palette];
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: '6px' }}>
      {[colors.primary, colors.accent].map((color) => (
        <span key={color} style={{ width: 22, height: 22, borderRadius: 'var(--radius-full)', backgroundColor: color, border: '1px solid var(--border-strong)' }} />
      ))}
    </span>
  );
};

/** (b) Ranglar: tayyor palitralar yoki o'z rangingiz (rang tanlagich + kod + tayyor ranglar + jonli kontrast) */
export const ColorsCard: React.FC<SectionProps> = ({ draft, saved, messageFor, edit }) => {
  const options: RadioOption<PaletteKey>[] = PALETTE_KEYS.map((key) => ({
    value: key,
    label: t(PALETTE_LABEL[key]),
    hint: t(PALETTE_HINT[key]),
    visual: <Dots palette={key} />,
  }));
  const custom = draft.palette === 'custom';
  // Server rangni to'qlashtirgan va foydalanuvchi hali o'zgartirmagan bo'lsa ogohlantiramiz
  const showAdjusted = saved.adjusted && saved.palette === 'custom' && custom && draft.primary_color === saved.primary_color;

  return (
    <Section title={t('Ranglar')} hint={t("Tugmalar, havolalar va belgilar rangi. Tayyor palitrani tanlang yoki o'z rangingizni kiriting.")}>
      <RadioCards legend={t('Palitra')} value={draft.palette} options={options} onChange={(palette) => edit((current) => ({ ...current, palette }))} />
      {custom && (
        <>
          <ColorField
            label={t('Asosiy rang')}
            hint={t('Tugmalar va havolalar shu rangda bo\'ladi.')}
            value={draft.primary_color}
            error={messageFor('primary_color')}
            swatches
            meter
            onChange={(primary_color) => edit((current) => ({ ...current, primary_color }))}
          />
          <ColorField
            label={t("Qo'shimcha rang")}
            hint={t('Narx, belgi va ta\'kidlar uchun. Ixtiyoriy.')}
            value={draft.accent_color}
            error={messageFor('accent_color')}
            onChange={(accent_color) => edit((current) => ({ ...current, accent_color }))}
          />
          {showAdjusted && (
            <Notice tone="warn">
              <strong>{t("Rang o'qilishi uchun to'qroq qilindi")}</strong>{' '}
              {saved.adjusted_from
                ? t("Siz tanlagan rang ({from}) tugmadagi oq matn uchun och edi. Saytda {to} ishlatilmoqda.", { from: saved.adjusted_from, to: saved.primary_color })
                : t("Siz tanlagan rang tugmadagi oq matn uchun och edi. Saytda {to} ishlatilmoqda.", { to: saved.primary_color })}
            </Notice>
          )}
        </>
      )}
    </Section>
  );
};
