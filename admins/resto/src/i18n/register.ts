// Resto Admin lug'atlarini tarjima tizimiga ulaydi (main.tsx ilova ishga tushishidan oldin import qiladi).
// Har til BITTA bo'lak: `ru/index.ts`, `en/index.ts` (import.meta.glob bilan papkadagi barcha fayllarni yig'adi).
// Sahifa agentlari: yangi matn kalitlarini `ru/*.ts` va `en/*.ts` ga qo'shing (yangi fayl ochsangiz ham bo'ladi) — ulash kerak emas.
import { registerDictionaries } from '@admins/shared';

registerDictionaries({
  ru: () => import('./ru/index'),
  en: () => import('./en/index'),
});
