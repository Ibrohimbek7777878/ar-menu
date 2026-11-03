/**
 * Xodim paroli: tasodifiy parol yaratish va kuchini tekshirish. SOF mantiq (React ham, DOM ham yo'q) — `node --test` bilan sinaladi.
 *
 * Tasodifiylik FAQAT `crypto.getRandomValues` dan (xavfsiz); `Math.random` hech qachon ishlatilmaydi. Mavjud bo'lmasa xato tashlanadi
 * (jimgina zaif parol berishdan ko'ra aniq xato yaxshi).
 *
 * Mijozdagi tekshiruv — faqat yordam (tez va tushunarli izoh). Haqiqiy qaror serverda (Django parol qoidalari: kamida 8 belgi, faqat
 * raqam emas, keng tarqalgan parol emas, loginga o'xshamasin); server "kuchsiz" desa, uning xabari maydon yonida ko'rinadi.
 */

export const MIN_PASSWORD_LENGTH = 8;
/** Server `parse_text(..., max_length=128)` */
export const MAX_PASSWORD_LENGTH = 128;
export const DEFAULT_GENERATED_LENGTH = 12;
const MAX_GENERATED_LENGTH = 64;

// O'qiganda adashtiriladigan belgilar yo'q: 0/O, 1/l/I/i.
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS;

/** [0, max) oralig'ida butun son qaytaradigan manba. */
export type RandomInt = (max: number) => number;

/** `crypto.getRandomValues` asosida, tekis taqsimlangan (rejection sampling: `% max` og'ish bermasin). */
export const secureRandomInt: RandomInt = (max) => {
  if (!Number.isInteger(max) || max <= 0 || max > 0x100000000) throw new RangeError('max noto\'g\'ri');
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') throw new Error('Xavfsiz tasodifiy manba mavjud emas');
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    cryptoApi.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);
  return value % max;
};

function pick(source: string, randomInt: RandomInt): string {
  const index = randomInt(source.length);
  if (!Number.isInteger(index) || index < 0 || index >= source.length) throw new RangeError('Tasodifiy manba noto\'g\'ri son berdi');
  return source[index];
}

/**
 * O'qiladigan belgilardan parol: kamida bittadan kichik harf, katta harf va raqam. Uzunlik [8..64] ga keltiriladi
 * (butun bo'lmasa quyiga yaxlitlanadi, son bo'lmasa standart 12).
 */
export function generatePassword(randomInt: RandomInt = secureRandomInt, length: number = DEFAULT_GENERATED_LENGTH): string {
  const wanted = Number.isFinite(length) ? Math.floor(length) : DEFAULT_GENERATED_LENGTH;
  const size = Math.min(MAX_GENERATED_LENGTH, Math.max(MIN_PASSWORD_LENGTH, wanted));

  const chars = [pick(LOWER, randomInt), pick(UPPER, randomInt), pick(DIGITS, randomInt)];
  while (chars.length < size) chars.push(pick(ALL, randomInt));

  // Fisher-Yates: majburiy uch belgi doim boshida turmasin
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw new RangeError('Tasodifiy manba noto\'g\'ri son berdi');
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Tugma uchun: yaratilgan parol mijoz tekshiruvidan o'tishi kafolatlanadi (juda kam hollarda login bo'lagi tasodifan
 * parolga tushsa, qayta yaratiladi). Tasodifiy manba buzuq bo'lsa, xato tashlaydi.
 */
export function generateValidPassword(username = '', randomInt: RandomInt = secureRandomInt): string {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generatePassword(randomInt);
    if (checkPassword(candidate, username).ok) return candidate;
  }
  throw new Error('Mos parol yaratib bo\'lmadi');
}

export type PasswordIssue ='short' | 'long' | 'spaces' | 'numeric' | 'common' | 'similar';
export type StrengthLevel = 'empty' | 'weak' | 'fair' | 'strong';

export interface PasswordCheck {
  level: StrengthLevel;
  /** Server rad etadigan sabablar (bo'sh = o'rnatish mumkin). */
  issues: PasswordIssue[];
  /** O'rnatishga yaroqli (mijoz tomonida). */
  ok: boolean;
}

/** Eng tarqalgan parollarning qisqa ro'yxati (Django ro'yxatining kichik qismi: to'liq tekshiruv serverda). */
const COMMON = new Set([
  'password', 'password1', 'password123', 'qwertyui', 'qwerty123', 'qwertyuiop', 'asdfghjk', 'zxcvbnm1',
  '12345678', '123456789', '1234567890', '11111111', '00000000', '87654321', 'abc12345', 'iloveyou',
  'admin123', 'welcome1', 'parol123', 'parol1234', 'restoran', 'restoran1', 'restoran123', 'ofitsiant',
]);

function classCount(password: string): number {
  let count = 0;
  if (/[a-z]/.test(password)) count += 1;
  if (/[A-Z]/.test(password)) count += 1;
  if (/\d/.test(password)) count += 1;
  if (/[^A-Za-z0-9]/.test(password)) count += 1;
  return count;
}

/** Parol login'ga o'xshaydimi (kamida 3 belgili login parol ichida yoki parol login ichida bo'lsa). */
function similarToUsername(password: string, username: string): boolean {
  const login = username.trim().toLowerCase();
  if (login.length < 3) return false;
  const value = password.toLowerCase();
  return value.includes(login) || (value.length >= 3 && login.includes(value));
}

export function checkPassword(password: string, username = ''): PasswordCheck {
  if (!password) return { level: 'empty', issues: [], ok: false };

  const issues: PasswordIssue[] = [];
  if (password !== password.trim()) issues.push('spaces');
  if (password.length < MIN_PASSWORD_LENGTH) issues.push('short');
  if (password.length > MAX_PASSWORD_LENGTH) issues.push('long');
  if (/^\d+$/.test(password)) issues.push('numeric');
  if (COMMON.has(password.toLowerCase())) issues.push('common');
  if (similarToUsername(password, username)) issues.push('similar');

  if (issues.length > 0) return { level: 'weak', issues, ok: false };
  const strong = password.length >= 12 && classCount(password) >= 3;
  return { level: strong ? 'strong' : 'fair', issues, ok: true };
}
