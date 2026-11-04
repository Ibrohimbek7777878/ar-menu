/**
 * Moliya tahrirlash oynalarining umumiy qismlari: maydon qobig'i, "O'zgartirish sababi", "Nima o'zgaradi" ro'yxati, summa formati.
 * Faqat tokenlar; har boshqaruv >= 44 px; xato matni maydon bilan `aria-describedby` orqali bog'langan.
 */
import React, { useId } from 'react';
import { ArrowRight, Info, TriangleAlert } from 'lucide-react';
import { TASHKENT_OFFSET_MS, fmtNum, getLang, t } from '@admins/shared';
import { REASON_MAX, formatMoneyParts, reasonMessage, reasonState, type ChangeLine } from './editModel';
import {
  chipStyle,
  errorTextStyle,
  hintStyle,
  inputErrorStyle,
  inputStyle,
  labelStyle,
  noticeStyle,
  panelStyle,
  visuallyHidden,
  type NoticeTone,
} from './editStyles';

/** Summa: butun bo'lsa guruhlangan son, tiyin bo'lsa ikki xonali kasr (tarixda 170 000 -> 170 000,50 farqi yo'qolmasin). */
export function formatMoneyExact(n: number): string {
  const lang = getLang();
  const group = (whole: number) => (lang === 'uz' ? fmtNum(whole).replace(/,/g, ' ') : fmtNum(whole));
  return `${formatMoneyParts(n, group, lang === 'en' ? '.' : ',')} ${t("so'm")}`;
}

/** Bugungi sana (Toshkent, YYYY-MM-DD): kelajak sanasi tanlanmasligi uchun */
export function tashkentToday(): string {
  return new Date(Date.now() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
}

/** Yorliq + maydon + xato/ko'rsatma matni */
export const Field: React.FC<FieldProps> = ({ label, error, hint, children }) => {
  const id = useId();
  const messageId = error || hint ? `${id}-msg` : undefined;
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children({ id, describedBy: messageId, invalid: Boolean(error) })}
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

export const TextInput: React.FC<InputProps & { label: string; error?: string; hint?: string }> = ({ label, error, hint, ...input }) => (
  <Field label={label} error={error} hint={hint}>
    {({ id, describedBy, invalid }) => (
      <input id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ ...inputStyle, ...(invalid ? inputErrorStyle : null) }} {...input} />
    )}
  </Field>
);

export const TextAreaInput: React.FC<
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'style' | 'className'> & { label: string; error?: string; hint?: string }
> = ({ label, error, hint, ...input }) => (
  <Field label={label} error={error} hint={hint}>
    {({ id, describedBy, invalid }) => (
      <textarea id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ ...inputStyle, ...(invalid ? inputErrorStyle : null), resize: 'vertical' }} {...input} />
    )}
  </Field>
);

export const SelectInput: React.FC<
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'style' | 'className'> & { label: string; error?: string; hint?: string }
> = ({ label, error, hint, children, ...input }) => (
  <Field label={label} error={error} hint={hint}>
    {({ id, describedBy, invalid }) => (
      <select id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} style={{ ...inputStyle, ...(invalid ? inputErrorStyle : null) }} {...input}>
        {children}
      </select>
    )}
  </Field>
);

export const Notice: React.FC<{ tone: NoticeTone; children: React.ReactNode }> = ({ tone, children }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} style={noticeStyle(tone)}>
    {tone === 'info' ? <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

interface ReasonFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Server "sabab yaroqsiz" desa (masalan boshqa tekshiruv) */
  serverError?: string;
}

/**
 * Majburiy sabab. Hali yozilmagan bo'lsa qizil xato EMAS — ko'rsatma (foydalanuvchi endi yozayotgan);
 * qisqa yoki uzun bo'lsa xato. Tayyor sabablar bir bosishda to'ldiradi (telefonda yozishni kamaytiradi), keyin tahrirlanadi.
 */
export const ReasonField: React.FC<ReasonFieldProps> = ({ value, onChange, serverError }) => {
  const state = reasonState(value);
  const error = serverError || reasonMessage(state, t);
  const trimmed = value.trim().length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <TextAreaInput
        label={t("O'zgartirish sababi (Majburiy)")}
        value={value}
        rows={2}
        maxLength={REASON_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('Masalan: chekdagi summa boshqa ekan')}
        error={error || undefined}
        hint={t("Pul hisobida har o'zgarish sabab bilan saqlanadi va keyin o'chirilmaydi.")}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {[t('Adashib kiritilgan edi'), t("Chek bo'yicha tuzatildi"), t("Kelishuv o'zgargan")].map((preset) => (
          <button key={preset} type="button" onClick={() => onChange(preset)} style={chipStyle(value.trim() === preset)}>
            {preset}
          </button>
        ))}
        <span style={{ ...hintStyle, margin: '0 0 0 auto' }} aria-hidden="true">
          {t('{n} / {max}', { n: trimmed, max: REASON_MAX })}
        </span>
      </div>
    </div>
  );
};

/** Bitta o'zgargan maydon: eski (chizilgan, qizil) -> yangi (qalin, yashil). Rangdan tashqari strelka va ekran o'quvchi matni ham bor. */
export const ChangeRow: React.FC<{ line: ChangeLine }> = ({ line }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{line.label}</span>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 8px', fontSize: '15px', overflowWrap: 'anywhere' }}>
      <span style={{ color: 'var(--accent-rose)', textDecoration: 'line-through' }}>
        <span style={visuallyHidden}>{t('Oldin')}: </span>
        {line.before}
      </span>
      <ArrowRight size={16} aria-hidden="true" style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
        <span style={visuallyHidden}>{t('Endi')}: </span>
        {line.after}
      </span>
    </div>
  </div>
);

interface SummaryProps {
  lines: ChangeLine[];
  /** Hisobotlarga ta'sir ("Jami chiqim 25 000 so'm ga ko'payadi") */
  impact?: string | null;
  /** Qo'shimcha ogohlantirish (masalan qarz holati o'zgarishi) */
  warning?: string | null;
}

/** "Nima o'zgaradi": faqat o'zgargan maydonlar. Hech narsa o'zgarmagan bo'lsa — tushuntirish. */
export const ChangeSummary: React.FC<SummaryProps> = ({ lines, impact, warning }) => (
  <section aria-label={t("Nima o'zgaradi")} style={panelStyle}>
    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{t("Nima o'zgaradi")}</h4>
    {lines.length === 0 ? (
      <p style={{ ...hintStyle, margin: 0 }}>{t("Hali hech narsa o'zgartirilmadi")}</p>
    ) : (
      <>
        {lines.map((line) => (
          <ChangeRow key={line.field} line={line} />
        ))}
        {impact && <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{impact}</p>}
        {warning && <Notice tone="warn">{warning}</Notice>}
      </>
    )}
  </section>
);
