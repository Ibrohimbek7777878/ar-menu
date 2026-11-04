import React from 'react';
import { t } from '@admins/shared';
import { fontStack } from './fonts';
import { FONT_HINT, FONT_LABEL } from './labels';
import { FONT_KEYS } from './types';
import { RadioCards, Section } from './ui';
import type { RadioOption, SectionProps } from './ui';
import type { FontKey } from './types';

/** (c) Shrift: 3 variant, har birida kichik ko'rinish namunasi */
export const FontCard: React.FC<SectionProps> = ({ draft, edit }) => {
  const options: RadioOption<FontKey>[] = FONT_KEYS.map((key) => ({
    value: key,
    label: t(FONT_LABEL[key]),
    hint: t(FONT_HINT[key]),
    visual: (
      <span aria-hidden="true" style={{ fontFamily: fontStack(key), fontSize: '26px', fontWeight: 700, lineHeight: 1.2, color: 'var(--text-main)' }}>
        {t('Mazali taom')}
      </span>
    ),
  }));
  return (
    <Section title={t('Shrift')} hint={t("Mehmon saytidagi yozuvlar shu shriftda bo'ladi.")}>
      <RadioCards legend={t('Shrift turi')} value={draft.font} options={options} onChange={(font) => edit((current) => ({ ...current, font }))} />
    </Section>
  );
};
