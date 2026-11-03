/**
 * Profil, 2-bo'lim: kirish. Login tahriri (o'zgarishdan oldin tasdiq), yangi parol o'rnatish (o'zi yozadi yoki tasodifiy yaratadi),
 * kirish havolasi (`StaffAccess`) va serverga tasodifiy parol yaratishni topshiruvchi "Parolni almashtirish".
 * Yangi parol serverga ketadi va muvaffaqiyatda BIR MARTA ko'rsatiladi (`StaffCredentials`); bu yerda saqlanmaydi.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Button, t, useToast } from '@admins/shared';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import type { StaffItem } from './api';
import { checkPassword, generateValidPassword } from './password';
import type { PasswordCheck, PasswordIssue, StrengthLevel } from './password';
import { decideUsername, USERNAME_MAX, USERNAME_MIN } from './profileForm';
import type { UsernameIssue } from './profileForm';
import { readProfileError } from './profileErrors';
import { profileErrorText } from './profileMessages';
import { TAP, buttonTap, cardStyle, cardTitleStyle, fieldsetCardStyle, formResetStyle, hintStyle, panelStyle } from './profileStyles';
import { Notice, TextField } from './profileUi';
import { StaffAccess } from './StaffAccess';

interface Props {
  staff: StaffItem;
  restaurantName: string;
  isSelf: boolean;
  /** Bu xodimning login/parolini hozirgi foydalanuvchi o'zgartira olmaydi (faqat egasi): maydonlar faqat o'qiladi. */
  readOnly: boolean;
  onSaveUsername: (username: string) => Promise<unknown>;
  /** Parolni serverga yuboradi (o'zingiz uchun joriy parol bilan); muvaffaqiyatda tegishli oyna/xabar chiqadi. Xato bo'lsa tashlaydi. */
  onSetPassword: (password: string, currentPassword?: string) => Promise<void>;
  /** Mavjud "Parolni almashtirish" (server tasodifiy parol yaratadi). */
  onServerReset: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

function usernameIssueText(issue: UsernameIssue): string {
  switch (issue) {
    case 'empty':
      return t('Loginni yozing');
    case 'short':
      return t("Login kamida {n} ta belgidan iborat bo'lsin", { n: USERNAME_MIN });
    case 'long':
      return t('Login {n} ta belgidan oshmasin', { n: USERNAME_MAX });
    default:
      return t('Faqat lotin harflari, raqam va _ . - belgilari mumkin');
  }
}

function passwordIssueText(issue: PasswordIssue): string {
  switch (issue) {
    case 'short':
      return t("Parol kamida 8 ta belgidan iborat bo'lsin");
    case 'long':
      return t('Parol 128 ta belgidan oshmasin');
    case 'spaces':
      return t("Parol boshida va oxirida bo'sh joy bo'lmasin");
    case 'numeric':
      return t("Parol faqat raqamlardan iborat bo'lmasin");
    case 'common':
      return t('Bu parol juda oddiy, boshqasini tanlang');
    default:
      return t("Parol loginga o'xshash bo'lmasin");
  }
}

const STRENGTH_BARS: Record<StrengthLevel, { bars: number; color: string }> = {
  empty: { bars: 0, color: 'var(--border-strong)' },
  weak: { bars: 1, color: 'var(--accent-rose)' },
  fair: { bars: 2, color: 'var(--accent-amber)' },
  strong: { bars: 3, color: 'var(--accent-emerald)' },
};

function strengthLabel(level: StrengthLevel): string {
  if (level === 'weak') return t('Kuchsiz');
  if (level === 'fair') return t("O'rtacha");
  if (level === 'strong') return t('Kuchli');
  return '';
}

const StrengthMeter: React.FC<{ check: PasswordCheck }> = ({ check }) => {
  const { bars, color } = STRENGTH_BARS[check.level];
  if (check.level === 'empty') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} aria-live="polite">
      <div aria-hidden="true" style={{ display: 'flex', gap: '4px', flex: '0 0 96px' }}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            style={{
              flex: 1,
              height: '6px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: n <= bars ? color : 'var(--border-strong)',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        {t('Parol kuchi')}: <strong style={{ color: 'var(--text-main)' }}>{strengthLabel(check.level)}</strong>
      </span>
    </div>
  );
};

export const ProfileLogin: React.FC<Props> = ({
  staff,
  restaurantName,
  isSelf,
  readOnly,
  onSaveUsername,
  onSetPassword,
  onServerReset,
  onDirtyChange,
}) => {
  const { showToast } = useToast();

  // ─── Login ───
  const [username, setUsername] = useState(staff.username);
  const [baseUsername, setBaseUsername] = useState(staff.username);
  const [usernameError, setUsernameError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  if (baseUsername !== staff.username) {
    setBaseUsername(staff.username);
    setUsername(staff.username);
    setUsernameError('');
    setConfirming(false);
  }
  const decision = decideUsername(staff.username, username);

  // ─── Parol ───
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [currentError, setCurrentError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const check = checkPassword(password, staff.username);

  const dirty = decision.changed || password.length > 0 || currentPassword.length > 0;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const submitUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decision.changed || savingUsername) return;
    if (decision.issue) {
      setUsernameError(usernameIssueText(decision.issue));
      return;
    }
    setConfirming(true);
  };

  const confirmUsername = async () => {
    setSavingUsername(true);
    try {
      await onSaveUsername(decision.value);
      showToast(t('Login yangilandi: {name}', { name: decision.value }), 'success');
      setConfirming(false);
    } catch (err: unknown) {
      const problem = readProfileError(err);
      setUsernameError(profileErrorText(problem));
      setConfirming(false);
    } finally {
      setSavingUsername(false);
    }
  };

  const generate = () => {
    try {
      setPassword(generateValidPassword(staff.username));
      setShowPassword(true);
      setPasswordError('');
      setTouched(false);
    } catch {
      showToast(t("Parol yaratib bo'lmadi. Uni o'zingiz yozing."), 'error');
    }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settingPassword) return;
    setTouched(true);
    if (!check.ok) {
      passwordRef.current?.focus();
      return;
    }
    setSettingPassword(true);
    setPasswordError('');
    setCurrentError('');
    try {
      await onSetPassword(password, isSelf ? currentPassword : undefined);
      setPassword('');
      setCurrentPassword('');
      setShowPassword(false);
      setTouched(false);
      // O'zingizning parolingiz: bir martalik parol oynasi kerak emas (o'zingiz yozgansiz)
      if (isSelf) showToast(t('Parolingiz yangilandi'), 'success');
    } catch (err: unknown) {
      const problem = readProfileError(err);
      const text = profileErrorText(problem);
      if (problem.field === 'current_password') setCurrentError(text);
      else setPasswordError(text);
    } finally {
      setSettingPassword(false);
    }
  };

  const issues = check.issues.map(passwordIssueText);
  const showIssues = issues.length > 0 && (touched || check.issues.some((i) => i !== 'short'));

  return (
    <div style={panelStyle}>
      {/* Login */}
      <form onSubmit={submitUsername} noValidate style={formResetStyle}>
        <fieldset disabled={readOnly} style={fieldsetCardStyle}>
          <h4 style={cardTitleStyle}>{t('Login')}</h4>
          <TextField
            id="staff-username"
            label={t('Kirish uchun login')}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError('');
              setConfirming(false);
            }}
            error={usernameError}
            hint={t('{min}-{max} ta belgi: lotin harflari, raqam, _ . -', { min: USERNAME_MIN, max: USERNAME_MAX })}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={150}
          />
          {confirming && (
            <Notice tone="warn">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span>
                  {t("Login «{from}» dan «{to}» ga o'zgaradi. Eski login ishlamaydi: xodimga yangi loginni yuboring.", {
                    from: staff.username,
                    to: decision.value,
                  })}
                  {isSelf ? ` ${t('Bu sizning loginingiz: keyingi safar yangi login bilan kirasiz.')}` : ''}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <Button type="button" variant="primary" onClick={confirmUsername} disabled={savingUsername} style={buttonTap}>
                    {savingUsername ? t('Saqlanmoqda...') : t("Ha, o'zgartirish")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={savingUsername} style={buttonTap}>
                    {t('Bekor qilish')}
                  </Button>
                </div>
              </div>
            </Notice>
          )}
          {!confirming && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <Button type="submit" variant="primary" disabled={!decision.changed || savingUsername} style={{ ...buttonTap, flex: '1 1 160px' }}>
                {t('Loginni saqlash')}
              </Button>
              {decision.changed && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setUsername(staff.username);
                    setUsernameError('');
                  }}
                  style={buttonTap}
                >
                  {t('Qaytarish')}
                </Button>
              )}
            </div>
          )}
        </fieldset>
      </form>

      {/* Yangi parol */}
      <form onSubmit={submitPassword} noValidate style={formResetStyle}>
        <fieldset disabled={readOnly} style={fieldsetCardStyle}>
          <h4 style={cardTitleStyle}>{t('Parol')}</h4>
          {isSelf && (
            <TextField
              id="staff-current-password"
              label={t('Joriy parolingiz')}
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setCurrentError('');
              }}
              error={currentError}
              hint={t("O'z parolingizni almashtirish uchun joriy parolni kiriting")}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={160}
            />
          )}
          <TextField
            id="staff-new-password"
            inputRef={passwordRef}
            label={t('Yangi parol')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError('');
            }}
            onBlur={() => setTouched(true)}
            error={passwordError}
            warning={showIssues ? issues.join('. ') : ''}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={160}
            endSlot={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('Parolni yashirish') : t("Parolni ko'rsatish")}
                aria-pressed={showPassword}
                style={{
                  width: TAP,
                  height: TAP,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
          <StrengthMeter check={check} />
          <p style={{ ...hintStyle, margin: 0 }}>
            {isSelf
              ? t('Joriy sessiyangiz saqlanadi, boshqa qurilmalardagi sessiyalaringiz tugaydi.')
              : t("Parol faqat bir marta ko'rsatiladi: uni xodimga yuborishni unutmang. Xodimning ochiq sessiyalari tugaydi, u yangi parol bilan qayta kiradi.")}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <Button type="button" variant="secondary" onClick={generate} disabled={settingPassword} style={{ ...buttonTap, flex: '1 1 150px' }}>
              <Sparkles size={18} />
              {t('Tasodifiy yaratish')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={password.length === 0 || (isSelf && currentPassword.length === 0) || settingPassword}
              style={{ ...buttonTap, flex: '1 1 150px' }}
            >
              {settingPassword ? t('Saqlanmoqda...') : t("Parolni o'rnatish")}
            </Button>
          </div>
        </fieldset>
      </form>

      {/* Kirish havolasi va serverga tasodifiy parol yaratish ("Parolni almashtirish") */}
      <div style={cardStyle}>
        <StaffAccess staff={staff} restaurantName={restaurantName} onChangePassword={readOnly ? undefined : onServerReset} />
      </div>
    </div>
  );
};
