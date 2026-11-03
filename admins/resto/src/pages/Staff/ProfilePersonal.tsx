/**
 * Profil, 1-bo'lim: shaxsiy ma'lumotlar (ism, familiya, telefon, email). Faqat o'zgargan maydonlar PATCH'ga ketadi.
 */
import React, { useEffect, useState } from 'react';
import { Button, t, useToast } from '@admins/shared';
import type { StaffItem, StaffPatch } from './api';
import { diffPersonal, personalFromStaff, validatePersonal, EMAIL_MAX, NAME_MAX, PHONE_MAX } from './profileForm';
import type { PersonalErrors, PersonalValues } from './profileForm';
import { readProfileError } from './profileErrors';
import { profileErrorText } from './profileMessages';
import { buttonTap, formResetStyle, panelStyle, stickyBarStyle } from './profileStyles';
import { Notice, TextField } from './profileUi';

interface Props {
  staff: StaffItem;
  /** Bu xodimni hozirgi foydalanuvchi o'zgartira olmaydi (faqat egasi): maydonlar faqat o'qiladi. */
  readOnly: boolean;
  onSave: (patch: StaffPatch) => Promise<StaffItem>;
  onDirtyChange: (dirty: boolean) => void;
}

type FieldMessages = Partial<Record<keyof PersonalValues, string>>;

function clientMessages(errors: PersonalErrors): FieldMessages {
  const out: FieldMessages = {};
  (Object.keys(errors) as (keyof PersonalValues)[]).forEach((key) => {
    const code = errors[key];
    if (code === 'too_long') out[key] = t('Juda uzun matn');
    else if (code === 'phone') out[key] = t('Telefon raqamini tekshiring (masalan, +998901234567)');
    else if (code === 'email') out[key] = t('Email manzilini tekshiring (masalan, ali@mail.uz)');
  });
  return out;
}

export const ProfilePersonal: React.FC<Props> = ({ staff, readOnly, onSave, onDirtyChange }) => {
  const { showToast } = useToast();
  const saved = personalFromStaff(staff);
  const savedKey = JSON.stringify(saved);

  const [draft, setDraft] = useState<PersonalValues>(saved);
  const [base, setBase] = useState(savedKey);
  const [errors, setErrors] = useState<FieldMessages>({});
  const [generalError, setGeneralError] = useState('');
  const [saving, setSaving] = useState(false);

  // Server yangi qiymat bergach (saqlangandan keyin) qoralama yangilanadi; boshqa bo'limdagi saqlash bunga tegmaydi
  if (base !== savedKey) {
    setBase(savedKey);
    setDraft(saved);
    setErrors({});
  }

  const patch = diffPersonal(saved, draft);
  const dirty = Object.keys(patch).length > 0;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const change = (key: keyof PersonalValues, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setGeneralError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty || saving) return;
    const invalid = clientMessages(validatePersonal(draft));
    if (Object.keys(invalid).length > 0) {
      setErrors(invalid);
      return;
    }
    setSaving(true);
    setGeneralError('');
    try {
      await onSave(patch);
      showToast(t('"{name}" ma\'lumotlari yangilandi', { name: [draft.first_name, draft.last_name].join(' ').trim() || staff.username }), 'success');
    } catch (err: unknown) {
      const problem = readProfileError(err);
      const text = profileErrorText(problem);
      if (problem.field === 'first_name' || problem.field === 'last_name' || problem.field === 'phone' || problem.field === 'email') {
        setErrors({ [problem.field]: text });
      } else {
        setGeneralError(text);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={formResetStyle}>
      <fieldset disabled={readOnly} style={{ ...panelStyle, border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
        <TextField
          id="staff-first-name"
          label={t('Ism')}
          value={draft.first_name}
          onChange={(e) => change('first_name', e.target.value)}
          error={errors.first_name}
          maxLength={NAME_MAX}
          autoComplete="off"
          autoCapitalize="words"
          placeholder="Ali"
        />
        <TextField
          id="staff-last-name"
          label={t('Familiya')}
          value={draft.last_name}
          onChange={(e) => change('last_name', e.target.value)}
          error={errors.last_name}
          maxLength={NAME_MAX}
          autoComplete="off"
          autoCapitalize="words"
          placeholder="Valiyev"
        />
        <TextField
          id="staff-phone"
          label={t('Telefon raqami')}
          type="tel"
          inputMode="tel"
          value={draft.phone}
          onChange={(e) => change('phone', e.target.value)}
          error={errors.phone}
          maxLength={PHONE_MAX}
          autoComplete="off"
          placeholder="+998901234567"
        />
        <TextField
          id="staff-email"
          label={t('Email')}
          type="email"
          inputMode="email"
          value={draft.email}
          onChange={(e) => change('email', e.target.value)}
          error={errors.email}
          maxLength={EMAIL_MAX}
          autoComplete="off"
          autoCapitalize="none"
          placeholder="ali@mail.uz"
        />

        {generalError && <Notice tone="error">{generalError}</Notice>}

        {!readOnly && (
          <div style={stickyBarStyle}>
            <Button type="submit" variant="primary" disabled={!dirty || saving} style={{ ...buttonTap, flex: '1 1 160px' }}>
              {saving ? t('Saqlanmoqda...') : t('Saqlash')}
            </Button>
            {dirty && !saving && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(saved);
                  setErrors({});
                  setGeneralError('');
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
  );
};
