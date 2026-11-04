import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REASON_MAX,
  REASON_MIN,
  debtFieldOf,
  debtFormFromRow,
  debtPatchBody,
  debtStatusAfterAmount,
  debtTypeLocked,
  diffDebtForm,
  diffTxForm,
  formatHistoryValue,
  formatMoneyParts,
  isLegacyReason,
  isReasonOk,
  LEGACY_PANEL_REASON,
  isRecordGone,
  moneyImpact,
  originalLines,
  parseMoney,
  readEditFailure,
  reasonMessage,
  reasonState,
  revisionLines,
  sameMoney,
  txFieldOf,
  txFormFromRow,
  txPatchBody,
  validateDebtForm,
  validateTxForm,
  type CategoryLike,
  type DebtRowLike,
  type RevisionLike,
  type Translate,
  type TxRowLike,
} from './editModel.ts';

/** Tarjima o'rniga: kalitning o'zini qaytaradi, {param} larni to'ldiradi */
const tr: Translate = (key, params) => key.replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? `{${name}}`));
const fmt = (n: number) => `${n.toLocaleString('en-US').replace(/,/g, ' ')} so'm`;

const categories: CategoryLike[] = [
  { id: 1, name: "Go'sht" },
  { id: 2, name: 'Ijara' },
];

const tx = (over: Partial<TxRowLike> = {}): TxRowLike => ({
  id: 7, type: 'expense', amount: 100000, category_id: 1, category_name: "Go'sht", title: 'Bozorlik', notes: 'Chek yo`q',
  tx_date: '2026-11-01', payment_method: 'cash', revisions_count: 0, ...over,
});

const debt = (over: Partial<DebtRowLike> = {}): DebtRowLike => ({
  id: 3, person_name: 'Akmal', phone: '+998901112233', debt_type: 'customer', initial_amount: 500000, paid_amount: 0,
  due_date: '2026-12-01', notes: 'Ziyofat', revisions_count: 0, ...over,
});

// ─── parseMoney ───────────────────────────────────────────────────────────────────────────────────

test('parseMoney: bo`sh joy, vergul, kasr; yaroqsiz va chegaradan tashqari -> null', () => {
  assert.equal(parseMoney('150000'), 150000);
  assert.equal(parseMoney('150 000'), 150000);
  assert.equal(parseMoney('1 500,50'), 1500.5);
  assert.equal(parseMoney('0.01'), 0.01);
  for (const bad of ['', '  ', '0', '-5', 'abc', '1e5', '1.234', '1,5,5', '1.500.000', '999999999999.99x']) assert.equal(parseMoney(bad), null, bad);
  assert.equal(parseMoney('1000000000000'), null);
  assert.equal(parseMoney('999999999999.99'), 999999999999.99);
});

test('sameMoney: tiyin aniqligida', () => {
  assert.ok(sameMoney(100000, 100000.0));
  assert.ok(sameMoney(0.1 + 0.2, 0.3));
  assert.ok(!sameMoney(100000, 100000.01));
});

// ─── Sabab ────────────────────────────────────────────────────────────────────────────────────────

test('reasonState: chegaralar 5 va 300, chetidagi bo`sh joy hisobga olinmaydi', () => {
  assert.equal(reasonState(''), 'empty');
  assert.equal(reasonState('    '), 'empty');
  assert.equal(reasonState('abcd'), 'short');
  assert.equal(reasonState('  abcd  '), 'short');
  assert.equal(reasonState('abcde'), 'ok');
  assert.equal(reasonState('x'.repeat(REASON_MAX)), 'ok');
  assert.equal(reasonState('x'.repeat(REASON_MAX + 1)), 'long');
  assert.equal(REASON_MIN, 5);
  assert.ok(isReasonOk('Chek bilan solishtirildi'));
  assert.ok(!isReasonOk('Yo`q'));
});

test('isLegacyReason: faqat server belgisi (foydalanuvchi matni tarjima qilinmaydi)', () => {
  assert.ok(isLegacyReason(LEGACY_PANEL_REASON));
  assert.ok(!isLegacyReason('Chek bilan solishtirildi'));
  assert.ok(!isLegacyReason(''));
});

test('reasonMessage: faqat qisqa va uzun sababda xabar bor (bo`sh — ko`rsatma, xato emas)', () => {
  assert.equal(reasonMessage('ok', tr), '');
  assert.equal(reasonMessage('empty', tr), '');
  assert.match(reasonMessage('short', tr), /kamida 5 belgi/);
  assert.match(reasonMessage('long', tr), /300/);
});

test('formatMoneyParts: butun summa guruhlanadi, tiyin kasr sifatida saqlanadi (yaxlitlanmaydi)', () => {
  const group = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
  assert.equal(formatMoneyParts(170000, group, ','), '170 000');
  assert.equal(formatMoneyParts(170000.5, group, ','), '170 000,50');
  assert.equal(formatMoneyParts(1500.05, group, '.'), '1 500.05');
  assert.equal(formatMoneyParts(0.01, group, ','), '0,01');
  assert.equal(formatMoneyParts(999999999999.99, group, ','), '999 999 999 999,99');
  assert.equal(formatMoneyParts(-250.5, group, ','), '-250,50');
});

// ─── Kassa operatsiyasi ───────────────────────────────────────────────────────────────────────────

test('txFormFromRow: joriy qiymatlar formada', () => {
  assert.deepEqual(txFormFromRow(tx()), { amount: '100000', categoryId: '1', title: 'Bozorlik', notes: 'Chek yo`q', txDate: '2026-11-01', method: 'cash' });
  assert.equal(txFormFromRow(tx({ category_id: null })).categoryId, '');
  assert.equal(txFormFromRow(tx({ notes: undefined })).notes, '');
  assert.equal(txFormFromRow(tx({ payment_method: 'crypto' })).method, 'cash');
});

test('diffTxForm: o`zgarmagan forma — bo`sh farq', () => {
  const row = tx();
  assert.deepEqual(diffTxForm(row, txFormFromRow(row), categories, tr, fmt), []);
});

test('diffTxForm: faqat o`zgargan maydonlar, eski -> yangi, tartib bilan', () => {
  const row = tx();
  const form = { ...txFormFromRow(row), amount: '175 000', categoryId: '2', notes: '', method: 'card' as const, txDate: '2026-10-30' };
  const lines = diffTxForm(row, form, categories, tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['amount', 'category', 'notes', 'tx_date', 'payment_method']);
  assert.deepEqual(lines[0], { field: 'amount', label: 'Summa', before: "100 000 so'm", after: "175 000 so'm" });
  assert.deepEqual([lines[1].before, lines[1].after], ["Go'sht", 'Ijara']);
  assert.deepEqual([lines[2].before, lines[2].after], ['Chek yo`q', '—']);
  assert.deepEqual([lines[3].before, lines[3].after], ['2026-11-01', '2026-10-30']);
  assert.deepEqual([lines[4].before, lines[4].after], ['Naqd pul', 'Plastik / Karta']);
});

test('diffTxForm: kategoriya olib tashlansa "Umumiy"; bo`sh joyli bir xil matn o`zgarish emas', () => {
  const row = tx();
  const cleared = diffTxForm(row, { ...txFormFromRow(row), categoryId: '' }, categories, tr, fmt);
  assert.deepEqual([cleared[0].before, cleared[0].after], ["Go'sht", 'Umumiy']);
  assert.deepEqual(diffTxForm(row, { ...txFormFromRow(row), title: '  Bozorlik  ' }, categories, tr, fmt), []);
  assert.deepEqual(diffTxForm(row, { ...txFormFromRow(row), amount: '100000.00' }, categories, tr, fmt), []);
});

test('diffTxForm: yaroqsiz summa hali farq emas (tekshiruv alohida xabar beradi)', () => {
  const row = tx();
  assert.deepEqual(diffTxForm(row, { ...txFormFromRow(row), amount: 'abc' }, categories, tr, fmt), []);
});

test('moneyImpact: kirim/chiqim va ko`payish/kamayish', () => {
  const income = tx({ type: 'income' });
  assert.equal(moneyImpact(income, { ...txFormFromRow(income), amount: '130000' }, tr, fmt), "Jami kirim 30 000 so'm ga ko'payadi");
  assert.equal(moneyImpact(income, { ...txFormFromRow(income), amount: '90000' }, tr, fmt), "Jami kirim 10 000 so'm ga kamayadi");
  const expense = tx();
  assert.equal(moneyImpact(expense, { ...txFormFromRow(expense), amount: '125000' }, tr, fmt), "Jami chiqim 25 000 so'm ga ko'payadi");
  assert.equal(moneyImpact(expense, { ...txFormFromRow(expense), amount: '75000' }, tr, fmt), "Jami chiqim 25 000 so'm ga kamayadi");
  assert.equal(moneyImpact(expense, txFormFromRow(expense), tr, fmt), null);
  assert.equal(moneyImpact(expense, { ...txFormFromRow(expense), amount: 'x' }, tr, fmt), null);
});

test('validateTxForm: summa, mazmun, sana, sabab', () => {
  const row = tx();
  const base = txFormFromRow(row);
  assert.deepEqual(validateTxForm(base, 'Sabab yozildi', '2026-11-03'), {});
  assert.equal(validateTxForm({ ...base, amount: '0' }, 'Sabab yozildi', '2026-11-03').amount, 'invalid');
  assert.equal(validateTxForm({ ...base, title: '  ' }, 'Sabab yozildi', '2026-11-03').title, 'required');
  assert.equal(validateTxForm({ ...base, txDate: '2026-11-04' }, 'Sabab yozildi', '2026-11-03').txDate, 'future');
  assert.equal(validateTxForm({ ...base, txDate: '' }, 'Sabab yozildi', '2026-11-03').txDate, 'invalid');
  assert.equal(validateTxForm(base, 'abc', '2026-11-03').reason, 'short');
  assert.equal(validateTxForm(base, 'x'.repeat(301), '2026-11-03').reason, 'long');
  // bo'sh sabab xato kodi emas: "Saqlash" o'chiq turadi, lekin maydon qizarmaydi
  assert.equal(validateTxForm(base, '', '2026-11-03').reason, undefined);
});

test('txPatchBody: faqat o`zgargan maydonlar + sabab + ko`rilgan tahrirlar soni; summa satr', () => {
  const row = tx({ revisions_count: 2 });
  const form = { ...txFormFromRow(row), amount: '1 500,5', categoryId: '', title: ' Yangi ', method: 'bank' as const };
  assert.deepEqual(txPatchBody(row, form, '  Chek bilan solishtirildi '), {
    reason: 'Chek bilan solishtirildi', expected_revision: 2, amount: '1500.5', category_id: null, title: 'Yangi', payment_method: 'bank',
  });
  assert.deepEqual(txPatchBody(row, txFormFromRow(row), 'Sabab bor'), { reason: 'Sabab bor', expected_revision: 2 });
  const toCategory = txPatchBody(row, { ...txFormFromRow(row), categoryId: '2', txDate: '2026-10-01', notes: 'yangi izoh' }, 'Sabab bor');
  assert.equal(toCategory.category_id, 2);
  assert.equal(toCategory.tx_date, '2026-10-01');
  assert.equal(toCategory.notes, 'yangi izoh');
});

// ─── Qarz ─────────────────────────────────────────────────────────────────────────────────────────

test('validateDebtForm: umumiy summa to`langandan kichik bo`lmasin', () => {
  const d = debt({ paid_amount: 200000 });
  const form = debtFormFromRow(d);
  assert.deepEqual(validateDebtForm(d, form, 'Sabab yozildi'), {});
  assert.equal(validateDebtForm(d, { ...form, amount: '199999' }, 'Sabab yozildi').amount, 'below_paid');
  assert.deepEqual(validateDebtForm(d, { ...form, amount: '200000' }, 'Sabab yozildi'), {});    // aynan to'langan summa: qarz yopiladi
  assert.equal(validateDebtForm(d, { ...form, amount: '' }, 'Sabab yozildi').amount, 'invalid');
  assert.equal(validateDebtForm(d, { ...form, personName: ' ' }, 'Sabab yozildi').personName, 'required');
  assert.equal(validateDebtForm(d, { ...form, dueDate: '01.12.2026' }, 'Sabab yozildi').dueDate, 'invalid');
  assert.equal(validateDebtForm(d, { ...form, dueDate: '' }, 'Sabab yozildi').dueDate, undefined);   // muddat ixtiyoriy
});

test('diffDebtForm / debtPatchBody: faqat o`zgarganlar; muddatni olib tashlash null', () => {
  const d = debt({ revisions_count: 1 });
  const form = { ...debtFormFromRow(d), personName: 'Akmal Karimov', amount: '600000', dueDate: '', notes: 'Yangi izoh', debtType: 'supplier' as const };
  const lines = diffDebtForm(d, form, tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['person_name', 'debt_type', 'amount', 'due_date', 'notes']);
  assert.deepEqual([lines[1].before, lines[1].after], ['Mijoz nasiyasi', 'Yetkazib beruvchi']);
  assert.deepEqual([lines[3].before, lines[3].after], ['2026-12-01', '—']);
  assert.deepEqual(debtPatchBody(d, form, 'Kelishuv o`zgardi'), {
    reason: 'Kelishuv o`zgardi', expected_revision: 1, person_name: 'Akmal Karimov', debt_type: 'supplier', amount: '600000', due_date: null, notes: 'Yangi izoh',
  });
  assert.deepEqual(diffDebtForm(d, debtFormFromRow(d), tr, fmt), []);
  assert.deepEqual(debtPatchBody(d, debtFormFromRow(d), 'Sabab bor'), { reason: 'Sabab bor', expected_revision: 1 });
});

test('debtTypeLocked va debtStatusAfterAmount', () => {
  assert.equal(debtTypeLocked(debt()), false);
  assert.equal(debtTypeLocked(debt({ paid_amount: 1 })), true);
  const settled = debt({ initial_amount: 200000, paid_amount: 200000 });
  assert.match(debtStatusAfterAmount(settled, { ...debtFormFromRow(settled), amount: '250000' }, tr) ?? '', /yana ochiladi/);
  const partial = debt({ paid_amount: 200000 });
  assert.match(debtStatusAfterAmount(partial, { ...debtFormFromRow(partial), amount: '200000' }, tr) ?? '', /yopiladi/);
  assert.equal(debtStatusAfterAmount(partial, { ...debtFormFromRow(partial), amount: '600000' }, tr), null);
  assert.equal(debtStatusAfterAmount(debt(), { ...debtFormFromRow(debt()), amount: '600000' }, tr), null);    // to'lov yo'q: holat o'zgarmaydi
});

// ─── Tarix ────────────────────────────────────────────────────────────────────────────────────────

const revision = (changes: RevisionLike['changes'], over: Partial<RevisionLike> = {}): RevisionLike => ({
  id: 1, revision_no: 1, changed_at: '2026-11-03T10:00:00+05:00', changed_by: { id: 4, name: 'Malika', role: 'shop_manager' }, reason: 'Sabab bor', changes, ...over,
});

test('revisionLines: summa formatlanadi, kodlar o`zbekcha nomga aylanadi, tartib ruxsat etilgan', () => {
  const lines = revisionLines('transaction', revision({
    payment_method: { old: 'cash', new: 'bank' },
    category: { old: null, new: 'Ijara' },
    amount: { old: '100000.00', new: '175000.50' },
  }), tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['amount', 'category', 'payment_method']);
  assert.deepEqual([lines[0].before, lines[0].after], ["100 000 so'm", "175 000.5 so'm"]);
  assert.deepEqual([lines[1].before, lines[1].after], ['Umumiy', 'Ijara']);
  assert.deepEqual([lines[2].before, lines[2].after], ['Naqd pul', 'Bank hisobi']);
});

test('revisionLines (qarz): holat va yo`nalish nomlari; noma`lum maydon yashirilmaydi', () => {
  const lines = revisionLines('debt', revision({
    status: { old: 'partial', new: 'settled' }, debt_type: { old: 'customer', new: 'supplier' }, due_date: { old: '2026-12-01', new: null }, shop_secret: { old: 'a', new: 'b' },
  }), tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['debt_type', 'due_date', 'status', 'shop_secret']);
  assert.deepEqual([lines[0].before, lines[0].after], ['Mijoz nasiyasi', 'Yetkazib beruvchi']);
  assert.deepEqual([lines[1].before, lines[1].after], ['2026-12-01', '—']);
  assert.deepEqual([lines[2].before, lines[2].after], ["Qisman to'langan", "To'liq yopilgan"]);
  assert.equal(lines[3].label, 'shop_secret');
});

test('originalLines: asl qiymatlar tartibda', () => {
  const lines = originalLines('transaction', { payment_method: 'cash', amount: '100000.00', category: null, title: 'Bozorlik', notes: '', tx_date: '2026-11-01' }, tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['amount', 'category', 'title', 'notes', 'tx_date', 'payment_method']);
  assert.deepEqual(lines.map((l) => l.value), ["100 000 so'm", 'Umumiy', 'Bozorlik', '—', '2026-11-01', 'Naqd pul']);
});

test('formatHistoryValue: yaroqsiz summa yiqitmaydi', () => {
  assert.equal(formatHistoryValue('transaction', 'amount', null, tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'amount', 'abc', tr, fmt), '—');
  assert.equal(formatHistoryValue('debt', 'status', 'nomalum', tr, fmt), 'nomalum');
});

test('formatHistoryValue: mantiqiy va son qiymat yiqitmaydi (orDash String(value) bilan)', () => {
  // eski panel hidden/cancelled ni bool saqlaydi; server 'true'/'false' satr beradi, lekin xom bool/son ham kelsa yiqilmasin
  assert.equal(formatHistoryValue('transaction', 'notes', false, tr, fmt), 'false');
  assert.equal(formatHistoryValue('transaction', 'notes', true, tr, fmt), 'true');
  assert.equal(formatHistoryValue('transaction', 'title', 0, tr, fmt), '0');
  assert.equal(formatHistoryValue('debt', 'phone', 998901112233, tr, fmt), '998901112233');
  assert.equal(formatHistoryValue('transaction', 'notes', '   ', tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'notes', '', tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'notes', null, tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'notes', undefined, tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'category', true, tr, fmt), 'true');
  assert.equal(formatHistoryValue('transaction', 'amount', true, tr, fmt), '—', 'bool summa emas');
  assert.equal(formatHistoryValue('transaction', 'amount', '', tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'amount', 250000, tr, fmt), "250 000 so'm");
});

test("formatHistoryValue: hidden/cancelled 'true'/'false' -> Ha/Yo'q; tur, to'langan summa", () => {
  for (const field of ['hidden', 'cancelled']) {
    assert.equal(formatHistoryValue('transaction', field, 'true', tr, fmt), 'Ha');
    assert.equal(formatHistoryValue('transaction', field, 'false', tr, fmt), "Yo'q");
    assert.equal(formatHistoryValue('debt', field, true, tr, fmt), 'Ha');
    assert.equal(formatHistoryValue('debt', field, false, tr, fmt), "Yo'q");
    assert.equal(formatHistoryValue('transaction', field, 'TRUE', tr, fmt), 'Ha');
    assert.equal(formatHistoryValue('transaction', field, null, tr, fmt), '—');
    assert.equal(formatHistoryValue('transaction', field, 'noma`lum', tr, fmt), 'noma`lum', 'tushunarsiz qiymat yashirilmaydi');
  }
  assert.equal(formatHistoryValue('transaction', 'tx_type', 'income', tr, fmt), 'Kirim');
  assert.equal(formatHistoryValue('transaction', 'tx_type', 'expense', tr, fmt), 'Chiqim');
  assert.equal(formatHistoryValue('transaction', 'tx_type', 'boshqa', tr, fmt), 'boshqa');
  assert.equal(formatHistoryValue('debt', 'paid_amount', '120000.50', tr, fmt), "120 000.5 so'm");
  assert.equal(formatHistoryValue('debt', 'paid_amount', null, tr, fmt), '—');
  assert.equal(formatHistoryValue('transaction', 'stage', 'Yangi', tr, fmt), 'Yangi', 'bosqich nomi serverda tayyor keladi');
});

test("revisionLines: eski panel maydonlari (stage, tx_type, hidden, cancelled, cancel_reason) xom nomsiz ko'rinadi", () => {
  const lines = revisionLines('transaction', revision({
    hidden: { old: 'false', new: 'true' },
    cancel_reason: { old: '', new: 'Adashib kiritilgan' },
    cancelled: { old: 'false', new: 'true' },
    stage: { old: 'Yangi', new: 'Tasdiqlangan' },
    tx_type: { old: 'expense', new: 'income' },
    amount: { old: '100.00', new: '200.00' },
  }), tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['amount', 'tx_type', 'stage', 'cancelled', 'cancel_reason', 'hidden']);
  assert.deepEqual(lines.map((l) => l.label), ['Summa', 'Tur', 'Ustun/bosqich', 'Bekor qilingan', 'Bekor qilish sababi', 'Yashirilgan']);
  assert.deepEqual(lines.map((l) => [l.before, l.after]), [
    ["100 so'm", "200 so'm"],
    ['Chiqim', 'Kirim'],
    ['Yangi', 'Tasdiqlangan'],
    ["Yo'q", 'Ha'],
    ['—', 'Adashib kiritilgan'],
    ["Yo'q", 'Ha'],
  ]);
  for (const line of lines) assert.notEqual(line.label, line.field, `${line.field}: xom kod yorliq bo'lib qolgan`);
});

test("revisionLines (qarz): to'lov (paid_amount, status) va yashirish xom nomsiz ko'rinadi", () => {
  const lines = revisionLines('debt', revision({
    hidden: { old: 'false', new: 'true' },
    status: { old: 'pending', new: 'partial' },
    paid_amount: { old: '0.00', new: '150000.00' },
  }), tr, fmt);
  assert.deepEqual(lines.map((l) => l.field), ['paid_amount', 'status', 'hidden']);
  assert.deepEqual(lines.map((l) => l.label), ["To'langan summa", 'Holat', 'Yashirilgan']);
  assert.deepEqual(lines.map((l) => [l.before, l.after]), [["0 so'm", "150 000 so'm"], ['Ochiq qarz', "Qisman to'langan"], ["Yo'q", 'Ha']]);
});

test("originalLines: asl qiymatda ham yashirilgan/bekor qilingan yorlig'i va Ha/Yo'q", () => {
  const lines = originalLines('transaction', { amount: '100000.00', hidden: 'false', cancelled: 'false', tx_type: 'income', stage: 'Yangi' }, tr, fmt);
  assert.deepEqual(lines.map((l) => [l.label, l.value]), [
    ['Summa', "100 000 so'm"],
    ['Tur', 'Kirim'],
    ['Ustun/bosqich', 'Yangi'],
    ['Bekor qilingan', "Yo'q"],
    ['Yashirilgan', "Yo'q"],
  ]);
});

// ─── Server xatosi ────────────────────────────────────────────────────────────────────────────────

test('readEditFailure: ApiError shaklidan kod, maydon va eng kichik summa', () => {
  const err = Object.assign(new Error('Umumiy summa'), { status: 400, problem: { code: 'below_paid', field: 'amount', min_amount: '200000.00' } });
  assert.deepEqual(readEditFailure(err), { status: 400, message: 'Umumiy summa', code: 'below_paid', field: 'amount', minAmount: 200000 });
  assert.deepEqual(readEditFailure(null), { status: 0, message: '', code: '', field: '', minAmount: null });
  assert.deepEqual(readEditFailure(new Error('tarmoq')), { status: 0, message: 'tarmoq', code: '', field: '', minAmount: null });
});

test('maydon xaritasi va "yozuv o`zgargan" belgisi', () => {
  assert.equal(txFieldOf('tx_date'), 'txDate');
  assert.equal(txFieldOf('category_id'), 'category');
  assert.equal(txFieldOf('boshqa'), null);
  assert.equal(debtFieldOf('person_name'), 'personName');
  assert.equal(debtFieldOf('due_date'), 'dueDate');
  assert.ok(isRecordGone({ status: 409, message: '', code: 'stale', field: '', minAmount: null }));
  assert.ok(isRecordGone({ status: 404, message: '', code: '', field: '', minAmount: null }));
  assert.ok(!isRecordGone({ status: 400, message: '', code: 'no_changes', field: '', minAmount: null }));
});
