/**
 * Xodimga kirish ma'lumotini yuborish: SOF mantiq (React ham, brauzer API'si ham yo'q) — `node --test` bilan sinaladi.
 *
 * Bu fayl boshqa modullardan hech narsa import qilmaydi (node uzantisiz import'ni hal qila olmaydi), shuning uchun
 * rol nomi, restoran nomi va matnlar tayyor holda keladi. Brauzerga bog'liq qismlar (`navigator.clipboard`,
 * `document.execCommand`, `navigator.share`) — `accessBrowser.ts` da; bu yerga ular parametr (`CopyEnv`) sifatida beriladi.
 *
 * PAROL QOIDASI: parol faqat xabar matniga (egasi "Parolni xabarga qo'shish" ni yoqqanda) tushadi. U hech qachon
 * kirish havolasiga, Telegram havolasiga (`t.me/share/url?...`) yoki logga yozilmaydi.
 */

export interface InviteInput {
  /** Xodim ismi: to'liq ism, bo'lmasa login. Salomlashishda birinchi so'zi olinadi. */
  name: string;
  /** Restoran nomi; bo'sh bo'lsa "restoran". */
  restaurant: string;
  /** Lavozim kichik harfda: "ofitsiant", "oshpaz". */
  roleTitle: string;
  loginUrl: string;
  username: string;
  /** Faqat egasi parolni xabarga qo'shishni yoqqan bo'lsa beriladi. */
  password?: string;
}

/** Tarjima funksiyasi (`t` from @admins/shared). Bu fayl hech narsa import qilmaydi, shuning uchun u tashqaridan beriladi. */
export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Tarjima berilmasa (testlar, o'zbekcha): kalit — o'zbekcha matnning o'zi, {nom} qiymat bilan to'ldiriladi. */
const uzbek: Translate = (key, params) =>
  key.replace(/\{(\w+)\}/g, (match, name: string) =>
    params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );

export interface MessageOptions {
  /** Xabarga kirish havolasini qo'shish (standart: ha). Telegram havolasida havola alohida `url=` bilan ketadi. */
  withLink?: boolean;
  /** Xabar tili: admin paneli tilida yoziladi (standart: o'zbekcha). */
  t?: Translate;
}

/** "Ali Valiyev" → "Ali". Bo'sh nom → "". */
export function firstName(name: string): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

function greeting(name: string, tr: Translate): string {
  const first = firstName(name);
  return first ? tr('Salom, {name}!', { name: first }) : tr('Salom!');
}

/**
 * Yangi xodimga yuboriladigan tayyor xabar:
 *   Salom, {ism}! Siz {restoran}ga {lavozim} sifatida qo'shildingiz. Kirish: {havola}
 *   Login: {login}
 *   Parol: {parol}          (faqat parol berilsa)
 */
export function buildInviteMessage(input: InviteInput, options: MessageOptions = {}): string {
  const withLink = options.withLink !== false;
  const tr = options.t ?? uzbek;
  const restaurant = (input.restaurant ?? '').trim() || tr('restoran');
  const role = (input.roleTitle ?? '').trim() || tr('xodim');
  const head = `${greeting(input.name, tr)} ${tr("Siz {restaurant}ga {role} sifatida qo'shildingiz.", { restaurant, role })}`;
  const lines = [withLink ? `${head} ${tr('Kirish: {url}', { url: input.loginUrl })}` : head, tr('Login: {login}', { login: input.username })];
  if (input.password) lines.push(tr('Parol: {password}', { password: input.password }));
  return lines.join('\n');
}

/**
 * Mavjud xodimga kirish havolasini qayta yuborish (u allaqachon qo'shilgan, shuning uchun "qo'shildingiz" yo'q;
 * parol almashtirilganda ham shu shakl):
 *   Salom, {ism}! Kirish havolasi ({panel}): {havola}
 *   Login: {login}
 *   Parol: {parol}          (faqat parol berilsa)
 */
export function buildAccessMessage(
  input: Pick<InviteInput, 'name' | 'loginUrl' | 'username' | 'password'> & { panelLabel: string },
  options: MessageOptions = {},
): string {
  const withLink = options.withLink !== false;
  const tr = options.t ?? uzbek;
  const panel = (input.panelLabel ?? '').trim();
  const head = `${greeting(input.name, tr)} ${tr('Kirish havolasi')}${panel ? ` (${panel})` : ''}`;
  const lines = [withLink ? `${head}: ${input.loginUrl}` : `${head}.`, tr('Login: {login}', { login: input.username })];
  if (input.password) lines.push(tr('Parol: {password}', { password: input.password }));
  return lines.join('\n');
}

/** Ulashish uchun ikki xil matn: to'liq (nusxa va tizim ulashishi) va Telegram havolasi uchun (havolasiz, PAROLSIZ). */
export interface ShareTexts {
  full: string;
  plain: string;
}

export function buildShareTexts(
  input: InviteInput & { panelLabel?: string },
  kind: 'invite' | 'access',
  t?: Translate,
): ShareTexts {
  if (kind === 'invite') {
    return {
      full: buildInviteMessage(input, { t }),
      plain: buildInviteMessage({ ...input, password: undefined }, { withLink: false, t }),
    };
  }
  const base = {
    name: input.name,
    loginUrl: input.loginUrl,
    username: input.username,
    panelLabel: input.panelLabel ?? '',
  };
  return {
    full: buildAccessMessage({ ...base, password: input.password }, { t }),
    plain: buildAccessMessage(base, { withLink: false, t }),
  };
}

/** Telegram'da ulashish: `https://t.me/share/url?url=…&text=…`. Matn va havola to'liq kodlanadi. */
export function buildTelegramShareUrl(url: string, text: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export type SharePlan =
  | { kind: 'native'; title: string; text: string }
  | { kind: 'telegram'; url: string };

/**
 * Ulashish yo'li: telefonda `navigator.share` bo'lsa — tizim oynasi (to'liq matn, parol ham o'sha oynada, URL'da emas),
 * bo'lmasa Telegram havolasi (faqat `plain` matn: havolasiz va parolsiz).
 */
export function planShare(args: {
  canNativeShare: boolean;
  title: string;
  loginUrl: string;
  texts: ShareTexts;
}): SharePlan {
  if (args.canNativeShare) return { kind: 'native', title: args.title, text: args.texts.full };
  return { kind: 'telegram', url: buildTelegramShareUrl(args.loginUrl, args.texts.plain) };
}

export interface CopyEnv {
  /** `navigator.clipboard.writeText` — faqat xavfsiz (https/localhost) sahifada mavjud. */
  writeText?: ((text: string) => Promise<void>) | null;
  /** Zaxira yo'li (`document.execCommand('copy')`): http sahifa va eski brauzerlar uchun. */
  legacyCopy?: ((text: string) => boolean) | null;
}

/** Nusxa olish: avval zamonaviy yo'l, ishlamasa zaxira. Natija: nusxa olindimi. Hech qachon xato tashlamaydi. */
export async function copyText(text: string, env: CopyEnv): Promise<boolean> {
  if (env.writeText) {
    try {
      await env.writeText(text);
      return true;
    } catch {
      // ruxsat berilmadi yoki xavfsiz bo'lmagan sahifa: zaxira yo'liga o'tamiz
    }
  }
  if (env.legacyCopy) {
    try {
      return env.legacyCopy(text) === true;
    } catch {
      return false;
    }
  }
  return false;
}
