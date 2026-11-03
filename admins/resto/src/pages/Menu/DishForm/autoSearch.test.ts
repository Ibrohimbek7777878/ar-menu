import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_SEARCH_MAX_NEW_QUERIES,
  AUTO_SEARCH_MIN_CHARS,
  AUTO_SEARCH_QUIET_MS,
  planAutoSearch,
  searchKey,
  searchQuery,
} from './autoSearch.ts';
import type { AutoSearchInput } from './autoSearch.ts';

const base = (over: Partial<AutoSearchInput> = {}): AutoSearchInput => ({
  name: 'Palov',
  hasImage: false,
  nameEdited: true,
  now: 10_000,
  lastEditAt: 10_000 - AUTO_SEARCH_QUIET_MS - 1,
  shownKey: null,
  dismissedKey: null,
  searchedKeys: new Set<string>(),
  newQueriesDone: 0,
  blocked: false,
  ...over,
});

test('yetarlicha tinch turilgach nom bo\'yicha qidiriladi', () => {
  assert.deepEqual(planAutoSearch(base()), { action: 'search', query: 'Palov', key: 'palov', isNew: true });
});

test('debounce: yozish davom etayotgan bo\'lsa qolgan vaqt aytiladi (900 ms gacha kutiladi)', () => {
  assert.deepEqual(planAutoSearch(base({ lastEditAt: 9_700 })), { action: 'wait', ms: AUTO_SEARCH_QUIET_MS - 300 });
  assert.deepEqual(planAutoSearch(base({ lastEditAt: 10_000 })), { action: 'wait', ms: AUTO_SEARCH_QUIET_MS });
  // aniq 900 ms o'tganda qidiriladi
  assert.equal(planAutoSearch(base({ lastEditAt: 10_000 - AUTO_SEARCH_QUIET_MS })).action, 'search');
  assert.equal(planAutoSearch(base({ lastEditAt: 10_000 - AUTO_SEARCH_QUIET_MS + 1 })).action, 'wait');
});

test('debounce: soat orqaga ketgan bo\'lsa ham kutish vaqti 900 ms dan oshmaydi', () => {
  const plan = planAutoSearch(base({ lastEditAt: 12_000 }));
  assert.deepEqual(plan, { action: 'wait', ms: AUTO_SEARCH_QUIET_MS });
});

test('3 belgidan qisqa nom qidirilmaydi (bo\'shliqlar sanalmaydi)', () => {
  assert.equal(AUTO_SEARCH_MIN_CHARS, 3);
  assert.deepEqual(planAutoSearch(base({ name: 'Pa' })), { action: 'skip', reason: 'too_short' });
  assert.deepEqual(planAutoSearch(base({ name: '  Pa  ' })), { action: 'skip', reason: 'too_short' });
  assert.deepEqual(planAutoSearch(base({ name: '' })), { action: 'skip', reason: 'too_short' });
  assert.equal(planAutoSearch(base({ name: 'Osh' })).action, 'search');
  // kirill va o'zbek harflari ham harf sifatida sanaladi
  assert.equal(planAutoSearch(base({ name: 'Ош' })).action, 'skip');
  assert.equal(planAutoSearch(base({ name: 'Плов' })).action, 'search');
});

test('rasm allaqachon bor bo\'lsa qidirilmaydi', () => {
  assert.deepEqual(planAutoSearch(base({ hasImage: true })), { action: 'skip', reason: 'has_image' });
});

test('egasi nomni o\'zgartirmagan bo\'lsa (tahrirlash ochilishidagi tayyor nom) qidirilmaydi', () => {
  assert.deepEqual(planAutoSearch(base({ nameEdited: false })), { action: 'skip', reason: 'not_edited' });
});

test('bir xil nom qayta qidirilmaydi (registr, bo\'shliq va apostrof farq qilmaydi)', () => {
  assert.deepEqual(planAutoSearch(base({ shownKey: 'palov' })), { action: 'skip', reason: 'already_shown' });
  assert.deepEqual(planAutoSearch(base({ name: '  PALOV  ', shownKey: 'palov' })), { action: 'skip', reason: 'already_shown' });
  assert.equal(searchKey("Lag‘mon"), searchKey("lag'mon"));
  assert.equal(searchKey("Sho`rva"), searchKey("SHOʻRVA"));
});

test('egasi yopgan takliflar o\'sha nom uchun qaytib chiqmaydi, yangi nomda chiqadi', () => {
  assert.deepEqual(planAutoSearch(base({ dismissedKey: 'palov' })), { action: 'skip', reason: 'dismissed' });
  assert.equal(planAutoSearch(base({ name: 'Palov dumba', dismissedKey: 'palov' })).action, 'search');
});

test('oldin qidirilgan nom qaytsa yangi so\'rov hisoblanmaydi (isNew=false) va chegaraga to\'sqinlik qilmaydi', () => {
  const searched = new Set(['palov']);
  const plan = planAutoSearch(base({ searchedKeys: searched, newQueriesDone: AUTO_SEARCH_MAX_NEW_QUERIES }));
  assert.deepEqual(plan, { action: 'search', query: 'Palov', key: 'palov', isNew: false });
});

test('bir forma ochilishida ko\'pi bilan 8 ta yangi nom qidiriladi', () => {
  assert.equal(AUTO_SEARCH_MAX_NEW_QUERIES, 8);
  assert.equal(planAutoSearch(base({ newQueriesDone: 7 })).action, 'search');
  assert.deepEqual(planAutoSearch(base({ newQueriesDone: 8 })), { action: 'skip', reason: 'limit' });
});

test('xato yoki chegara tugagandan keyin avtomatik qidiruv to\'xtaydi', () => {
  assert.deepEqual(planAutoSearch(base({ blocked: true })), { action: 'skip', reason: 'blocked' });
});

test('serverga yuboriladigan so\'z tozalanadi va 100 belgiga kesiladi', () => {
  assert.equal(searchQuery('  Palov   dumba  '), 'Palov dumba');
  assert.equal(searchQuery('x'.repeat(300)).length, 100);
  const plan = planAutoSearch(base({ name: `  ${'a'.repeat(150)}  ` }));
  assert.equal(plan.action === 'search' ? plan.query.length : 0, 100);
});

test('tartib: rasm bor bo\'lsa boshqa sabablardan oldin shu sabab aytiladi', () => {
  const plan = planAutoSearch(base({ hasImage: true, name: '', blocked: true }));
  assert.deepEqual(plan, { action: 'skip', reason: 'has_image' });
});
