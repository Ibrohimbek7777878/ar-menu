/**
 * Bron sahifasining kichik umumiy qismlari: matn/son maydoni, almashtirgich, xabar bloki, tasdiq oynasi.
 * Faqat tokenlar; har boshqaruv >= 44 px; xato matni maydon bilan `aria-describedby` orqali bog'lanadi.
 */
import React, { useEffect, useId, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import { Button, Modal, t } from '@admins/shared';
import { TAP, errorTextStyle, hintStyle, inputErrorStyle, inputStyle, labelStyle, noticeStyle, tapButton } from './styles';
import type { NoticeTone } from './styles';

interface FieldFrameProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: (describedBy: string | undefined, invalid: boolean) => React.ReactNode;
}

const FieldFrame: React.FC<FieldFrameProps> = ({ id, label, error, hint, children }) => {
  const messageId = error || hint ? `${id}-msg` : undefined;
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children(messageId, Boolean(error))}
      {error ? (
        <p id={messageId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} style={hintStyle}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'style' | 'className'>;

export const TextField: React.FC<InputProps & { label: string; error?: string; hint?: string }> = ({ label, error, hint, ...input }) => {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint}>
      {(describedBy, invalid) => <input id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ ...inputStyle, ...(invalid ? inputErrorStyle : null) }} {...input} />}
    </FieldFrame>
  );
};

export const TextArea: React.FC<Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'style' | 'className'> & { label: string; error?: string; hint?: string }> = ({
  label,
  error,
  hint,
  ...input
}) => {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint}>
      {(describedBy, invalid) => (
        <textarea id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ ...inputStyle, ...(invalid ? inputErrorStyle : null), resize: 'vertical' }} {...input} />
      )}
    </FieldFrame>
  );
};

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: string;
  /** Maydon yonidagi o'lchov birligi matni (masalan "daqiqa") */
  unit?: string;
  disabled?: boolean;
}

/**
 * Butun son maydoni. Yozish paytida bo'sh qoldirish mumkin (matn alohida saqlanadi); bo'sh/yaroqsiz bo'lsa qiymat NaN
 * (tekshiruv xato ko'rsatadi, saqlanmaydi). Tashqaridan qiymat o'zgarsa (bekor qilish, andoza) matn yangilanadi.
 */
export const NumberField: React.FC<NumberFieldProps> = ({ label, value, onChange, error, hint, unit, disabled }) => {
  const id = useId();
  const [text, setText] = useState(Number.isFinite(value) ? String(value) : '');
  useEffect(() => {
    setText((current) => {
      if (!Number.isFinite(value)) return current; // foydalanuvchi maydonni tozalagan: yozganini saqlaymiz
      return current.trim() !== '' && Number(current) === value ? current : String(value);
    });
  }, [value]);
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint}>
      {(describedBy, invalid) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            value={text}
            onChange={(e) => {
              const next = e.target.value.replace(/\s+/g, '');
              if (next !== '' && !/^\d+$/.test(next)) return;
              setText(next);
              onChange(next === '' ? Number.NaN : Number(next));
            }}
            style={{ ...inputStyle, ...(invalid ? inputErrorStyle : null), maxWidth: '140px' }}
          />
          {unit && <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{unit}</span>}
        </div>
      )}
    </FieldFrame>
  );
};

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  describedBy?: string;
}

/** Yoqish/o'chirish almashtirgichi. Bosiladigan joy 56x44 px; ko'rinishi 48x28. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled = false, label, describedBy }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    style={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 56,
      height: TAP,
      padding: 0,
      border: 'none',
      background: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <span
      aria-hidden="true"
      style={{
        position: 'relative',
        display: 'block',
        width: 48,
        height: 28,
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-full)',
        border: `2px solid ${checked ? 'var(--action)' : 'var(--text-dim)'}`,
        backgroundColor: checked ? 'var(--action)' : 'var(--bg-surface)',
        transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: 'var(--radius-full)',
          backgroundColor: checked ? 'var(--text-inverse)' : 'var(--text-dim)',
          transition: 'left var(--transition-fast), background-color var(--transition-fast)',
        }}
      />
    </span>
  </button>
);

/** Yorliq + izoh + almashtirgich qatori */
export const SwitchRow: React.FC<{ label: string; hint?: string; checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }> = ({
  label,
  hint,
  checked,
  onChange,
  disabled,
}) => {
  const id = useId();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>{label}</div>
        {hint && (
          <p id={`${id}-hint`} style={hintStyle}>
            {hint}
          </p>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} label={label} describedBy={hint ? `${id}-hint` : undefined} />
    </div>
  );
};

const NOTICE_ICON: Record<NoticeTone, React.ReactNode> = {
  info: <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--text-muted)' }} />,
  warn: <TriangleAlert size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-amber)' }} />,
  error: <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-rose)' }} />,
  success: <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent-emerald)' }} />,
};

export const Notice: React.FC<{ tone?: NoticeTone; children: React.ReactNode }> = ({ tone = 'info', children }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} style={noticeStyle(tone)}>
    {NOTICE_ICON[tone]}
    <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{children}</div>
  </div>
);

/**
 * Oyna ichidagi kontent: telefonda balandligi ekrandan oshib ketmasin, o'zi aylansin
 * (umumiy `Modal` ichki aylantirishni bermaydi: uzun forma pastki tugmalari ko'rinmay qolardi).
 */
export const ModalBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ maxHeight: 'calc(100dvh - 150px)', overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: '2px' }}>{children}</div>
);

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Tasdiq oynasi: "Orqaga" va asosiy amal. Qaytarib bo'lmaydigan amallar (bekor qilish, kelmadi) uchun. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ open, title, message, confirmLabel, danger = false, busy = false, onConfirm, onCancel }) => (
  <Modal isOpen={open} onClose={busy ? () => undefined : onCancel} title={title} maxWidth="440px">
    <p style={{ margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.5, color: 'var(--text-main)' }}>{message}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' }}>
      <Button variant="secondary" onClick={onCancel} disabled={busy} style={tapButton}>
        {t('Orqaga')}
      </Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy} style={tapButton}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);
