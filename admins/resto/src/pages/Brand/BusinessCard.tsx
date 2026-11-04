import React, { useState } from 'react';
import { Button, t } from '@admins/shared';
import { Coffee, PartyPopper, UtensilsCrossed, WandSparkles } from 'lucide-react';
import { BUSINESS_HINT, BUSINESS_LABEL } from './labels';
import { BUSINESS_TYPES } from './types';
import { ConfirmDialog, Notice, RadioCards, Section } from './ui';
import type { RadioOption, SectionProps } from './ui';
import { hintStyle, tapButton } from './styles';
import type { BusinessType } from './types';
import type { ActionResult } from './useBrand';

const ICONS: Record<BusinessType, React.ReactNode> = {
  restaurant: <UtensilsCrossed size={24} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />,
  cafe: <Coffee size={24} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />,
  banquet: <PartyPopper size={24} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />,
};

interface Props extends SectionProps {
  /** Shablonni qo'llash (serverda darrov saqlanadi) */
  onApply: (type: BusinessType) => Promise<ActionResult>;
  onNotify: (message: string, tone: 'success' | 'error') => void;
  dirty: boolean;
}

/** Atamalar ro'yxati: faqat tanish kalitlar nomlanadi */
function termsLine(terms: Record<string, string>): string {
  const parts: string[] = [];
  if (terms.table) parts.push(`${t('stol')}: ${terms.table}`);
  if (terms.guest) parts.push(`${t('mehmon')}: ${terms.guest}`);
  if (terms.venue) parts.push(`${t('joy')}: ${terms.venue}`);
  return parts.join(' · ');
}

/** (g) Biznes turi: restoran / kafe / to'yxona va "Shablonni qo'llash" (atamalar + bo'limlar standarti, tasdiq bilan) */
export const BusinessCard: React.FC<Props> = ({ saved, onApply, onNotify, dirty }) => {
  const [picked, setPicked] = useState<BusinessType>(saved.business_type);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const options: RadioOption<BusinessType>[] = BUSINESS_TYPES.map((key) => ({
    value: key,
    label: t(BUSINESS_LABEL[key]),
    hint: t(BUSINESS_HINT[key]),
    visual: ICONS[key],
  }));
  const same = picked === saved.business_type;
  const terms = termsLine(saved.terms);

  const apply = async () => {
    setBusy(true);
    setError('');
    const result = await onApply(picked);
    setBusy(false);
    setConfirmOpen(false);
    if (result.status === 'done') {
      onNotify(t("Shablon qo'llandi"), 'success');
    } else {
      setError(result.failure.forbidden ? t("Shablonni qo'llashga ruxsatingiz yo'q") : result.failure.message ? t(result.failure.message) : t("Shablonni qo'llab bo'lmadi. Qayta urinib ko'ring."));
    }
  };

  return (
    <Section title={t('Biznes turi')} hint={t("Turni tanlab «Shablonni qo'llash» ni bosing: atamalar (stol, mehmon, joy nomi) va bo'limlar shu turning standartiga o'tadi.")}>
      <RadioCards legend={t('Biznes turi')} value={picked} options={options} onChange={setPicked} />
      {terms && (
        <p style={{ ...hintStyle, margin: 0 }}>
          {t('Hozirgi atamalar')}: {terms}
        </p>
      )}
      <div>
        <Button variant="secondary" onClick={() => setConfirmOpen(true)} disabled={busy} style={tapButton}>
          <WandSparkles size={18} aria-hidden="true" />
          {same ? t("Shablonni qayta qo'llash") : t("Shablonni qo'llash")}
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <ConfirmDialog
        open={confirmOpen}
        title={t("Shablon qo'llansinmi?")}
        message={
          t("«{type}» shabloni qo'llanadi: atamalar va bo'limlar (menyu, bron, buyurtma ...) shu turning standartiga o'tadi. Menyu, stollar va boshqa ma'lumotlaringiz o'zgarmaydi. Bu o'zgarish darrov saqlanadi.", { type: t(BUSINESS_LABEL[picked]) }) +
          (dirty ? ' ' + t("Saqlanmagan boshqa tahrirlaringiz (bo'limlardan tashqari) qoladi.") : '')
        }
        confirmLabel={t("Ha, qo'llash")}
        busy={busy}
        onConfirm={() => void apply()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Section>
  );
};
