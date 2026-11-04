import React from 'react';
import { t } from '@admins/shared';
import { LIMITS, setText } from './brandModel';
import { LogoField } from './LogoField';
import { fieldRowStyle } from './styles';
import { Section, TextField } from './ui';
import type { SectionProps } from './ui';
import type { ImageKind } from './types';
import type { ActionResult } from './useBrand';

interface Props extends SectionProps {
  onUpload: (kind: ImageKind, file: File) => Promise<ActionResult<string | null>>;
  onRemove: (kind: ImageKind) => Promise<ActionResult>;
  onNotify: (message: string, tone: 'success' | 'error') => void;
}

/** (a) Asosiy: nom, shior, logotip, favicon */
export const BasicsCard: React.FC<Props> = ({ draft, messageFor, edit, onUpload, onRemove, onNotify }) => (
  <Section title={t('Asosiy')} hint={t("Mehmon saytining tepasida, kirish sahifasida va brauzer yorlig'ida shu ko'rinadi.")}>
    <div style={fieldRowStyle}>
      <TextField
        label={t('Nomi')}
        value={draft.name}
        maxLength={LIMITS.name + 20}
        autoComplete="off"
        placeholder={t('Masalan: Guliston restorani')}
        error={messageFor('name')}
        onChange={(event) => edit((current) => setText(current, 'name', event.target.value))}
      />
      <TextField
        label={t('Shior')}
        value={draft.tagline}
        maxLength={LIMITS.tagline + 20}
        autoComplete="off"
        placeholder={t('Masalan: Haqiqiy milliy taomlar')}
        hint={t('Nomning tagida kichik yoziladi. Ixtiyoriy.')}
        error={messageFor('tagline')}
        onChange={(event) => edit((current) => setText(current, 'tagline', event.target.value))}
      />
    </div>
    <LogoField
      kind="logo"
      label={t('Logotip')}
      hint={t("PNG yoki JPG. Shaffof fonli PNG eng yaxshi. Rasm o'zi kichraytiriladi. Telefonda kamera yoki galereyadan tanlashingiz mumkin.")}
      url={draft.logo_url}
      onUpload={onUpload}
      onRemove={onRemove}
      onNotify={onNotify}
    />
    <LogoField
      kind="favicon"
      label={t('Favicon (brauzer belgisi)')}
      hint={t("Brauzer yorlig'idagi kichik belgi. Kvadrat rasm yaxshi. Ixtiyoriy.")}
      url={draft.favicon_url}
      onUpload={onUpload}
      onRemove={onRemove}
      onNotify={onNotify}
    />
  </Section>
);
