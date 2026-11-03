/**
 * Matn shablonlarini to'ldirish: "{n} ta taom" + { n: 48 } -> "48 ta taom".
 * Matnlar uz.ts da turadi, shuning uchun ularda funksiya emas, `{nom}` belgilari bor.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
