import React from 'react';
import { t } from '@admins/shared';
import { LIMITS, setText } from './brandModel';
import { fieldRowStyle } from './styles';
import { Section, TextField } from './ui';
import type { SectionProps } from './ui';

/** (e) Aloqa va manzil */
export const ContactCard: React.FC<SectionProps> = ({ draft, messageFor, edit }) => {
  const field = (path: string, value: string) => ({
    value,
    error: messageFor(path),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => edit((current) => setText(current, path, event.target.value)),
  });
  return (
    <Section title={t('Aloqa va manzil')} hint={t("Mehmon saytida ko'rinadi. Keraksiz qatorni bo'sh qoldiring.")}>
      <div style={fieldRowStyle}>
        <TextField label={t('Telefon')} type="tel" inputMode="tel" autoComplete="off" placeholder="+998 90 123 45 67" maxLength={LIMITS.phone + 10} {...field('contact.phone', draft.contact.phone)} />
        <TextField label={t("Qo'shimcha telefon")} type="tel" inputMode="tel" autoComplete="off" placeholder="+998 71 123 45 67" maxLength={LIMITS.phone + 10} {...field('contact.phone2', draft.contact.phone2)} />
      </div>
      <TextField label={t('Manzil')} autoComplete="off" placeholder={t("Masalan: Guliston shahri, Mustaqillik ko'chasi 12")} maxLength={LIMITS.address + 20} {...field('contact.address', draft.contact.address)} />
      <div style={fieldRowStyle}>
        <TextField label={t('Instagram')} autoComplete="off" autoCapitalize="none" placeholder="@guliston" maxLength={LIMITS.social + 20} {...field('contact.instagram', draft.contact.instagram)} />
        <TextField label={t('Telegram')} autoComplete="off" autoCapitalize="none" placeholder="@guliston" maxLength={LIMITS.social + 20} {...field('contact.telegram', draft.contact.telegram)} />
      </div>
      <div style={fieldRowStyle}>
        <TextField label={t('Sayt')} type="url" inputMode="url" autoComplete="off" autoCapitalize="none" placeholder="guliston.uz" maxLength={LIMITS.website + 20} {...field('contact.website', draft.contact.website)} />
        <TextField label={t('Ish vaqti')} autoComplete="off" placeholder={t('Masalan: har kuni 10:00 dan 23:00 gacha')} maxLength={LIMITS.hours + 20} {...field('contact.hours_text', draft.contact.hours_text)} />
      </div>
    </Section>
  );
};
