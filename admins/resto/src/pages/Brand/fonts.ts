/**
 * Shrift variantlari uchun CSS shrift qatorlari (faqat maket/namuna uchun). Uchala shrift panelga lokal ulangan
 * (shared/src/ui/fonts.css): tashqi so'rov yo'q. "Yumaloq" uchun eng yaqin lokal shrift — Outfit (haqiqiy yumaloq shrift emas).
 */
import type { FontKey } from './types.ts';

export const FONT_STACKS: Record<FontKey, string> = {
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  rounded: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
};

export function fontStack(font: FontKey): string {
  return FONT_STACKS[font] ?? FONT_STACKS.serif;
}
