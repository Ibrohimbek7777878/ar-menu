import React, { useMemo, useState } from 'react';
import { Button, Modal, t } from '@admins/shared';
import { Dices, Eye, EyeOff, Loader2, CheckCircle2, CircleAlert } from 'lucide-react';
import { createTenant } from './api';
import type { CreatedTenant } from './api';
import { BUSINESS_TYPES, businessLabel, loginProblemText, passwordIssueText, subdomainProblemText } from './labels';
import { cleanSubdomainInput, suggestOwnerLogin, suggestSubdomain, tenantHost, validateOwnerLogin, validateSubdomain } from './subdomain';
import { useSubdomainCheck } from './useSubdomainCheck';
import { TAP, errorTextStyle, hintStyle, inputStyle, tapButton, toggleChipStyle } from './styles';
import { ModalBody, Notice, TextField } from '../Bookings/ui';
import { readFailure } from '../Bookings/errors';
import { checkPassword, generateValidPassword } from '../Staff/password';

interface Props {
  /** Platforma domeni ("menu.uz"): "mijoz.domen" ko'rinishi uchun */
  domain: string;
  onClose: () => void;
  /** Yaratildi: server javobi va egasiga ko'rsatiladigan parol (o'zimiz yozgan yoki server yaratgan) */
  onCreated: (created: CreatedTenant, password: string, name: string) => void;
}

type ServerErrors = Partial<Record<'name' | 'subdomain' | 'owner_username' | 'owner_password' | 'phone' | 'business_type', string>>;

const NAME_MAX = 80;

/** Server `field` nomini forma maydoniga bog'laydi (noma'lum -> umumiy xato) */
function fieldOf(field: string): keyof ServerErrors | null {
  const key = field.trim().toLowerCase();
  if (key === 'name' || key === 'subdomain' || key === 'phone' || key === 'business_type') return key;
  if (key === 'owner_username' || key === 'username') return 'owner_username';
  if (key === 'owner_password' || key === 'password') return 'owner_password';
  return null;
}

/**
 * [+ Yangi mijoz] oynasi: nom, subdomen (yozganda jonli tekshiruv, "mijoz.domen" ko'rinishi), biznes turi, ega logini (nomdan taklif)
 * va parol (bo'sh = server tasodifiy yaratadi; "Tasodifiy yaratish" — shu yerda yaratib ko'rsatadi).
 * Nomdan subdomen va login avtomatik taklif qilinadi, foydalanuvchi o'zi o'zgartirgach taklif to'xtaydi.
 */
export const CreateTenantModal: React.FC<Props> = ({ domain, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [businessType, setBusinessType] = useState<string>('restaurant');
  const [login, setLogin] = useState('');
  const [loginTouched, setLoginTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});
  const [general, setGeneral] = useState('');

  const check = useSubdomainCheck(subdomain);

  const nameProblem = name.trim() === '' ? t('Nomini yozing') : Array.from(name.trim()).length > NAME_MAX ? t('Juda uzun: {max} ta belgidan oshmasin', { max: NAME_MAX }) : '';
  const loginProblemCode = validateOwnerLogin(login);
  const passwordCheck = useMemo(() => (password ? checkPassword(password, login) : null), [password, login]);
  const passwordProblem = passwordCheck && !passwordCheck.ok ? passwordCheck.issues.map(passwordIssueText).join('. ') : '';
  const subdomainProblemCode = validateSubdomain(subdomain);
  const passwordMessage = serverErrors.owner_password ?? (submitted && passwordProblem ? passwordProblem : undefined);

  const subdomainMessage =
    serverErrors.subdomain ??
    (check.status === 'invalid' && (submitted || subdomain) ? subdomainProblemText(check.problem) : check.status === 'taken' ? (check.reason ? t(check.reason) : t('Bu subdomen band. Boshqasini tanlang')) : submitted && subdomainProblemCode ? subdomainProblemText(subdomainProblemCode) : undefined);

  const changeName = (value: string) => {
    setName(value);
    setServerErrors((current) => ({ ...current, name: undefined }));
    if (!subdomainTouched) setSubdomain(suggestSubdomain(value));
    if (!loginTouched) setLogin(suggestOwnerLogin(value));
  };

  const blocked = nameProblem !== '' || subdomainProblemCode !== null || check.status === 'taken' || check.status === 'checking' || loginProblemCode !== null || passwordProblem !== '';

  const submit = async () => {
    setSubmitted(true);
    if (blocked) return;
    setBusy(true);
    setServerErrors({});
    setGeneral('');
    try {
      const payload = {
        name: name.trim(),
        subdomain,
        business_type: businessType,
        owner_username: login,
        ...(password ? { owner_password: password } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      };
      const created = await createTenant(payload);
      onCreated(created, password || created.generated_password, name.trim());
    } catch (err: unknown) {
      const failure = readFailure(err);
      const field = fieldOf(failure.field);
      const message = failure.forbidden ? t("Mijoz qo'shishga ruxsatingiz yo'q") : failure.message ? t(failure.message) : failure.slotTaken ? t('Bu subdomen band. Boshqasini tanlang') : t("Saqlab bo'lmadi. Qayta urinib ko'ring.");
      if (field) setServerErrors({ [field]: message });
      else setGeneral(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen title={t('Yangi mijoz')} onClose={busy ? () => undefined : onClose} maxWidth="560px">
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
            <TextField
              label={t('Mijoz nomi')}
              value={name}
              autoComplete="off"
              placeholder={t('Masalan: Guliston restorani')}
              error={serverErrors.name ?? (submitted && nameProblem ? nameProblem : undefined)}
              onChange={(event) => changeName(event.target.value)}
            />

            <div>
              <TextField
                label={t('Subdomen')}
                value={subdomain}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={40}
                placeholder="guliston"
                error={subdomainMessage}
                onChange={(event) => {
                  setSubdomainTouched(true);
                  setServerErrors((current) => ({ ...current, subdomain: undefined }));
                  setSubdomain(cleanSubdomainInput(event.target.value));
                }}
              />
              {subdomain && (
                <p style={{ ...hintStyle, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }} role="status">
                  <code style={{ color: 'var(--text-main)', overflowWrap: 'anywhere' }}>{tenantHost(subdomain, domain)}</code>
                  {check.status === 'checking' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Loader2 size={14} aria-hidden="true" style={{ animation: 'spin 0.8s linear infinite' }} /> {t('Tekshirilmoqda...')}
                    </span>
                  )}
                  {check.status === 'available' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      <CheckCircle2 size={14} aria-hidden="true" /> {t("Bo'sh, olish mumkin")}
                    </span>
                  )}
                  {check.status === 'error' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent-amber)' }}>
                      <CircleAlert size={14} aria-hidden="true" /> {t("Hozir tekshirib bo'lmadi. Yaratishda tizim yana tekshiradi.")}
                    </span>
                  )}
                </p>
              )}
              <p style={hintStyle}>{t("Subdomen keyin o'zgartirib bo'lmaydi. Lotin harflari, raqam va chiziqcha (3-40 ta belgi).")}</p>
            </div>

            <fieldset style={{ margin: 0, padding: 0, border: 'none', minWidth: 0 }}>
              <legend style={{ padding: 0, marginBottom: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{t('Biznes turi')}</legend>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BUSINESS_TYPES.map((type) => (
                  <button key={type} type="button" aria-pressed={businessType === type} onClick={() => setBusinessType(type)} style={toggleChipStyle(businessType === type)}>
                    {businessLabel(type)}
                  </button>
                ))}
              </div>
              {serverErrors.business_type && (
                <p role="alert" style={errorTextStyle}>
                  {serverErrors.business_type}
                </p>
              )}
            </fieldset>

            <TextField
              label={t('Ega logini')}
              value={login}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={40}
              placeholder="guliston_ega"
              hint={t('Ega shu login bilan kiradi. Nomdan avtomatik taklif qilindi, o\'zgartirishingiz mumkin.')}
              error={serverErrors.owner_username ?? (submitted && loginProblemCode ? loginProblemText(loginProblemCode) : undefined)}
              onChange={(event) => {
                setLoginTouched(true);
                setServerErrors((current) => ({ ...current, owner_username: undefined }));
                setLogin(event.target.value.trim());
              }}
            />

            <div>
              <label htmlFor="tenant-password" style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                {t('Parol (ixtiyoriy)')}
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
                  <input
                    id="tenant-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(passwordMessage) || undefined}
                    aria-describedby="tenant-password-msg"
                    onChange={(event) => {
                      setServerErrors((current) => ({ ...current, owner_password: undefined }));
                      setPassword(event.target.value);
                    }}
                    style={{ ...inputStyle, paddingRight: TAP + 4 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t('Parolni yashirish') : t("Parolni ko'rsatish")}
                    aria-pressed={showPassword}
                    style={{ position: 'absolute', top: 0, right: 0, width: TAP, height: TAP, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    try {
                      setPassword(generateValidPassword(login));
                      setShowPassword(true);
                      setServerErrors((current) => ({ ...current, owner_password: undefined }));
                    } catch {
                      setGeneral(t("Tasodifiy parol yaratib bo'lmadi. Parolni o'zingiz yozing."));
                    }
                  }}
                  style={tapButton}
                >
                  <Dices size={18} aria-hidden="true" />
                  {t('Tasodifiy yaratish')}
                </Button>
              </div>
              {passwordMessage ? (
                <p id="tenant-password-msg" role="alert" style={errorTextStyle}>
                  {passwordMessage}
                </p>
              ) : (
                <p id="tenant-password-msg" style={hintStyle}>
                  {t("Bo'sh qoldirsangiz, tizim o'zi tasodifiy parol yaratadi va yaratilgach bir marta ko'rsatadi.")}
                </p>
              )}
            </div>

            <TextField
              label={t('Telefon (ixtiyoriy)')}
              type="tel"
              inputMode="tel"
              value={phone}
              autoComplete="off"
              maxLength={32}
              placeholder="+998 90 123 45 67"
              error={serverErrors.phone}
              onChange={(event) => {
                setServerErrors((current) => ({ ...current, phone: undefined }));
                setPhone(event.target.value);
              }}
            />
          </fieldset>

          {general && <Notice tone="error">{general}</Notice>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy} style={tapButton}>
              {t('Bekor qilish')}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={submitted && blocked} style={tapButton}>
              {t('Mijoz yaratish')}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
};
