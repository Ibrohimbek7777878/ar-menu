/**
 * O'zbek tili uchun aqlli semantik va fonetik qidiruv yordamchisi.
 * Apostroflar (' ‘ ’ ʻ ʼ `) va o'/g' harflarining har xil yozilishini to'g'ri tushunadi.
 */

// Apostrof va uning har xil belgilari
const APOSTROPHE_REGEX = /['‘’ʻʼ`]/g;

/**
 * Matnni o'zbekcha qidiruv uchun kanonik ko'rinishga keltiradi.
 */
export function normalizeUzbekText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(APOSTROPHE_REGEX, "'") // Barcha turdagi apostroflarni bitta ' ga aylantirish
    .replace(/\s+/g, ' ');
}

/**
 * Apostrofsiz sof harflarga keltirilgan variant (masalan, "go'sht" -> "gosht").
 */
export function stripApostrophes(text: string): string {
  return normalizeUzbekText(text).replace(/'/g, '');
}

// Kirill → lotin (o'zbek kirilli). Qidiruv ikkala yozuvda ham ishlashi uchun hammasi bitta "kanonik" ko'rinishga keltiriladi.
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: "'", ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: "o'", қ: 'q', ғ: "g'", ҳ: 'h',
};

/**
 * Qidiruv uchun kanonik ko'rinish: kichik harf, kirill → lotin, barcha apostroflar olib tashlanadi
 * ("o'g'ri", "ogri", "огри", "ўғри" — hammasi "ogri").
 */
export function toCanonical(text: string): string {
  const latin = normalizeUzbekText(text).replace(/[\u0400-\u04ff]/g, (ch) => CYRILLIC_TO_LATIN[ch] ?? ch);
  return latin.replace(/'/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Fonetik moslashuv: o' -> o, g' -> g, sh, ch va boshqalar
 */
export function getSearchVariants(text: string): string[] {
  const normalized = normalizeUzbekText(text);
  const stripped = stripApostrophes(normalized);
  
  // Masalan: "o'sh" -> ["o'sh", "osh"]
  // "go'sht" -> ["go'sht", "gosht"]
  return Array.from(new Set([normalized, stripped]));
}

/**
 * Berilgan matnda (nomi, tavsifi, kategoriyasi) qidiruv so'rovi mavjudligini tekshiradi.
 * Barcha so'zlar (tokens) mos kelishi kerak. Taqqoslash kanonik ko'rinishda (apostrofsiz lotin) — oddiy
 * qism-satr tekshiruvi; regex ishlatilmaydi (avval `go`, `og` yoki `.` kabi so'rovlar hamma narsani topardi).
 */
export function matchUzbekQuery(
  targetFields: (string | undefined | null)[],
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const tokens = toCanonical(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  const target = toCanonical(targetFields.filter(Boolean).join(' '));
  return tokens.every((token) => target.includes(token));
}
