/**
 * Xodim profili: shaxsiy ma'lumot va login qoralamasi, tekshiruv va "faqat o'zgargan maydonlar" farqi. SOF mantiq
 * (React yo'q, hech narsa import qilinmaydi) — `node --test` bilan sinaladi.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
const USERNAME_RE = /^[A-Za-z0-9_.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d(][\d\s()-]*$/;

export const NAME_MAX = 150;
export const PHONE_MAX = 20;
export const EMAIL_MAX = 254;

export interface PersonalValues {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export type PersonalErrors = Partial<Record<keyof PersonalValues, 'too_long' | 'phone' | 'email'>>;

/** Server obyektidan ism/familiya. Eski javobda faqat `full_name` bo'ladi (u ismsiz xodimda loginga teng). */
export function nameParts(source: {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  username?: string | null;
}): { first: string; last: string } {
  if (typeof source.first_name === 'string' || typeof source.last_name === 'string') {
    return { first: (source.first_name ?? '').trim(), last: (source.last_name ?? '').trim() };
  }
  const full = (source.full_name ?? '').trim();
  if (!full || full === (source.username ?? '').trim()) return { first: '', last: '' };
  const [first, ...rest] = full.split(/\s+/);
  return { first, last: rest.join(' ') };
}

export function personalFromStaff(source: Parameters<typeof nameParts>[0] & { phone?: string | null; email?: string | null }): PersonalValues {
  const { first, last } = nameParts(source);
  return { first_name: first, last_name: last, phone: (source.phone ?? '').trim(), email: (source.email ?? '').trim() };
}

function trimmed(values: PersonalValues): PersonalValues {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
  };
}

/** Mijoz tomonidagi tekshiruv (yordam; haqiqiy qaror serverda). Bo'sh maydon xato emas: hammasi ixtiyoriy. */
export function validatePersonal(values: PersonalValues): PersonalErrors {
  const v = trimmed(values);
  const errors: PersonalErrors = {};
  if (v.first_name.length > NAME_MAX) errors.first_name = 'too_long';
  if (v.last_name.length > NAME_MAX) errors.last_name = 'too_long';
  if (v.phone) {
    if (v.phone.length > PHONE_MAX) errors.phone = 'too_long';
    else if (!PHONE_RE.test(v.phone) || v.phone.replace(/\D/g, '').length < 7) errors.phone = 'phone';
  }
  if (v.email) {
    if (v.email.length > EMAIL_MAX) errors.email = 'too_long';
    else if (!EMAIL_RE.test(v.email)) errors.email = 'email';
  }
  return errors;
}

/** Faqat o'zgargan shaxsiy maydonlar (bo'sh joylari kesilgan). Hech narsa o'zgarmasa — bo'sh obyekt. */
export function diffPersonal(saved: PersonalValues, draft: PersonalValues): Partial<PersonalValues> {
  const a = trimmed(saved);
  const b = trimmed(draft);
  const patch: Partial<PersonalValues> = {};
  (Object.keys(b) as (keyof PersonalValues)[]).forEach((key) => {
    if (a[key] !== b[key]) patch[key] = b[key];
  });
  return patch;
}

export type UsernameIssue = 'empty' | 'short' | 'long' | 'chars';

/** Login yaroqliligi: 3-30 belgi, faqat lotin harf, raqam va `_ . -`. */
export function checkUsername(username: string): UsernameIssue | null {
  const value = username.trim();
  if (!value) return 'empty';
  if (value.length < USERNAME_MIN) return 'short';
  if (value.length > USERNAME_MAX) return 'long';
  if (!USERNAME_RE.test(value)) return 'chars';
  return null;
}

export interface UsernameDecision {
  /** Login haqiqatan o'zgargan (bo'sh joylarsiz). */
  changed: boolean;
  /** Mijoz tekshiruvi (o'zgarmagan login qayta tekshirilmaydi: eski uzun loginlar buzilmasin). */
  issue: UsernameIssue | null;
  /** Serverga ketadigan qiymat (kesilgan). */
  value: string;
}

export function decideUsername(saved: string, draft: string): UsernameDecision {
  const value = draft.trim();
  const changed = value !== saved.trim();
  return { changed, issue: changed ? checkUsername(value) : null, value };
}
