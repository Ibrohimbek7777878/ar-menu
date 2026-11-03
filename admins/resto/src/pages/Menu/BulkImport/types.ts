/**
 * Ommaviy qo'shish: turlar.
 * Server shakllari docs/01_PRODUCT_RESTAURANT_3D_AR/TZ_OMMAVIY_MENYU_KIRITISH_2026-11-03.md (YAGONA SHARTNOMA) dan.
 *
 * Diqqat: bu fayl faqat turlardan iborat; boshqa fayllar uni `import type` bilan oladi
 * (shunda sof mantiq fayllari `node --test` ostida sibling importsiz ishlaydi).
 */

// ---------- Server shartnomasi ----------

export type ParseSource = 'text' | 'csv' | 'xlsx' | 'docx' | 'pdf' | 'image';
export type ParseEngine = 'table' | 'rules' | 'ocr' | 'ai';
export type ParseKind = 'menu' | 'dish_photo';

/** `warnings` kodlari (shartnoma). Noma'lum kod kelsa e'tiborsiz qoldiriladi. */
export type WarningCode =
  | 'price_missing'
  | 'price_small'
  | 'price_large'
  | 'name_exists'
  | 'duplicate_in_file'
  | 'category_new'
  | 'low_confidence';

export interface ParsedRow {
  row_id: string;
  name: string;
  price?: number | null;
  category?: string;
  description?: string;
  image_token?: string | null;
  warnings?: string[];
  existing_product_id?: number | null;
  existing_category_id?: number | null;
  duplicate_in_file?: boolean;
}

export interface ParsedCategory {
  name: string;
  existing_id: number | null;
}

export interface ParseResponse {
  source?: ParseSource;
  engine?: ParseEngine;
  kind?: ParseKind;
  truncated?: boolean;
  rows: ParsedRow[];
  categories?: ParsedCategory[];
  notes?: string[];
  stats?: { lines?: number; recognized?: number; skipped?: number };
}

export type CommitMode = 'create' | 'update' | 'skip';

export interface CommitRowPayload {
  row_id: string;
  name: string;
  price: number | null;
  category: string;
  category_id: number | null;
  description: string;
  image_token?: string;
  mode: CommitMode;
  existing_product_id: number | null;
}

export interface CommitRequest {
  submission_id: string;
  rows: CommitRowPayload[];
}

export interface CommitResponse {
  batch_id: string;
  created: number;
  updated: number;
  skipped: number;
  categories_created: string[];
  products: Array<{ row_id: string; id: number }>;
}

export interface RowError {
  row_id: string;
  field?: string;
  message: string;
}

export interface UndoResponse {
  archived: number;
}

export interface PhotoUploadResponse {
  image_token: string;
  preview_url: string;
}

export interface ImageSearchResult {
  id: string;
  thumb: string;
  full: string;
  title?: string;
  creator?: string;
  license: string;
  license_url?: string;
  source?: string;
  source_url?: string;
}

export interface ImageSearchResponse {
  query_used?: string;
  results: ImageSearchResult[];
}

export interface ImagePickResponse {
  image_token: string;
  preview_url: string;
  credit?: string;
}

// ---------- Mijoz holati ----------

/** Qatorga biriktirilgan rasm (internetdan yoki o'zining surati). */
export interface ImageChoice {
  token: string;
  /** Kichik ko'rinish manzili; bo'sh bo'lishi mumkin (server uni bermagan bo'lsa). */
  previewUrl: string;
  fromInternet: boolean;
  /** "Muallif · CC BY" (faqat internetdan). */
  credit: string;
  sourceUrl: string;
}

/** Mavjud nomli taom uchun egasining qarori. */
export type ExistingChoice = 'update' | 'skip' | 'create';

export interface ReviewRow {
  /** Yagona qator raqami ("r1", "r2"...); serverga `row_id` sifatida ketadi. */
  id: string;
  /** Belgi: qo'shiladimi (false = o'tkazib yuboriladi). */
  include: boolean;
  name: string;
  price: number | null;
  /** Bo'lim nomi; bo'sh = bo'limsiz. */
  category: string;
  /** Mavjud bo'lim id si (yangi bo'lim bo'lsa null). */
  categoryId: number | null;
  /** "Yangi bo'lim yozish" tanlangan, lekin nom hali bo'sh. */
  typingNewCategory: boolean;
  description: string;
  image: ImageChoice | null;
  /** Server topgan mavjud taom (nom o'zgarsa bu bog'lanish bekor bo'ladi). */
  existingProductId: number | null;
  /** O'qilgan paytdagi nom: `existingProductId` shu nomga tegishli. */
  originalName: string;
  existingChoice: ExistingChoice;
  /** Server "ishonchsiz o'qildi" degan. */
  lowConfidence: boolean;
}

export interface CategoryOption {
  id: number;
  name: string;
}

export type RowTone = 'ok' | 'warn' | 'error' | 'muted';

export type WarningSeverity = 'error' | 'warn' | 'info';

export interface PlanSummary {
  created: number;
  updated: number;
  skipped: number;
  /** Yaratiladigan yangi bo'limlar (takrorsiz). */
  newCategories: string[];
}

export interface Blockers {
  missingPrice: number;
  missingName: number;
  tooMany: boolean;
  nothingToWrite: boolean;
}

export interface ApiFailure {
  /** 0 = tarmoq xatosi (javob kelmadi). */
  status: number;
  code: string;
  message: string;
  rows: RowError[];
  aborted: boolean;
}
