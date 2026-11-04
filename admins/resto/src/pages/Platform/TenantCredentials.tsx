/**
 * Yangi mijoz yaratilgandan (yoki ega paroli tiklangandan) keyingi oyna: kirish havolasi, login, PAROL (faqat shu daqiqada) va
 * egasiga yuboriladigan TAYYOR XABAR bilan [Hammasini nusxalash]. Parol serverda ochiq saqlanmaydi va keyin ko'rsatilmaydi;
 * u URL'ga, logga yoki brauzer xotirasiga yozilmaydi.
 */
import React, { useCallback } from 'react';
import { Button, Modal, t, useToast } from '@admins/shared';
import { Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { buildOwnerMessage } from './message';
import { safeHttpUrl } from './tenants';
import { useCopy } from '../Staff/StaffAccess';
import { TAP, hintStyle, tapButton } from './styles';

export interface CredentialsState {
  mode: 'created' | 'password_reset';
  name: string;
  loginUrl: string;
  username: string;
  password: string;
}

interface Props {
  state: CredentialsState;
  onClose: () => void;
}

const boxStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const smallLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text-muted)' };

export const TenantCredentials: React.FC<Props> = ({ state, onClose }) => {
  const { showToast } = useToast();
  const onCopyFail = useCallback(() => showToast(t("Nusxalab bo'lmadi. Matnni belgilab, qo'lda nusxalang."), 'error'), [showToast]);
  const linkCopy = useCopy(onCopyFail);
  const passwordCopy = useCopy(onCopyFail);
  const messageCopy = useCopy(onCopyFail);

  const { mode, name, loginUrl, username, password } = state;
  const openUrl = safeHttpUrl(loginUrl);
  const message = buildOwnerMessage({ name, loginUrl: openUrl, username, password }, t);

  return (
    <Modal isOpen title={mode === 'created' ? t('Mijoz qo\'shildi') : t('Yangi parol tayyor')} onClose={onClose} maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            aria-hidden="true"
            style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 'var(--radius-full)', background: 'var(--accent-emerald-bg)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ShieldCheck size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{username}</div>
          </div>
        </div>

        {openUrl && (
          <div style={boxStyle}>
            <div style={smallLabel}>{t('Kirish havolasi')}</div>
            <code style={{ fontSize: 14, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{openUrl}</code>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Button variant="secondary" onClick={() => linkCopy.copy(openUrl)} style={tapButton} aria-live="polite">
                {linkCopy.copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                {linkCopy.copied ? t('Nusxalandi') : t('Havolani nusxalash')}
              </Button>
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...tapButton, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
              >
                <ExternalLink size={18} aria-hidden="true" />
                {t('Ochish')}
              </a>
            </div>
          </div>
        )}

        <div style={boxStyle}>
          <div style={smallLabel}>{t('Parol')}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <code style={{ fontSize: 18, fontWeight: 700, color: 'var(--action)', letterSpacing: '0.5px', overflowWrap: 'anywhere', minWidth: 0 }}>{password}</code>
            <Button variant="secondary" onClick={() => passwordCopy.copy(password)} style={tapButton} aria-live="polite">
              {passwordCopy.copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {passwordCopy.copied ? t('Nusxalandi') : t('Parolni nusxalash')}
            </Button>
          </div>
          <p style={{ ...hintStyle, margin: 0 }}>{t("Parol faqat hozir ko'rinadi, keyin ko'rsatilmaydi. Uni egasiga hoziroq yuboring.")}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{t('Egasiga yuboriladigan xabar')}</div>
          <pre
            data-testid="tenant-message"
            style={{ margin: 0, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
          >
            {message}
          </pre>
          <Button variant="primary" onClick={() => messageCopy.copy(message)} style={{ minHeight: TAP, width: '100%' }} aria-live="polite">
            {messageCopy.copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
            {messageCopy.copied ? t('Nusxalandi') : t('Hammasini nusxalash')}
          </Button>
        </div>

        <Button variant="ghost" onClick={onClose} style={{ minHeight: TAP, width: '100%' }}>
          {t('Tayyor')}
        </Button>
      </div>
    </Modal>
  );
};
