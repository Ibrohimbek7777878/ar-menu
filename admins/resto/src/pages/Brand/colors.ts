/**
 * Rang hisobi: SOF mantiq (React ham, DOM ham yo'q) — `node --test` bilan sinaladi.
 *
 * Kontrast WCAG 2.x bo'yicha: sRGB nisbiy yorqinlik va (L1 + 0.05) / (L2 + 0.05). Tugma matni oq (mehmon saytidagidek),
 * shuning uchun asosiy rangning OQ USTIDAGI nisbati hisoblanadi; oddiy matn uchun kamida 4.5 : 1 (AA).
 * Oq rangning yorqinligi aniq 1, shuning uchun oq rang qiymati kodda yozilmaydi.
 */

/** Oddiy (kichik) matn uchun eng kam nisbat (WCAG AA) */
export const AA_NORMAL = 4.5;

const HEX6 = /^[0-9A-F]{6}$/;
const HEX3 = /^[0-9A-F]{3}$/;

/**
 * Rang kodini `#RRGGBB` (katta harf) ko'rinishiga keltiradi. Boshidagi `#` ixtiyoriy, atrofidagi bo'shliq e'tiborsiz.
 * Qisqa yozuv (`#abc`) faqat `allowShort` bo'lsa qabul qilinadi (standart: ha). Yaroqsiz bo'lsa `null`.
 */
export function normalizeHex(input: unknown, allowShort = true): string | null {
  if (typeof input !== 'string') return null;
  let value = input.trim().toUpperCase();
  if (value.startsWith('#')) value = value.slice(1);
  if (HEX6.test(value)) return `#${value}`;
  if (allowShort && HEX3.test(value)) return `#${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`;
  return null;
}

export function isValidHex(input: unknown, allowShort = true): boolean {
  return normalizeHex(input, allowShort) !== null;
}

/** `#RRGGBB` -> [r, g, b] (0..255); yaroqsiz bo'lsa `null` */
export function parseHex(input: unknown): [number, number, number] | null {
  const hex = normalizeHex(input);
  if (!hex) return null;
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function toHex(channels: [number, number, number]): string {
  return `#${channels.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB nisbiy yorqinlik (0 = qora, 1 = oq); yaroqsiz rang uchun `null` */
export function relativeLuminance(input: unknown): number | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ikki rang orasidagi kontrast nisbati (1..21); yaroqsiz rang uchun `null` */
export function contrastRatio(a: unknown, b: unknown): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rang ustida OQ matn (yoki oq fon ustida shu rangli matn) kontrasti; oqning yorqinligi = 1 */
export function contrastOnWhite(input: unknown): number | null {
  const l = relativeLuminance(input);
  return l === null ? null : 1.05 / (l + 0.05);
}

export type Readability = 'ok' | 'adjust' | 'invalid';

export interface ReadabilityResult {
  ratio: number | null;
  /** ok = oq matn yetarli o'qiladi; adjust = server rangni to'qroq qiladi; invalid = rang kodi noto'g'ri */
  verdict: Readability;
}

export function readabilityOnWhite(input: unknown): ReadabilityResult {
  const ratio = contrastOnWhite(input);
  if (ratio === null) return { ratio: null, verdict: 'invalid' };
  return { ratio, verdict: ratio >= AA_NORMAL ? 'ok' : 'adjust' };
}

/** Nisbatni ko'rsatish uchun: ikki xona, QUYIGA yaxlitlanadi (4.497 -> "4.49": 4.5 dan past son 4.50 ko'rinmasin) */
export function formatRatio(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return '';
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}

/**
 * Rangni qoraga qarab to'qlashtiradi, toki oq matn bilan nisbat `target` ga yetsin (eng kam o'zgarish: ikkilik qidiruv).
 * Allaqachon yetarli bo'lsa o'zi qaytadi. TAXMINIY: serverning o'z hisobi bo'lishi mumkin; maket va maslahat uchun.
 */
export function darkenToReadable(input: unknown, target: number = AA_NORMAL): string | null {
  const rgb = parseHex(input);
  if (!rgb) return null;
  const original = normalizeHex(input) as string;
  if ((contrastOnWhite(original) as number) >= target) return original;
  let lo = 0; // 0 = o'zgarishsiz, 1 = qora
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const candidate = toHex([rgb[0] * (1 - mid), rgb[1] * (1 - mid), rgb[2] * (1 - mid)]);
    if ((contrastOnWhite(candidate) as number) >= target) hi = mid;
    else lo = mid;
  }
  return toHex([rgb[0] * (1 - hi), rgb[1] * (1 - hi), rgb[2] * (1 - hi)]);
}

/** Matn maydonidagi yozuvni rang kodiga keltiradi: faqat 0-9 A-F, katta harf, eng ko'pi 6 ta, boshida `#` */
export function typedHex(input: string): string {
  const digits = String(input ?? '')
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
    .slice(0, 6);
  return digits ? `#${digits}` : '';
}
