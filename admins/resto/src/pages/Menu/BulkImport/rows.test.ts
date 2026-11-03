import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ROWS,
  PRICE_MAX,
  analyzeRows,
  applyCategoryToIncluded,
  buildCommitRequest,
  collectNewCategoryNames,
  countIncluded,
  countSmallPrices,
  describeRowError,
  effectiveMode,
  findBlockers,
  firstErrorRowId,
  formatPrice,
  groupRowErrors,
  hasBlockers,
  multiplyRowPrice,
  multiplySmallPrices,
  nameExistsActive,
  normalizeName,
  parsePriceInput,
  patchRow,
  resolveCategory,
  rowsFromParse,
  setAllIncluded,
  summarizePlan,
} from './rows.ts';
import type { CategoryOption, ParseResponse, ReviewRow } from './types.ts';

function makeRow(over: Partial<ReviewRow> = {}): ReviewRow {
  return {
    id: 'r1',
    include: true,
    name: 'Palov',
    price: 45000,
    category: '',
    categoryId: null,
    typingNewCategory: false,
    description: '',
    image: null,
    existingProductId: null,
    originalName: over.name ?? 'Palov',
    existingChoice: 'skip',
    lowConfidence: false,
    ...over,
  };
}

const CATEGORIES: CategoryOption[] = [
  { id: 3, name: 'Milliy taomlar' },
  { id: 4, name: 'Ichimliklar' },
];

test('normalizeName: harf registri, bo\'shliq va turli apostroflar farq qilmaydi', () => {
  assert.equal(normalizeName("  Lag'mon  "), normalizeName('LAGʻMON'));
  assert.equal(normalizeName('Qozon   kabob'), 'qozon kabob');
  assert.equal(normalizeName(''), '');
});

test('parsePriceInput: faqat raqamlar, bo\'sh -> null, 12 raqamdan ortig\'i kesiladi', () => {
  assert.equal(parsePriceInput('45 000'), 45000);
  assert.equal(parsePriceInput('45000 so\'m'), 45000);
  assert.equal(parsePriceInput(''), null);
  assert.equal(parsePriceInput('abc'), null);
  assert.equal(parsePriceInput('0'), 0);
  assert.equal(String(parsePriceInput('1234567890123456')).length, 12);
});

test('formatPrice: minglarga ajratadi', () => {
  assert.equal(formatPrice(45000), '45 000');
  assert.equal(formatPrice(1234567), '1 234 567');
  assert.equal(formatPrice(999), '999');
  assert.equal(formatPrice(null), '');
});

test('rowsFromParse: maydonlar, tartib raqami, rasm tokeni va mavjud bo\'lim', () => {
  const response: ParseResponse = {
    rows: [
      {
        row_id: 'r1',
        name: '  Palov  ',
        price: 45000,
        category: 'Milliy taomlar',
        description: 'Guruch, go\'sht',
        image_token: null,
        warnings: ['price_small'],
        existing_product_id: 9,
        existing_category_id: 3,
        duplicate_in_file: false,
      },
      { row_id: 'r2', name: 'Choy', price: null, category: 'Ichimliklar', warnings: ['low_confidence'], image_token: 'tok1' },
      { row_id: 'r3', name: 'Somsa', price: -5, category: 'Yangi bo\'lim' },
    ],
    categories: [{ name: 'Ichimliklar', existing_id: 4 }],
  };
  const rows = rowsFromParse(response, { startNumber: 11, localPreviewUrl: 'blob:abc' });
  assert.deepEqual(rows.map((r) => r.id), ['r11', 'r12', 'r13']);
  assert.equal(rows[0].name, 'Palov');
  assert.equal(rows[0].categoryId, 3);
  assert.equal(rows[0].existingProductId, 9);
  assert.equal(rows[0].existingChoice, 'skip', 'mavjud taomga standart holatda tegilmaydi');
  assert.equal(rows[0].include, true);
  // server `existing_category_id` bermagan bo'lsa, `categories` ro'yxatidan topiladi
  assert.equal(rows[1].categoryId, 4);
  assert.equal(rows[1].price, null);
  assert.equal(rows[1].lowConfidence, true);
  assert.deepEqual(rows[1].image, { token: 'tok1', previewUrl: 'blob:abc', fromInternet: false, credit: '', sourceUrl: '' });
  // manfiy narx yaroqsiz -> null; yangi bo'lim id siz
  assert.equal(rows[2].price, null);
  assert.equal(rows[2].categoryId, null);
  assert.equal(rows[2].image, null);
});

test('rowsFromParse: yetishmagan maydonlar xato bermaydi', () => {
  const rows = rowsFromParse({ rows: [{ row_id: 'x', name: 'Non' }] }, { startNumber: 1 });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].price, null);
  assert.equal(rows[0].category, '');
  assert.equal(rows[0].description, '');
  assert.deepEqual(rowsFromParse({ rows: undefined as never }, { startNumber: 1 }), []);
});

test('analyzeRows: narx ogohlantirishlari chegaralari', () => {
  const rows = [
    makeRow({ id: 'a', name: 'A', price: null }),
    makeRow({ id: 'b', name: 'B', price: 45 }),
    makeRow({ id: 'c', name: 'C', price: 999 }),
    makeRow({ id: 'd', name: 'D', price: 1000 }),
    makeRow({ id: 'e', name: 'E', price: 0 }),
    makeRow({ id: 'f', name: 'F', price: 5_000_000 }),
    makeRow({ id: 'g', name: 'G', price: 5_000_001 }),
  ];
  const w = analyzeRows(rows, CATEGORIES);
  assert.deepEqual(w.get('a'), ['price_missing']);
  assert.deepEqual(w.get('b'), ['price_small']);
  assert.deepEqual(w.get('c'), ['price_small']);
  assert.deepEqual(w.get('d'), []);
  assert.deepEqual(w.get('e'), []);
  assert.deepEqual(w.get('f'), []);
  assert.deepEqual(w.get('g'), ['price_large']);
});

test('analyzeRows: takror faqat keyingi qatorlarga, belgisi olingan qator hisobga olinmaydi', () => {
  const rows = [
    makeRow({ id: 'a', name: 'Palov' }),
    makeRow({ id: 'b', name: ' palov ' }),
    makeRow({ id: 'c', name: 'PALOV', include: false }),
    makeRow({ id: 'd', name: 'Choy' }),
  ];
  const w = analyzeRows(rows, CATEGORIES);
  assert.deepEqual(w.get('a'), []);
  assert.deepEqual(w.get('b'), ['duplicate_in_file']);
  assert.deepEqual(w.get('c'), [], 'belgisi olingan qatorda ogohlantirish yo\'q');
  assert.deepEqual(w.get('d'), []);
});

test('analyzeRows: mavjud nom nomi o\'zgarguncha amal qiladi', () => {
  const exists = makeRow({ id: 'a', name: 'Palov', existingProductId: 7, originalName: 'Palov' });
  assert.equal(nameExistsActive(exists), true);
  assert.deepEqual(analyzeRows([exists], CATEGORIES).get('a'), ['name_exists']);
  // apostrof/registr farqi bog'lanishni buzmaydi
  assert.equal(nameExistsActive({ ...exists, name: ' PALOV ' }), true);
  // nom o'zgardi -> bog'lanish yo'q, oddiy yangi taom
  const renamed = { ...exists, name: 'Palov to\'y' };
  assert.equal(nameExistsActive(renamed), false);
  assert.deepEqual(analyzeRows([renamed], CATEGORIES).get('a'), []);
  assert.equal(effectiveMode(renamed), 'create');
});

test('analyzeRows: yangi bo\'lim faqat yaratiladigan qatorlarda; mavjud nom yangi emas', () => {
  const rows = [
    makeRow({ id: 'a', name: 'A', category: 'Salatlar' }),
    makeRow({ id: 'b', name: 'B', category: 'milliy TAOMLAR' }),
    makeRow({ id: 'c', name: 'C', category: 'Milliy taomlar', categoryId: 3 }),
    makeRow({ id: 'd', name: 'D', category: 'Sho\'rvalar', existingProductId: 1, originalName: 'D', existingChoice: 'update' }),
    makeRow({ id: 'e', name: 'E', category: '' }),
  ];
  const w = analyzeRows(rows, CATEGORIES);
  assert.ok(w.get('a')?.includes('category_new'));
  assert.ok(!w.get('b')?.includes('category_new'));
  assert.ok(!w.get('c')?.includes('category_new'));
  assert.ok(!w.get('d')?.includes('category_new'), 'yangilanadigan qatorda bo\'lim ishlatilmaydi');
  assert.ok(!w.get('e')?.includes('category_new'));
});

test('analyzeRows: ogohlantirishlar muhimlik tartibida', () => {
  const rows = [
    makeRow({ id: 'a', name: 'Palov' }),
    makeRow({ id: 'b', name: 'Palov', price: null, category: 'Yangi', lowConfidence: true }),
  ];
  assert.deepEqual(analyzeRows(rows, CATEGORIES).get('b'), [
    'price_missing',
    'duplicate_in_file',
    'low_confidence',
    'category_new',
  ]);
});

test('effectiveMode: belgi va mavjud taom qarori', () => {
  assert.equal(effectiveMode(makeRow({ include: false })), 'skip');
  assert.equal(effectiveMode(makeRow()), 'create');
  const exists = { existingProductId: 5, originalName: 'Palov' };
  assert.equal(effectiveMode(makeRow({ ...exists, existingChoice: 'update' })), 'update');
  assert.equal(effectiveMode(makeRow({ ...exists, existingChoice: 'skip' })), 'skip');
  assert.equal(effectiveMode(makeRow({ ...exists, existingChoice: 'create' })), 'create');
});

test('x1000 tuzatish: faqat 1000 dan kichik narx, boshqasiga tegmaydi', () => {
  assert.equal(multiplyRowPrice(makeRow({ price: 45 })).price, 45000);
  assert.equal(multiplyRowPrice(makeRow({ price: 999 })).price, 999000);
  assert.equal(multiplyRowPrice(makeRow({ price: 45000 })).price, 45000);
  assert.equal(multiplyRowPrice(makeRow({ price: 0 })).price, 0);
  assert.equal(multiplyRowPrice(makeRow({ price: null })).price, null);
  assert.ok(multiplyRowPrice(makeRow({ price: 999 })).price! <= PRICE_MAX);
});

test('multiplySmallPrices: faqat belgilangan va kichik narxli qatorlar', () => {
  const rows = [
    makeRow({ id: 'a', name: 'A', price: 45 }),
    makeRow({ id: 'b', name: 'B', price: 45000 }),
    makeRow({ id: 'c', name: 'C', price: 38, include: false }),
    makeRow({ id: 'd', name: 'D', price: null }),
  ];
  assert.equal(countSmallPrices(rows), 1);
  const fixed = multiplySmallPrices(rows);
  assert.deepEqual(fixed.map((r) => r.price), [45000, 45000, 38, null]);
  assert.equal(countSmallPrices(fixed), 0);
  // asl massiv o'zgarmaydi
  assert.equal(rows[0].price, 45);
});

test('ommaviy amallar: hammasini belgilash/olib tashlash va bo\'lim berish', () => {
  const rows = [makeRow({ id: 'a', name: 'A' }), makeRow({ id: 'b', name: 'B', include: false })];
  assert.equal(countIncluded(rows), 1);
  assert.equal(countIncluded(setAllIncluded(rows, true)), 2);
  assert.equal(countIncluded(setAllIncluded(rows, false)), 0);

  const withCategory = applyCategoryToIncluded(rows, { name: 'Milliy taomlar', id: 3 });
  assert.equal(withCategory[0].category, 'Milliy taomlar');
  assert.equal(withCategory[0].categoryId, 3);
  assert.equal(withCategory[1].category, '', 'belgisi olinganga tegilmaydi');

  const patched = patchRow(rows, 'b', { name: 'Bb' });
  assert.equal(patched[1].name, 'Bb');
  assert.equal(patched[0], rows[0], 'boshqa qator o\'zgarmaydi');
});

test('resolveCategory: nom mavjud bo\'limga to\'g\'ri kelsa uning id si olinadi', () => {
  assert.deepEqual(resolveCategory({ category: 'ichimliklar', categoryId: null }, CATEGORIES), { name: 'Ichimliklar', id: 4 });
  assert.deepEqual(resolveCategory({ category: 'Salatlar', categoryId: null }, CATEGORIES), { name: 'Salatlar', id: null });
  assert.deepEqual(resolveCategory({ category: '', categoryId: null }, CATEGORIES), { name: '', id: null });
  assert.deepEqual(resolveCategory({ category: 'x', categoryId: 3 }, CATEGORIES), { name: 'Milliy taomlar', id: 3 });
});

test('collectNewCategoryNames: takrorsiz, mavjudlar chiqmaydi', () => {
  const rows = [
    makeRow({ id: 'a', name: 'A', category: 'Salatlar' }),
    makeRow({ id: 'b', name: 'B', category: 'salatlar' }),
    makeRow({ id: 'c', name: 'C', category: 'Ichimliklar' }),
    makeRow({ id: 'd', name: 'D', category: 'Sho\'rva' }),
  ];
  assert.deepEqual(collectNewCategoryNames(rows, CATEGORIES), ['Salatlar', 'Sho\'rva']);
});

test('summarizePlan: 48 yangi, 2 yangilanadi, 3 tashlab ketiladi, yangi bo\'limlar', () => {
  const rows: ReviewRow[] = [];
  for (let i = 1; i <= 48; i += 1) {
    rows.push(makeRow({ id: `r${i}`, name: `Taom ${i}`, category: i % 2 ? 'Salatlar' : 'Milliy taomlar' }));
  }
  rows.push(makeRow({ id: 'u1', name: 'Mavjud 1', existingProductId: 1, originalName: 'Mavjud 1', existingChoice: 'update', category: 'Yangi bo\'lim 2' }));
  rows.push(makeRow({ id: 'u2', name: 'Mavjud 2', existingProductId: 2, originalName: 'Mavjud 2', existingChoice: 'update' }));
  rows.push(makeRow({ id: 's1', name: 'Mavjud 3', existingProductId: 3, originalName: 'Mavjud 3', existingChoice: 'skip' }));
  rows.push(makeRow({ id: 's2', name: 'O\'chirilgan', include: false }));
  rows.push(makeRow({ id: 's3', name: 'O\'chirilgan 2', include: false }));
  const plan = summarizePlan(rows, CATEGORIES);
  assert.equal(plan.created, 48);
  assert.equal(plan.updated, 2);
  assert.equal(plan.skipped, 3);
  assert.deepEqual(plan.newCategories, ['Salatlar'], 'yangilanadigan qatordagi bo\'lim yangi bo\'lim yaratmaydi');
});

test('findBlockers: narxsiz, nomsiz, juda ko\'p va bo\'sh holat', () => {
  assert.equal(findBlockers([]).nothingToWrite, true);
  assert.equal(hasBlockers(findBlockers([])), true);

  const ok = findBlockers([makeRow()]);
  assert.equal(hasBlockers(ok), false);

  const bad = findBlockers([
    makeRow({ id: 'a', name: 'A', price: null }),
    makeRow({ id: 'b', name: '   ' }),
    makeRow({ id: 'c', name: 'C', price: null, include: false }),
  ]);
  assert.equal(bad.missingPrice, 1);
  assert.equal(bad.missingName, 1);
  assert.equal(hasBlockers(bad), true);

  const many: ReviewRow[] = [];
  for (let i = 0; i <= MAX_ROWS; i += 1) many.push(makeRow({ id: `r${i}`, name: `T${i}` }));
  assert.equal(findBlockers(many).tooMany, true);
  assert.equal(findBlockers(many.slice(0, MAX_ROWS)).tooMany, false);
});

test('buildCommitRequest: faqat yoziladigan qatorlar, to\'g\'ri shakl', () => {
  const rows: ReviewRow[] = [
    makeRow({
      id: 'r1',
      name: ' Palov ',
      price: 45000,
      category: 'milliy taomlar',
      description: '  Guruch  ',
      image: { token: 'T1', previewUrl: 'x', fromInternet: true, credit: 'A · CC BY', sourceUrl: '' },
    }),
    makeRow({ id: 'r2', name: 'Salat', category: 'Yangi', categoryId: null }),
    makeRow({ id: 'r3', name: 'Mavjud', existingProductId: 9, originalName: 'Mavjud', existingChoice: 'update', category: 'Yangi' }),
    makeRow({ id: 'r4', name: 'Tashlanadi', existingProductId: 10, originalName: 'Tashlanadi', existingChoice: 'skip' }),
    makeRow({ id: 'r5', name: 'Belgisiz', include: false }),
  ];
  const request = buildCommitRequest(rows, CATEGORIES, 'uuid-1');
  assert.equal(request.submission_id, 'uuid-1');
  assert.deepEqual(request.rows.map((r) => [r.row_id, r.mode]), [
    ['r1', 'create'],
    ['r2', 'create'],
    ['r3', 'update'],
  ]);
  assert.deepEqual(request.rows[0], {
    row_id: 'r1',
    name: 'Palov',
    price: 45000,
    category: 'Milliy taomlar',
    category_id: 3,
    description: 'Guruch',
    mode: 'create',
    existing_product_id: null,
    image_token: 'T1',
  });
  assert.equal(request.rows[1].category, 'Yangi');
  assert.equal(request.rows[1].category_id, null);
  assert.ok(!('image_token' in request.rows[1]), 'rasm bo\'lmasa kalit yuborilmaydi');
  assert.equal(request.rows[2].existing_product_id, 9);
  assert.equal(request.rows[2].category, '', 'yangilashda bo\'lim yuborilmaydi');
  assert.equal(request.rows[2].category_id, null);
});

test('buildCommitRequest: "baribir qo\'shish" yangi taom yaratadi (mavjud id siz)', () => {
  const row = makeRow({ existingProductId: 5, originalName: 'Palov', existingChoice: 'create' });
  const [item] = buildCommitRequest([row], CATEGORIES, 'u').rows;
  assert.equal(item.mode, 'create');
  assert.equal(item.existing_product_id, null);
});

test('qator-xatolarni birlashtirish: qatorga biriktiriladi, noma\'lum qator alohida', () => {
  const rows = [makeRow({ id: 'r1', name: 'A' }), makeRow({ id: 'r2', name: 'B' }), makeRow({ id: 'r3', name: 'C' })];
  const grouped = groupRowErrors(
    [
      { row_id: 'r3', field: 'price', message: 'Narx noto\'g\'ri' },
      { row_id: 'r2', field: 'name', message: 'Nom juda uzun' },
      { row_id: 'r2', field: 'price', message: 'Narx katta' },
      { row_id: 'zzz', message: 'Noma\'lum qator' },
    ],
    rows,
  );
  assert.equal(grouped.byRow.r2.length, 2);
  assert.equal(grouped.byRow.r3.length, 1);
  assert.equal(grouped.byRow.r1, undefined);
  assert.equal(grouped.orphans.length, 1);
  assert.equal(firstErrorRowId(rows, grouped.byRow), 'r2', 'ro\'yxat tartibidagi birinchi xatoli qator');
  assert.equal(firstErrorRowId(rows, {}), null);
});

test('describeRowError: maydon yorlig\'i odam tilida, noma\'lum maydon uchun xom nom chiqmaydi', () => {
  const labels = { price: 'Narx', name: 'Nomi' };
  assert.equal(describeRowError({ row_id: 'r1', field: 'price', message: 'Juda katta' }, labels), 'Narx: Juda katta');
  assert.equal(describeRowError({ row_id: 'r1', field: 'weird_field', message: 'Xato' }, labels), 'Xato');
  assert.equal(describeRowError({ row_id: 'r1', field: '__proto__', message: 'Xato' }, labels), 'Xato');
  assert.equal(describeRowError({ row_id: 'r1', field: 'price', message: '' }, labels), 'Narx');
});
