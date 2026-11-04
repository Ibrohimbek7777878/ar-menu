import React, { useState } from 'react';
import { Button, Modal, t } from '@admins/shared';
import { updateTenant } from './api';
import type { TenantPatch } from './api';
import { BUSINESS_TYPES, businessLabel } from './labels';
import { TAP, hintStyle, tapButton, toggleChipStyle } from './styles';
import type { Tenant } from './tenants';
import { ModalBody, Notice, TextField } from '../Bookings/ui';
import { readFailure } from '../Bookings/errors';

interface Props {
  tenant: Tenant;
  domain: string;
  onClose: () => void;
  onSaved: () => void;
}

const NAME_MAX = 80;

/** Mijozni tahrirlash: nom va biznes turi. Subdomen o'zgartirib bo'lmaydi (faqat ko'rsatiladi). Faqat o'zgargan maydon yuboriladi. */
export const EditTenantModal: React.FC<Props> = ({ tenant, domain, onClose, onSaved }) => {
  const [name, setName] = useState(tenant.name);
  const [businessType, setBusinessType] = useState(tenant.business_type);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const trimmed = name.trim();
  const nameProblem = trimmed === '' ? t('Nomini yozing') : Array.from(trimmed).length > NAME_MAX ? t('Juda uzun: {max} ta belgidan oshmasin', { max: NAME_MAX }) : '';
  const patch: TenantPatch = {};
  if (trimmed !== tenant.name.trim()) patch.name = trimmed;
  if (businessType !== tenant.business_type) patch.business_type = businessType;
  const changed = Object.keys(patch).length > 0;

  const submit = async () => {
    setSubmitted(true);
    if (nameProblem || !changed) return;
    setBusy(true);
    setError('');
    try {
      await updateTenant(tenant.id, patch);
      onSaved();
    } catch (err: unknown) {
      const failure = readFailure(err);
      setError(failure.forbidden ? t("O'zgartirishga ruxsatingiz yo'q") : failure.message ? t(failure.message) : t("Saqlab bo'lmadi. Qayta urinib ko'ring."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen title={t('Mijozni tahrirlash')} onClose={busy ? () => undefined : onClose} maxWidth="520px">
      <ModalBody>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <fieldset disabled={busy} style={{ margin: 0, padding: 0, border: 'none', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField label={t('Mijoz nomi')} value={name} autoComplete="off" error={submitted && nameProblem ? nameProblem : undefined} onChange={(event) => setName(event.target.value)} />

            <fieldset style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
              <legend style={{ padding: 0, marginBottom: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{t('Biznes turi')}</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BUSINESS_TYPES.map((type) => (
                  <button key={type} type="button" aria-pressed={businessType === type} onClick={() => setBusinessType(type)} style={toggleChipStyle(businessType === type)}>
                    {businessLabel(type)}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{t('Subdomen')}</div>
              <div style={{ minHeight: TAP, display: 'flex', alignItems: 'center', padding: '0 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>
                {tenant.subdomain}.{domain}
              </div>
              <p style={hintStyle}>{t("Subdomenni o'zgartirib bo'lmaydi: mijozning havolalari va xodimlarning kirishi shunga bog'langan.")}</p>
            </div>
          </fieldset>

          {error && <Notice tone="error">{error}</Notice>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy} style={tapButton}>
              {t('Bekor qilish')}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!changed} style={tapButton}>
              {t('Saqlash')}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
};
