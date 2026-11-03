/**
 * Ommaviy qo'shish: qatorlar modeli va ular ustidagi sof amallar.
 *  - serverning "o'qish" javobi -> tahrirlanadigan qatorlar;
 *  - ogohlantirishlar (har safar qatorning HOZIRGI qiymatidan hisoblanadi: odam nomni yoki narxni tuzatsa, eski ogohlantirish yo'qoladi);
 *  - ommaviy amallar (belgilash, bo'lim berish, narxni x1000);
 *  - "Tasdiqlash" uchun yuk, jamlama va yozishga to'sqinlik qiluvchi sabablar;
 *  - serverning qator-xatolarini qatorlarga biriktirish.
 * React'siz sof funksiyalar: `node --test` bilan tekshiriladi.
 */
import type {
  Blockers,
  CategoryOption,
  CommitMode,
  CommitRequest,
  CommitRowPayload,
  ImageChoice,
  ParseResponse,
  PlanSummary,
  ReviewRow,
  RowError,
  WarningCode,
} from './types';

// Server chegaralari (backend/orders/interfaces/api/menu_admin.py va shartnoma)
export const MAX_ROWS = 300;
export const NAME_MAX = 200;
export const DESCRIPTION_MAX = 5000;
export const PRICE_MAX = 999_999_999_999;

/** 0 dan katta, lekin shundan kichik narx "ming so'mmi?" deb so'raladi. */
export const SMALL_PRICE_LIMIT = 1000;
/** Shundan katta narx "tekshiring" deb belgilanadi. */
export const LARGE_PRICE_LIMIT = 5_000_000;
export const PRICE_FIX_FACTOR = 1000;

/** Ogohlantirishlarning ko'rinish tartibi (eng muhimi birinchi). */
export const WARNING_ORDER: WarningCode[] = [
  'price_missing',
  'name_exists',
  'duplicate_in_file',
  'price_small',
  'price_large',
  'low_confidence',
  'category_new',
];

export type ReviewRowPatch = Partial<Omit<ReviewRow, 'id'>>;

// ---------- Matn va narx yordamchilari ----------

/** Nomlarni solishtirish uchun: harf registri, ortiqcha bo'shliq va turli apostroflar farq qilmasin. */
export function normalizeName(value: string): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Kiritilgan matndan butun so'm: faqat raqamlar olinadi, 12 raqamdan ortig'i kesiladi, bo'sh -> null. */
export function parsePriceInput(text: string): number | null {
  const digits = String(text ?? '').replace(/\D/g, '').slice(0, 12);
  return digits === '' ? null : Number(digits);
}

/** 45000 -> "45 000" (qidiruv/izoh uchun; kiritish maydonida xom raqam turadi). */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || !Number.isFinite(price)) return '';
  return String(Math.trunc(price)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function cleanMultiline(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '';
}

function cleanPrice(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > PRICE_MAX) return null;
  return Math.round(value);
}

// ---------- Server javobi -> qatorlar ----------

export interface ParseMapOptions {
  /** Birinchi qatorning tartib raqami ("r" + raqam): bir necha fayl birlashganda qator raqamlari takrorlanmasin. */
  startNumber: number;
  /** Taom surati (`kind=dish_photo`) uchun mijozdagi kichik ko'rinish: server javobida u yo'q. */
  localPreviewUrl?: string;
}

export function rowsFromParse(response: ParseResponse, options: ParseMapOptions): ReviewRow[] {
  const existingByName = new Map<string, number>();
  for (const category of response.categories ?? []) {
    if (category && typeof category.name === 'string' && typeof category.existing_id === 'number') {
      existingByName.set(normalizeName(category.name), category.existing_id);
    }
  }

  const source = Array.isArray(response.rows) ? response.rows : [];
  return source.map((raw, index) => {
    const category = cleanText(raw.category, NAME_MAX);
    const categoryId =
      typeof raw.existing_category_id === 'number'
        ? raw.existing_category_id
        : (existingByName.get(normalizeName(category)) ?? null);
    const name = cleanText(raw.name, NAME_MAX);
    const token = typeof raw.image_token === 'string' && raw.image_token ? raw.image_token : null;
    const image: ImageChoice | null = token
      ? { token, previewUrl: options.localPreviewUrl ?? '', fromInternet: false, credit: '', sourceUrl: '' }
      : null;
    return {
      id: `r${options.startNumber + index}`,
      include: true,
      name,
      price: cleanPrice(raw.price),
      category,
      categoryId: category ? categoryId : null,
      typingNewCategory: false,
      description: cleanMultiline(raw.description, DESCRIPTION_MAX),
      image,
      existingProductId: typeof raw.existing_product_id === 'number' ? raw.existing_product_id : null,
      originalName: name,
      // Mavjud taomga tegmaslik xavfsizroq: egasi o'zi "yangilash" ni tanlaydi
      existingChoice: 'skip',
      lowConfidence: Array.isArray(raw.warnings) && raw.warnings.includes('low_confidence'),
    };
  });
}

/** Yangi (mavjud bo'lmagan) bo'lim nomlari, takrorsiz va ko'rinish tartibida. */
export function collectNewCategoryNames(rows: ReviewRow[], existing: CategoryOption[]): string[] {
  const known = new Set(existing.map((c) => normalizeName(c.name)));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    const name = row.category.trim();
    if (!name || row.categoryId !== null) continue;
    const key = normalizeName(name);
    if (known.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

// ---------- Rejim va ogohlantirishlar ----------

/** Mavjud taom bilan bog'lanish faqat nom o'zgarmagan bo'lsa amal qiladi. */
export function nameExistsActive(row: ReviewRow): boolean {
  return row.existingProductId !== null && normalizeName(row.name) === normalizeName(row.originalName);
}

/** Qator bazaga nima qiladi: yaratadi / mavjud taomni yangilaydi / tegmaydi. */
export function effectiveMode(row: ReviewRow): CommitMode {
  if (!row.include) return 'skip';
  if (nameExistsActive(row)) return row.existingChoice;
  return 'create';
}

/** Qatorning bo'limini mavjud bo'limlarga solishtirib aniqlaydi (nom mavjud bo'limga to'g'ri kelsa uning id si olinadi). */
export function resolveCategory(
  row: Pick<ReviewRow, 'category' | 'categoryId'>,
  existing: CategoryOption[],
): { name: string; id: number | null } {
  if (row.categoryId !== null) {
    const byId = existing.find((c) => c.id === row.categoryId);
    if (byId) return { name: byId.name, id: byId.id };
  }
  const name = row.category.trim();
  if (!name) return { name: '', id: null };
  const key = normalizeName(name);
  const byName = existing.find((c) => normalizeName(c.name) === key);
  if (byName) return { name: byName.name, id: byName.id };
  return { name, id: null };
}

function sortByOrder(codes: Set<WarningCode>): WarningCode[] {
  return WARNING_ORDER.filter((code) => codes.has(code));
}

/**
 * Har qator uchun hozirgi ogohlantirishlar. Belgisi olingan qator uchun ogohlantirish yo'q.
 * Takror: ro'yxatda nomi oldin uchragan, yoziladigan qator (birinchisi asl, keyingilari takror).
 */
export function analyzeRows(rows: ReviewRow[], existing: CategoryOption[]): Map<string, WarningCode[]> {
  const result = new Map<string, WarningCode[]>();
  const seenNames = new Set<string>();

  for (const row of rows) {
    if (!row.include) {
      result.set(row.id, []);
      continue;
    }
    const codes = new Set<WarningCode>();
    const mode = effectiveMode(row);
    const writes = mode !== 'skip';

    if (writes && row.price === null) codes.add('price_missing');
    if (writes && row.price !== null && row.price > 0 && row.price < SMALL_PRICE_LIMIT) codes.add('price_small');
    if (writes && row.price !== null && row.price > LARGE_PRICE_LIMIT) codes.add('price_large');
    if (nameExistsActive(row)) codes.add('name_exists');
    if (row.lowConfidence) codes.add('low_confidence');

    if (writes) {
      const key = normalizeName(row.name);
      if (key) {
        if (seenNames.has(key)) codes.add('duplicate_in_file');
        seenNames.add(key);
      }
      if (mode === 'create') {
        const category = resolveCategory(row, existing);
        if (category.name && category.id === null) codes.add('category_new');
      }
    }
    result.set(row.id, sortByOrder(codes));
  }
  return result;
}

// ---------- Tahrirlash va ommaviy amallar ----------

export function patchRow(rows: ReviewRow[], id: string, patch: ReviewRowPatch): ReviewRow[] {
  return rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
}

export function setAllIncluded(rows: ReviewRow[], include: boolean): ReviewRow[] {
  return rows.map((row) => (row.include === include ? row : { ...row, include }));
}

export function countIncluded(rows: ReviewRow[]): number {
  return rows.reduce((total, row) => total + (row.include ? 1 : 0), 0);
}

/** Belgisi bor barcha qatorlarga bitta bo'lim beradi. */
export function applyCategoryToIncluded(
  rows: ReviewRow[],
  category: { name: string; id: number | null },
): ReviewRow[] {
  return rows.map((row) =>
    row.include
      ? { ...row, category: category.name, categoryId: category.id, typingNewCategory: false }
      : row,
  );
}

/** "Ming so'mmi?" deb so'raladigan narx: 0 dan katta va 1000 dan kichik. */
export function isSmallPrice(price: number | null): boolean {
  return price !== null && price > 0 && price < SMALL_PRICE_LIMIT;
}

export function multiplyRowPrice(row: ReviewRow): ReviewRow {
  if (!isSmallPrice(row.price) || row.price === null) return row;
  return { ...row, price: Math.min(row.price * PRICE_FIX_FACTOR, PRICE_MAX) };
}

/** Belgisi bor qatorlardan nechtasining narxi juda kichik. */
export function countSmallPrices(rows: ReviewRow[]): number {
  return rows.reduce((total, row) => total + (row.include && isSmallPrice(row.price) ? 1 : 0), 0);
}

/**
 * Belgisi bor qatorlarning KICHIK narxlarini x1000 qiladi. Oddiy narxlarga (45000) tegmaydi:
 * hammasini ko'r-ko'rona x1000 qilish 45 000 ni 45 000 000 ga aylantirib yuborardi.
 */
export function multiplySmallPrices(rows: ReviewRow[]): ReviewRow[] {
  return rows.map((row) => (row.include ? multiplyRowPrice(row) : row));
}

// ---------- Tasdiqlash ----------

export function summarizePlan(rows: ReviewRow[], existing: CategoryOption[]): PlanSummary {
  let created = 0;
  let updated = 0;
  const newCategories: string[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const mode = effectiveMode(row);
    if (mode === 'create') {
      created += 1;
      const category = resolveCategory(row, existing);
      if (category.name && category.id === null) {
        const key = normalizeName(category.name);
        if (!seen.has(key)) {
          seen.add(key);
          newCategories.push(category.name);
        }
      }
    } else if (mode === 'update') {
      updated += 1;
    }
  }
  return { created, updated, skipped: rows.length - created - updated, newCategories };
}

/** Yozishga to'sqinlik qiluvchi sabablar (server baribir tekshiradi, bu esa odamga oldindan aytadi). */
export function findBlockers(rows: ReviewRow[]): Blockers {
  let writes = 0;
  let missingPrice = 0;
  let missingName = 0;
  for (const row of rows) {
    if (effectiveMode(row) === 'skip') continue;
    writes += 1;
    if (row.price === null) missingPrice += 1;
    if (row.name.trim() === '') missingName += 1;
  }
  return { missingPrice, missingName, tooMany: writes > MAX_ROWS, nothingToWrite: writes === 0 };
}

export function hasBlockers(blockers: Blockers): boolean {
  return blockers.missingPrice > 0 || blockers.missingName > 0 || blockers.tooMany || blockers.nothingToWrite;
}

/**
 * Serverga ketadigan yuk. Faqat yoziladigan qatorlar yuboriladi (belgisi olingan va "o'tkazib yuborish" tanlangan qatorlar
 * ketmaydi). "Yangilash" qatorlarida bo'lim yuborilmaydi: server faqat narx/tavsif/rasmni yangilaydi, yangi bo'lim ochmasligi uchun.
 */
export function buildCommitRequest(
  rows: ReviewRow[],
  existing: CategoryOption[],
  submissionId: string,
): CommitRequest {
  const payload: CommitRowPayload[] = [];
  for (const row of rows) {
    const mode = effectiveMode(row);
    if (mode === 'skip') continue;
    const category = mode === 'create' ? resolveCategory(row, existing) : { name: '', id: null };
    const item: CommitRowPayload = {
      row_id: row.id,
      name: row.name.trim(),
      price: row.price,
      category: category.name,
      category_id: category.id,
      description: row.description.trim(),
      mode,
      existing_product_id: mode === 'update' ? row.existingProductId : null,
    };
    if (row.image) item.image_token = row.image.token;
    payload.push(item);
  }
  return { submission_id: submissionId, rows: payload };
}

// ---------- Server qator-xatolari ----------

export interface GroupedRowErrors {
  byRow: Record<string, RowError[]>;
  /** Hozirgi qatorlarga to'g'ri kelmagan xatolar (umumiy xabar sifatida ko'rsatiladi). */
  orphans: RowError[];
}

export function groupRowErrors(errors: RowError[], rows: ReviewRow[]): GroupedRowErrors {
  const ids = new Set(rows.map((row) => row.id));
  const byRow: Record<string, RowError[]> = {};
  const orphans: RowError[] = [];
  for (const error of errors) {
    if (ids.has(error.row_id)) {
      (byRow[error.row_id] ??= []).push(error);
    } else {
      orphans.push(error);
    }
  }
  return { byRow, orphans };
}

/** Xatosi bor birinchi qatorning raqami (ro'yxat tartibida): sahifani shu yerga aylantirish uchun. */
export function firstErrorRowId(rows: ReviewRow[], byRow: Record<string, RowError[]>): string | null {
  for (const row of rows) {
    if (byRow[row.id]?.length) return row.id;
  }
  return null;
}

/** Xato maydon nomini odam tilidagi yorliqqa aylantiradi; noma'lum maydon uchun yorliq qo'shilmaydi. */
export function describeRowError(error: RowError, fieldLabels: Record<string, string>): string {
  const message = String(error.message ?? '').trim();
  const label =
    error.field && Object.prototype.hasOwnProperty.call(fieldLabels, error.field) ? fieldLabels[error.field] : '';
  if (label && message) return `${label}: ${message}`;
  return message || label;
}
