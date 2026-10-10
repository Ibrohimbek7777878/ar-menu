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
 * Barcha so'zlar (tokens) mos kelishi kerak.
 */
export function matchUzbekQuery(
  targetFields: (string | undefined | null)[],
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const rawTokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return true;

  // Qidirilayotgan obyekt matnlari birlashtiriladi
  const fullTargetText = targetFields.filter(Boolean).join(' ');
  const targetNormalized = normalizeUzbekText(fullTargetText);
  const targetStripped = stripApostrophes(fullTargetText);

  // So'rovdagi har bir so'z mos kelishi tekshiriladi
  return rawTokens.every((token) => {
    const tokenNormalized = normalizeUzbekText(token);
    const tokenStripped = stripApostrophes(token);

    // 1. To'g'ridan-to'g'ri apostrofi bilan mos kelishi (o'sh -> o'sh)
    if (targetNormalized.includes(tokenNormalized)) return true;

    // 2. Apostrofsiz mos kelishi (gosht -> go'sht yoki go'sht -> gosht)
    if (targetStripped.includes(tokenStripped)) return true;

    // 3. O' va G' harflarini alohida tekshirish
    // Agar user "o" yozsa "o'" ni ham topsin
    const relaxedToken = tokenStripped.replace(/o/g, "[o']?").replace(/g/g, "[g']?");
    try {
      const reg = new RegExp(relaxedToken, 'i');
      if (reg.test(targetNormalized)) return true;
    } catch {}

    return false;
  });
}
