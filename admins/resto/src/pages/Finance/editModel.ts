/**
 * Moliya yozuvini qo'lda tahrirlash: forma qoralamasi, tekshiruv, "nima o'zgaradi" farqi, tarix ko'rinishi. SOF mantiq:
 * React va `@admins/shared` import qilinmaydi (`node --test` bilan sinaladi). Matn kerak bo'lsa tarjima funksiyasi (`tr`)
 * va summa formati (`fmt`) tashqaridan beriladi; `tr` ga literal matn yoziladi, shuning uchun tarjima testi kalitlarni topadi.
 *
 * Qoidalar (server bilan bir xil, backend/finance/services/revisions.py):
 *  - sabab majburiy, 5..300 belgi; hech narsa o'zgarmasa saqlab bo'lmaydi;
 *  - faqat o'zgargan maydonlar yuboriladi; summa satr sifatida ("1500.5") ketadi: float xatosi pul hisobiga aralashmasin;
 *  - qarzda umumiy summa to'langan summadan kichik bo'lmaydi.
 */

export const REASON_MIN = 5;
export const REASON_MAX = 300;
export const MAX_MONEY = 999_999_999_999.99;

export type Translate = (key: string, params?: Record<string, string | number>) => string;
export type MoneyFormat = (n: number) => string;

// ─── Umumiy ───────────────────────────────────────────────────────────────────────────────────────

/** "150 000", "1500,50", "1 500.5" -> son. Yaroqsiz, 0, manfiy yoki chegaradan katta -> null. */
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 && n <= MAX_MONEY ? n : null;
}

const cents = (n: number) => Math.round(n * 100);
export const sameMoney = (a: number, b: number) => cents(a) === cents(b);

export type ReasonState = 'ok' | 'empty' | 'short' | 'long';

/** Sabab holati: bo'sh joylar chetidan olib tashlanadi (server ham shunday hisoblaydi). */
export function reasonState(text: string): ReasonState {
  const len = text.trim().length;
  if (len === 0) return 'empty';
  if (len < REASON_MIN) return 'short';
  if (len > REASON_MAX) return 'long';
  return 'ok';
}

/**
 * Summani matnga aylantiradi: butun qismi guruhlanadi (`group`), tiyin bo'lsa ikki xonali kasr qo'shiladi ("170 000,50").
 * Tarixda 170 000 -> 170 000,50 farqi yo'qolmasin: butun songa yaxlitlanmaydi.
 */
export function formatMoneyParts(n: number, group: (whole: number) => string, decimalSeparator: string): string {
  const [whole, fraction] = Math.abs(n).toFixed(2).split('.');
  const body = fraction === '00' ? group(Number(whole)) : `${group(Number(whole))}${decimalSeparator}${fraction}`;
  return n < 0 ? `-${body}` : body;
}

/** Eski /seller/finance/ paneli sabab so'ramaydi: server tarixga shu belgini yozadi (backend: LEGACY_PANEL_REASON). */
export const LEGACY_PANEL_REASON = "Eski panel orqali o'zgartirildi (sabab so'ralmagan)";
export const isLegacyReason = (reason: string) => reason === LEGACY_PANEL_REASON;

export const isReasonOk = (text: string) => reasonState(text) === 'ok';

/** Sabab xatosi matni ('empty' hali yozilmagan: xato emas, ko'rsatma). */
export function reasonMessage(state: ReasonState, tr: Translate): string {
  if (state === 'short') return tr('Sababni yozing (kamida 5 belgi)');
  if (state === 'long') return tr('Sabab 300 belgidan oshmasligi kerak');
  return '';
}

export interface ChangeLine {
  /** Ichki maydon kaliti (amount, category, ...) */
  field: string;
  label: string;
  before: string;
  after: string;
}

const DASH = '—';
/** Tarixdagi xom qiymat: server satr yuboradi, lekin mantiqiy/son qiymat ham yiqitmasin (eski panel `hidden`/`cancelled` saqlaydi). */
export type RawValue = string | number | boolean | null | undefined;
const orDash = (value: RawValue) => {
  if (value === null || value === undefined) return DASH;
  const text = String(value);
  return text.trim() ? text : DASH;
};

export type PaymentMethod = 'cash' | 'card' | 'bank';

function methodLabel(method: RawValue, tr: Translate): string {
  if (method === 'cash') return tr('Naqd pul');
  if (method === 'card') return tr('Plastik / Karta');
  if (method === 'bank') return tr('Bank hisobi');
  return orDash(method);
}

function debtTypeLabel(kind: RawValue, tr: Translate): string {
  if (kind === 'customer') return tr('Mijoz nasiyasi');
  if (kind === 'supplier') return tr('Yetkazib beruvchi');
  return orDash(kind);
}

function debtStatusLabel(status: RawValue, tr: Translate): string {
  if (status === 'pending') return tr('Ochiq qarz');
  if (status === 'partial') return tr("Qisman to'langan");
  if (status === 'settled') return tr("To'liq yopilgan");
  return orDash(status);
}

// ─── Kassa operatsiyasi ───────────────────────────────────────────────────────────────────────────

export interface TxRowLike {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category_id: number | null;
  category_name: string;
  title: string;
  notes?: string;
  tx_date: string;
  payment_method: string;
  revisions_count: number;
}

export interface CategoryLike {
  id: number;
  name: string;
}

export interface TxFormValues {
  amount: string;
  /** Tanlangan kategoriya id si; '' = kategoriyasiz (Umumiy) */
  categoryId: string;
  title: string;
  notes: string;
  txDate: string;
  method: PaymentMethod;
}

export function txFormFromRow(tx: TxRowLike): TxFormValues {
  return {
    amount: String(tx.amount),
    categoryId: tx.category_id ? String(tx.category_id) : '',
    title: tx.title,
    notes: tx.notes ?? '',
    txDate: tx.tx_date,
    method: (['cash', 'card', 'bank'].includes(tx.payment_method) ? tx.payment_method : 'cash') as PaymentMethod,
  };
}

export type TxField = 'amount' | 'category' | 'title' | 'notes' | 'txDate' | 'method' | 'reason';
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Xato kodlari ('required' | 'invalid' | 'future' | 'short' | 'long'); matnga aylantirish — komponentda. */
export function validateTxForm(form: TxFormValues, reason: string, today: string): FieldErrors<TxField> {
  const errors: FieldErrors<TxField> = {};
  if (parseMoney(form.amount) === null) errors.amount = 'invalid';
  if (!form.title.trim()) errors.title = 'required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.txDate)) errors.txDate = 'invalid';
  else if (form.txDate > today) errors.txDate = 'future';
  const state = reasonState(reason);
  if (state === 'short' || state === 'long') errors.reason = state;
  return errors;
}

function categoryName(id: string | number | null, categories: CategoryLike[], fallback: string, tr: Translate): string {
  if (id === '' || id === null) return tr('Umumiy');
  const found = categories.find((c) => String(c.id) === String(id));
  return found ? found.name : fallback;
}

/** Faqat o'zgargan maydonlar: eski -> yangi (summa/kategoriya/mazmun/izoh/sana/to'lov turi tartibida). */
export function diffTxForm(row: TxRowLike, form: TxFormValues, categories: CategoryLike[], tr: Translate, fmt: MoneyFormat): ChangeLine[] {
  const lines: ChangeLine[] = [];
  const amount = parseMoney(form.amount);
  if (amount !== null && !sameMoney(amount, row.amount)) {
    lines.push({ field: 'amount', label: tr('Summa'), before: fmt(row.amount), after: fmt(amount) });
  }
  const oldCategory = row.category_id ? String(row.category_id) : '';
  if (form.categoryId !== oldCategory) {
    lines.push({
      field: 'category',
      label: tr('Kategoriya'),
      before: categoryName(oldCategory, categories, row.category_name, tr),
      after: categoryName(form.categoryId, categories, form.categoryId, tr),
    });
  }
  if (form.title.trim() !== row.title) {
    lines.push({ field: 'title', label: tr('Mazmuni'), before: orDash(row.title), after: orDash(form.title.trim()) });
  }
  if (form.notes.trim() !== (row.notes ?? '')) {
    lines.push({ field: 'notes', label: tr('Izoh'), before: orDash(row.notes), after: orDash(form.notes.trim()) });
  }
  if (form.txDate !== row.tx_date) {
    lines.push({ field: 'tx_date', label: tr('Sana'), before: row.tx_date, after: form.txDate });
  }
  if (form.method !== row.payment_method) {
    lines.push({ field: 'payment_method', label: tr("To'lov usuli"), before: methodLabel(row.payment_method, tr), after: methodLabel(form.method, tr) });
  }
  return lines;
}

/** Summa o'zgarsa hisobotlarga ta'siri: "Jami chiqim 25 000 so'm ga ko'payadi". O'zgarmasa null. */
export function moneyImpact(row: TxRowLike, form: TxFormValues, tr: Translate, fmt: MoneyFormat): string | null {
  const amount = parseMoney(form.amount);
  if (amount === null || sameMoney(amount, row.amount)) return null;
  const diff = fmt(Math.abs(amount - row.amount));
  const more = amount > row.amount;
  if (row.type === 'income') {
    return more ? tr("Jami kirim {sum} ga ko'payadi", { sum: diff }) : tr('Jami kirim {sum} ga kamayadi', { sum: diff });
  }
  return more ? tr("Jami chiqim {sum} ga ko'payadi", { sum: diff }) : tr('Jami chiqim {sum} ga kamayadi', { sum: diff });
}

export interface TxPatch {
  amount?: string;
  category_id?: number | null;
  title?: string;
  notes?: string;
  tx_date?: string;
  payment_method?: string;
  reason: string;
  expected_revision: number;
}

/** Serverga yuboriladigan tana: faqat o'zgargan maydonlar + sabab + ko'rilgan tahrirlar soni. */
export function txPatchBody(row: TxRowLike, form: TxFormValues, reason: string): TxPatch {
  const body: TxPatch = { reason: reason.trim(), expected_revision: row.revisions_count };
  const amount = parseMoney(form.amount);
  if (amount !== null && !sameMoney(amount, row.amount)) body.amount = String(amount);
  if (form.categoryId !== (row.category_id ? String(row.category_id) : '')) body.category_id = form.categoryId ? Number(form.categoryId) : null;
  if (form.title.trim() !== row.title) body.title = form.title.trim();
  if (form.notes.trim() !== (row.notes ?? '')) body.notes = form.notes.trim();
  if (form.txDate !== row.tx_date) body.tx_date = form.txDate;
  if (form.method !== row.payment_method) body.payment_method = form.method;
  return body;
}

// ─── Qarz / nasiya ────────────────────────────────────────────────────────────────────────────────

export interface DebtRowLike {
  id: number;
  person_name: string;
  phone: string;
  debt_type: 'customer' | 'supplier';
  initial_amount: number;
  paid_amount: number;
  due_date: string | null;
  notes: string;
  revisions_count: number;
}

export interface DebtFormValues {
  personName: string;
  phone: string;
  debtType: 'customer' | 'supplier';
  amount: string;
  dueDate: string;
  notes: string;
}

export function debtFormFromRow(debt: DebtRowLike): DebtFormValues {
  return {
    personName: debt.person_name,
    phone: debt.phone ?? '',
    debtType: debt.debt_type,
    amount: String(debt.initial_amount),
    dueDate: debt.due_date ?? '',
    notes: debt.notes ?? '',
  };
}

export type DebtField = 'personName' | 'phone' | 'debtType' | 'amount' | 'dueDate' | 'notes' | 'reason';

/** To'lov qabul qilingan qarzning yo'nalishi o'zgarmaydi (server ham rad etadi). */
export const debtTypeLocked = (debt: DebtRowLike) => debt.paid_amount > 0;

export function validateDebtForm(debt: DebtRowLike, form: DebtFormValues, reason: string): FieldErrors<DebtField> {
  const errors: FieldErrors<DebtField> = {};
  const amount = parseMoney(form.amount);
  if (amount === null) errors.amount = 'invalid';
  else if (cents(amount) < cents(debt.paid_amount)) errors.amount = 'below_paid';
  if (!form.personName.trim()) errors.personName = 'required';
  if (form.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)) errors.dueDate = 'invalid';
  const state = reasonState(reason);
  if (state === 'short' || state === 'long') errors.reason = state;
  return errors;
}

export function diffDebtForm(debt: DebtRowLike, form: DebtFormValues, tr: Translate, fmt: MoneyFormat): ChangeLine[] {
  const lines: ChangeLine[] = [];
  if (form.personName.trim() !== debt.person_name) {
    lines.push({ field: 'person_name', label: tr('Shaxs / Tashkilot'), before: orDash(debt.person_name), after: orDash(form.personName.trim()) });
  }
  if (form.phone.trim() !== (debt.phone ?? '')) {
    lines.push({ field: 'phone', label: tr('Telefon raqami'), before: orDash(debt.phone), after: orDash(form.phone.trim()) });
  }
  if (form.debtType !== debt.debt_type) {
    lines.push({ field: 'debt_type', label: tr("Qarz yo'nalishi"), before: debtTypeLabel(debt.debt_type, tr), after: debtTypeLabel(form.debtType, tr) });
  }
  const amount = parseMoney(form.amount);
  if (amount !== null && !sameMoney(amount, debt.initial_amount)) {
    lines.push({ field: 'amount', label: tr('Qarz summasi'), before: fmt(debt.initial_amount), after: fmt(amount) });
  }
  if ((form.dueDate || null) !== (debt.due_date || null)) {
    lines.push({ field: 'due_date', label: tr('Qaytarish muddati'), before: orDash(debt.due_date), after: orDash(form.dueDate) });
  }
  if (form.notes.trim() !== (debt.notes ?? '')) {
    lines.push({ field: 'notes', label: tr('Izoh'), before: orDash(debt.notes), after: orDash(form.notes.trim()) });
  }
  return lines;
}

export interface DebtPatch {
  person_name?: string;
  phone?: string;
  debt_type?: 'customer' | 'supplier';
  amount?: string;
  due_date?: string | null;
  notes?: string;
  reason: string;
  expected_revision: number;
}

export function debtPatchBody(debt: DebtRowLike, form: DebtFormValues, reason: string): DebtPatch {
  const body: DebtPatch = { reason: reason.trim(), expected_revision: debt.revisions_count };
  if (form.personName.trim() !== debt.person_name) body.person_name = form.personName.trim();
  if (form.phone.trim() !== (debt.phone ?? '')) body.phone = form.phone.trim();
  if (form.debtType !== debt.debt_type) body.debt_type = form.debtType;
  const amount = parseMoney(form.amount);
  if (amount !== null && !sameMoney(amount, debt.initial_amount)) body.amount = String(amount);
  if ((form.dueDate || null) !== (debt.due_date || null)) body.due_date = form.dueDate || null;
  if (form.notes.trim() !== (debt.notes ?? '')) body.notes = form.notes.trim();
  return body;
}

/** Summa o'zgarishi qarz holatini o'zgartirishi mumkin: ogohlantirish ("qarz yana ochiladi" / "to'liq yopiladi"). */
export function debtStatusAfterAmount(debt: DebtRowLike, form: DebtFormValues, tr: Translate): string | null {
  const amount = parseMoney(form.amount);
  if (amount === null || sameMoney(amount, debt.initial_amount) || debt.paid_amount <= 0) return null;
  const wasSettled = cents(debt.paid_amount) >= cents(debt.initial_amount);
  const willSettle = cents(debt.paid_amount) >= cents(amount);
  if (wasSettled && !willSettle) return tr('Qarz yopilgan edi: yangi summada yana ochiladi');
  if (!wasSettled && willSettle) return tr("Qarz to'liq to'langan hisoblanib, yopiladi");
  return null;
}

// ─── Tarix ko'rinishi ─────────────────────────────────────────────────────────────────────────────

export type HistoryKind = 'transaction' | 'debt';

export interface RevisionLike {
  id: number;
  revision_no: number;
  changed_at: string;
  changed_by: { id: number | null; name: string; role: string };
  reason: string;
  changes: Record<string, { old: RawValue; new: RawValue }>;
}

// Tahrir oynasidan keladigan maydonlar birinchi; eski panel/harakatlar yozadigan maydonlar (bosqich, bekor qilish, yashirish, to'lov) keyin.
const FIELD_ORDER: Record<HistoryKind, string[]> = {
  transaction: ['amount', 'category', 'title', 'notes', 'tx_date', 'payment_method', 'tx_type', 'stage', 'cancelled', 'cancel_reason', 'hidden'],
  debt: ['person_name', 'phone', 'debt_type', 'amount', 'due_date', 'notes', 'paid_amount', 'status', 'hidden'],
};

function fieldLabel(kind: HistoryKind, field: string, tr: Translate): string {
  if (kind === 'transaction') {
    switch (field) {
      case 'amount': return tr('Summa');
      case 'category': return tr('Kategoriya');
      case 'title': return tr('Mazmuni');
      case 'notes': return tr('Izoh');
      case 'tx_date': return tr('Sana');
      case 'payment_method': return tr("To'lov usuli");
    }
  } else {
    switch (field) {
      case 'person_name': return tr('Shaxs / Tashkilot');
      case 'phone': return tr('Telefon raqami');
      case 'debt_type': return tr("Qarz yo'nalishi");
      case 'amount': return tr('Qarz summasi');
      case 'due_date': return tr('Qaytarish muddati');
      case 'notes': return tr('Izoh');
    }
  }
  // Ikkala turda ham uchraydigan maydonlar (eski panel, bosqichga ko'chirish, storno, yashirish, qarz to'lovi): xom kod ko'rinmaydi
  switch (field) {
    case 'stage': return tr('Ustun/bosqich');
    case 'tx_type': return tr('Tur');
    case 'hidden': return tr('Yashirilgan');
    case 'cancelled': return tr('Bekor qilingan');
    case 'cancel_reason': return tr('Bekor qilish sababi');
    case 'paid_amount': return tr("To'langan summa");
    case 'status': return tr('Holat');
  }
  return field;                                           // noma'lum maydon yashirilmaydi: xom nomi bilan ko'rinadi
}

/** Mantiqiy qiymat: server 'true'/'false' satr yuboradi (backend: api_value); haqiqiy bool ham qabul qilinadi. */
function yesNoLabel(value: RawValue, tr: Translate): string {
  const text = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  if (text === 'true') return tr('Ha');
  if (text === 'false') return tr("Yo'q");
  return orDash(value);
}

function txTypeLabel(value: RawValue, tr: Translate): string {
  if (value === 'income') return tr('Kirim');
  if (value === 'expense') return tr('Chiqim');
  return orDash(value);
}

/** Tarixdagi bitta qiymatni odam tilida: summa formatlanadi, kod (cash, customer, settled) o'zbekcha nomga aylanadi. */
export function formatHistoryValue(kind: HistoryKind, field: string, value: RawValue, tr: Translate, fmt: MoneyFormat): string {
  if (field === 'amount' || field === 'paid_amount') {
    const n = value === null || value === undefined || typeof value === 'boolean' || value === '' ? NaN : Number(value);
    return Number.isFinite(n) ? fmt(n) : DASH;
  }
  if (field === 'hidden' || field === 'cancelled') return yesNoLabel(value, tr);
  if (field === 'tx_type') return txTypeLabel(value, tr);
  if (field === 'category') return value ? String(value) : tr('Umumiy');
  if (field === 'payment_method') return methodLabel(value, tr);
  if (kind === 'debt' && field === 'debt_type') return debtTypeLabel(value, tr);
  if (kind === 'debt' && field === 'status') return debtStatusLabel(value, tr);
  return orDash(value);
}

function orderedFields(kind: HistoryKind, keys: string[]): string[] {
  const known = FIELD_ORDER[kind];
  return [...known.filter((k) => keys.includes(k)), ...keys.filter((k) => !known.includes(k))];
}

/** Bitta tahrirning o'zgargan maydonlari (eski -> yangi), tartib bilan. */
export function revisionLines(kind: HistoryKind, revision: RevisionLike, tr: Translate, fmt: MoneyFormat): ChangeLine[] {
  return orderedFields(kind, Object.keys(revision.changes)).map((field) => ({
    field,
    label: fieldLabel(kind, field, tr),
    before: formatHistoryValue(kind, field, revision.changes[field].old, tr, fmt),
    after: formatHistoryValue(kind, field, revision.changes[field].new, tr, fmt),
  }));
}

export interface ValueLine {
  field: string;
  label: string;
  value: string;
}

/** "Asl qiymat": birinchi tahrirdan oldingi holat (faqat tarixda o'zgargan maydonlar emas, hammasi). */
export function originalLines(kind: HistoryKind, original: Record<string, RawValue>, tr: Translate, fmt: MoneyFormat): ValueLine[] {
  return orderedFields(kind, Object.keys(original)).map((field) => ({
    field,
    label: fieldLabel(kind, field, tr),
    value: formatHistoryValue(kind, field, original[field], tr, fmt),
  }));
}

// ─── Server xatosi ────────────────────────────────────────────────────────────────────────────────

export interface EditFailure {
  status: number;
  message: string;
  /** Server kodi: source_locked | cancelled | no_changes | stale | below_paid | has_payments | reason_required | ... */
  code: string;
  /** Forma maydoni (reason, amount, ...) yoki bo'sh */
  field: string;
  /** Qarzda eng kichik ruxsat etilgan umumiy summa (below_paid) */
  minAmount: number | null;
}

/** `ApiError` shaklidan (status, message, problem) tahrir xatosini oladi; boshqa xato ham yiqitmaydi. */
export function readEditFailure(error: unknown): EditFailure {
  const e = (error ?? {}) as { status?: unknown; message?: unknown; problem?: Record<string, unknown> };
  const problem = e.problem ?? {};
  const min = typeof problem.min_amount === 'string' ? Number(problem.min_amount) : NaN;
  return {
    status: typeof e.status === 'number' ? e.status : 0,
    message: typeof e.message === 'string' ? e.message : '',
    code: typeof problem.code === 'string' ? problem.code : '',
    field: typeof problem.field === 'string' ? problem.field : '',
    minAmount: Number.isFinite(min) ? min : null,
  };
}

const TX_FIELD_OF_API: Record<string, TxField> = {
  amount: 'amount', category_id: 'category', title: 'title', notes: 'notes', tx_date: 'txDate', payment_method: 'method', reason: 'reason',
};
const DEBT_FIELD_OF_API: Record<string, DebtField> = {
  person_name: 'personName', phone: 'phone', debt_type: 'debtType', amount: 'amount', due_date: 'dueDate', notes: 'notes', reason: 'reason',
};

export const txFieldOf = (apiField: string): TxField | null => TX_FIELD_OF_API[apiField] ?? null;
export const debtFieldOf = (apiField: string): DebtField | null => DEBT_FIELD_OF_API[apiField] ?? null;

/** Server tahrirni rad etdi, yozuv esa o'zgargan/qulflangan: oyna yopilib, ro'yxat yangilanishi kerak. */
export const isRecordGone = (failure: EditFailure) => failure.status === 409 || failure.status === 404;
