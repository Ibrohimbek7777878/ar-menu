/**
 * Xodim yaratilgandan (yoki paroli almashtirilgandan) keyingi oyna: "Xodim qo'shildi" + kirish ma'lumoti +
 * xodimga yuboriladigan TAYYOR XABAR.
 *
 * Parol faqat shu daqiqada ma'lum: u serverda ochiq saqlanmaydi va keyin ko'rsatilmaydi. Parol xabarga FAQAT egasi
 * "Parolni xabarga qo'shish" ni yoqsa tushadi (standart: o'chiq). Parol hech qachon havolaga, URL'ga yoki logga yozilmaydi.
 */
import React, { useCallback, useState } from 'react';
import { Button, Modal, t, useToast } from '@admins/shared';
import { Check, Copy, ShieldCheck } from 'lucide-react';
import type { StaffItem } from './api';
import { buildAccessMessage, buildInviteMessage } from './access';
import { StaffAccess, TAP_TARGET, roleTitleLower, useCopy } from './StaffAccess';
import { restoUz } from '../../i18n/uz';

const A = restoUz.staffPage.access;

export interface CredentialsState {
  mode: 'created' | 'password_reset';
  staff: StaffItem;
  username: string;
  password: string;
}

interface Props {
  state: CredentialsState;
  restaurantName: string;
  onClose: () => void;
}

export const StaffCredentials: React.FC<Props> = ({ state, restaurantName, onClose }) => {
  const { showToast } = useToast();
  const [includePassword, setIncludePassword] = useState(false);   // standart O'CHIQ: egasi o'zi yoqadi
  const { staff, username, password, mode } = state;

  const onCopyFail = useCallback(() => showToast(A.copyFailed, 'error'), [showToast]);
  const passwordCopy = useCopy(onCopyFail);
  const messageCopy = useCopy(onCopyFail);

  const name = staff.full_name || username;
  const loginUrl = staff.login_url || '';
  const secret = includePassword ? password : undefined;
  const message =
    mode === 'created'
      ? buildInviteMessage(
          {
            name,
            restaurant: restaurantName || A.noRestaurantName,
            roleTitle: roleTitleLower(staff.role),
            loginUrl,
            username,
            password: secret,
          },
          { t },
        )
      : buildAccessMessage(
          {
            name,
            loginUrl,
            username,
            panelLabel: staff.panel_label || '',
            password: secret,
          },
          { t },
        );

  return (
    <Modal
      isOpen
      title={mode === 'created' ? A.createdTitle : A.passwordResetTitle}
      onClose={onClose}
      maxWidth="560px"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          maxHeight: 'calc(100dvh - 140px)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 'var(--radius-full)',
              background: 'var(--accent-emerald-bg)',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>@{username}</div>
          </div>
        </div>

        {/* Parol: faqat hozir ko'rinadi */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{A.passwordLabel}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <code
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--action)',
                letterSpacing: '0.5px',
                overflowWrap: 'anywhere',
                minWidth: 0,
              }}
            >
              {password}
            </code>
            <Button
              variant="secondary"
              onClick={() => passwordCopy.copy(password)}
              style={TAP_TARGET}
              aria-live="polite"
            >
              {passwordCopy.copied ? <Check size={18} /> : <Copy size={18} />}
              {passwordCopy.copied ? A.copied : A.copyPassword}
            </Button>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{A.oneTimeNote}</p>
        </div>

        <StaffAccess
          staff={staff}
          restaurantName={restaurantName}
          showPasswordHelp={false}
          shareKind={mode === 'created' ? 'invite' : 'access'}
          sharePassword={secret}
        />

        {/* Tayyor xabar */}
        {loginUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{A.messageLabel}</div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                fontSize: 14,
                color: 'var(--text-main)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={includePassword}
                onChange={(e) => setIncludePassword(e.target.checked)}
                style={{ width: 22, height: 22, accentColor: 'var(--action)', flexShrink: 0 }}
              />
              {A.includePassword}
            </label>
            {includePassword && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{A.includePasswordHint}</p>
            )}
            <pre
              data-testid="staff-message"
              style={{
                margin: 0,
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: 14,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {message}
            </pre>
            <Button
              variant="primary"
              onClick={() => messageCopy.copy(message)}
              style={{ ...TAP_TARGET, width: '100%' }}
              aria-live="polite"
            >
              {messageCopy.copied ? <Check size={18} /> : <Copy size={18} />}
              {messageCopy.copied ? A.copied : A.copyAll}
            </Button>
          </div>
        )}

        <Button variant="ghost" onClick={onClose} style={{ ...TAP_TARGET, width: '100%' }}>
          {A.done}
        </Button>
      </div>
    </Modal>
  );
};

export default StaffCredentials;
