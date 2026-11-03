/**
 * "Kirish" bo'limi: xodim qayerdan va qanday kiradi.
 * Panel nomi, to'liq kirish havolasi (nusxalash / ulashish), login, parol haqida eslatma va 3 qadamli yo'riqnoma.
 * Havola va panel serverda hisoblanadi (`accounts/staff_access.py`); parol bu yerda ko'rsatilmaydi (u serverda ochiq saqlanmaydi).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, t, useToast } from '@admins/shared';
import { Check, Copy, KeyRound, Share2 } from 'lucide-react';
import type { StaffItem } from './api';
import { buildShareTexts, copyText, planShare } from './access';
import { browserCopyEnv, canNativeShare, nativeShare, openExternal } from './accessBrowser';
import { restoUz, roleLabel } from '../../i18n/uz';

const A = restoUz.staffPage.access;

/** Telefonda bosish oson bo'lishi uchun har tugma kamida 44 px. */
export const TAP_TARGET: React.CSSProperties = { minHeight: 44, minWidth: 44 };

export type AccessStaff = Pick<
  StaffItem,
  'username' | 'full_name' | 'role' | 'panel_label' | 'login_url' | 'login_unavailable_reason'
>;

/** Nusxa olish + "Nusxalandi" tasdig'i (2 soniya). Nusxa olinmasa `onFail` chaqiriladi. */
export function useCopy(onFail?: () => void) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      const ok = await copyText(text, browserCopyEnv());
      if (!ok) {
        onFail?.();
        return false;
      }
      setCopied(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
      return true;
    },
    [onFail],
  );

  return { copied, copy };
}

export function roleTitleLower(role: string): string {
  return roleLabel(role).toLowerCase();
}

const sectionTitle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

interface StaffAccessProps {
  staff: AccessStaff;
  restaurantName: string;
  /** Profilda: "Parolni almashtirish" tugmasi. Yaratilgandan keyingi oynada berilmaydi. */
  onChangePassword?: () => void;
  /** Parol haqidagi eslatma (profilda ko'rinadi; parol hozir ko'rinib turgan oynada kerak emas). */
  showPasswordHelp?: boolean;
  /** Ulashiladigan matn turi: yangi xodimga "qo'shildingiz" xabari yoki mavjud xodimga havola. */
  shareKind?: 'invite' | 'access';
  /** Ulashiladigan matnga qo'shiladigan parol (egasi yoqqan bo'lsagina). Telegram havolasiga HECH QACHON tushmaydi. */
  sharePassword?: string;
}

export const StaffAccess: React.FC<StaffAccessProps> = ({
  staff,
  restaurantName,
  onChangePassword,
  showPasswordHelp = true,
  shareKind = 'access',
  sharePassword,
}) => {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleCopyFail = useCallback(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    showToast(A.copyFailed, 'error');
  }, [showToast]);
  const { copied, copy } = useCopy(handleCopyFail);

  const loginUrl = staff.login_url || '';

  const handleShare = async () => {
    const texts = buildShareTexts(
      {
        name: staff.full_name || staff.username,
        restaurant: restaurantName || A.noRestaurantName,
        roleTitle: roleTitleLower(staff.role),
        loginUrl,
        username: staff.username,
        password: sharePassword || undefined,
        panelLabel: staff.panel_label || '',
      },
      shareKind,
      t,
    );
    const plan = planShare({ canNativeShare: canNativeShare(), title: A.shareTitle, loginUrl, texts });
    try {
      if (plan.kind === 'native') await nativeShare(plan.title, plan.text);
      else openExternal(plan.url);
    } catch {
      showToast(A.shareFailed, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h4 style={sectionTitle}>{A.sectionTitle}</h4>
        {staff.panel_label && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {A.panelLabel}:{' '}
            <strong style={{ color: 'var(--text-main)' }}>{staff.panel_label}</strong>
          </div>
        )}
      </div>

      {loginUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label
            htmlFor={`staff-link-${staff.username}`}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}
          >
            {A.linkLabel}
          </label>
          <input
            id={`staff-link-${staff.username}`}
            ref={inputRef}
            type="text"
            readOnly
            value={loginUrl}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-primary)',
              color: 'var(--text-main)',
              fontSize: 16,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button
              variant="primary"
              onClick={() => copy(loginUrl)}
              style={{ ...TAP_TARGET, flex: '2 1 190px' }}
              aria-live="polite"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? A.copied : A.copyLink}
            </Button>
            <Button variant="secondary" onClick={handleShare} style={{ ...TAP_TARGET, flex: '1 1 120px' }}>
              <Share2 size={18} />
              {A.share}
            </Button>
          </div>
        </div>
      ) : (
        <div
          role="status"
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-amber-bg)',
            border: '1px solid var(--accent-amber-border)',
            color: 'var(--text-main)',
            fontSize: 14,
          }}
        >
          {staff.login_unavailable_reason || A.noLink}
        </div>
      )}

      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        {A.loginLabel}:{' '}
        <code style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 15 }}>{staff.username}</code>
      </div>

      {showPasswordHelp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{A.passwordHelp}</p>
          {onChangePassword && (
            <Button
              variant="secondary"
              onClick={onChangePassword}
              style={{ ...TAP_TARGET, alignSelf: 'flex-start' }}
            >
              <KeyRound size={18} />
              {A.changePassword}
            </Button>
          )}
        </div>
      )}

      {loginUrl && (
        <div>
          <h4 style={sectionTitle}>{A.stepsTitle}</h4>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {A.steps.map((text, i) => (
              <li key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: 'var(--text-main)' }}>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-amber-bg)',
                    color: 'var(--accent-amber)',
                    border: '1px solid var(--accent-amber-border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default StaffAccess;
