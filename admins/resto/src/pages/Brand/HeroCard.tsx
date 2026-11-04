import React from 'react';
import { t } from '@admins/shared';
import { LIMITS, setText } from './brandModel';
import { Section, TextArea, TextField } from './ui';
import type { SectionProps } from './ui';

/** (d) Bosh sahifa matnlari: bo'sh = standart matn */
export const HeroCard: React.FC<SectionProps> = ({ draft, messageFor, edit }) => (
  <Section title={t('Bosh sahifa matnlari')} hint={t("Mehmon saytining birinchi ekranidagi yozuvlar. Bo'sh qoldirsangiz, standart matn chiqadi.")}>
    <TextField
      label={t('Sarlavha')}
      value={draft.hero.title}
      maxLength={LIMITS.heroTitle + 20}
      autoComplete="off"
      placeholder={t('Xush kelibsiz!')}
      error={messageFor('hero.title')}
      onChange={(event) => edit((current) => setText(current, 'hero.title', event.target.value))}
    />
    <TextArea
      label={t('Tavsif')}
      value={draft.hero.subtitle}
      rows={3}
      maxLength={LIMITS.heroSubtitle + 20}
      placeholder={t("Menyuni ko'ring, stol band qiling va buyurtma bering.")}
      error={messageFor('hero.subtitle')}
      onChange={(event) => edit((current) => setText(current, 'hero.subtitle', event.target.value))}
    />
    <TextField
      label={t('Tugma matni')}
      value={draft.hero.cta_text}
      maxLength={LIMITS.ctaText + 20}
      autoComplete="off"
      placeholder={t("Menyuni ko'rish")}
      error={messageFor('hero.cta_text')}
      onChange={(event) => edit((current) => setText(current, 'hero.cta_text', event.target.value))}
    />
  </Section>
);
