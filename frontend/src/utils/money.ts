/**
 * Kiritilgan summani songa o'tkazish (TZ: R-FIN-05).
 *
 * Avval `replace(/\D/g, '')` ishlatilardi: "150000.50" → 15 000 050, "1,5" → 15 va minus belgisi tushib qolardi —
 * kassaga 100 baravar ko'p summa yozilishi mumkin edi. Bo'shliqlar (ming ajratgich) olib tashlanadi, vergul
 * kasr belgisi deb o'qiladi. Yaroqsiz kiritishda 0 qaytadi (chaqiruvchi "summa noto'g'ri" deydi).
 */
export function parseMoney(raw: string): number {
  const cleaned = String(raw ?? '').replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : 0;
}
