import test from 'node:test';
import assert from 'node:assert/strict';
import { determinePollNeeds } from '../src/utils/pollerRoute.ts';

test('determinePollNeeds: /admin boshqaruv markazida moliya so\'rovi yuborilmaydi (TZ 0.5)', () => {
  const needs = determinePollNeeds('admin', '/admin');
  assert.equal(needs.wantsFinance, false, '/admin marshrutida wantsFinance false bo\'lishi shart');
  assert.equal(needs.wantsOrders, true, 'boshqaruv markazida buyurtmalar olinadi');
  assert.equal(needs.wantsTables, true, 'boshqaruv markazida stollar olinadi');
  assert.equal(needs.wantsCalls, false, 'chaqiruvlar ofitsiantga tegishli');
});

test('determinePollNeeds: /menu/admin yoki /admin/dashboard da ham moliya so\'rovi yuborilmaydi', () => {
  const needs1 = determinePollNeeds('admin', '/menu/admin');
  assert.equal(needs1.wantsFinance, false);

  const needs2 = determinePollNeeds('admin', '/admin/dashboard');
  assert.equal(needs2.wantsFinance, false);
});

test('determinePollNeeds: faqat moliya sahifasi (/finance yoki /menu/finance) ochilganda moliya so\'raladi', () => {
  const fin1 = determinePollNeeds('admin', '/menu/finance');
  assert.equal(fin1.wantsFinance, true);
  assert.equal(fin1.wantsOrders, false);
  assert.equal(fin1.wantsTables, false);

  const fin2 = determinePollNeeds('admin', '/finance');
  assert.equal(fin2.wantsFinance, true);

  // Admin bo'lmagan xodim moliya ochsa ham unga ruxsat yo'q
  const finWaiter = determinePollNeeds('waiter', '/finance');
  assert.equal(finWaiter.wantsFinance, false);
});

test('determinePollNeeds: /kds va /kitchen marshrutlarida faqat buyurtmalar olinadi', () => {
  const kds = determinePollNeeds('kitchen', '/kds');
  assert.equal(kds.wantsOrders, true);
  assert.equal(kds.wantsTables, false);
  assert.equal(kds.wantsCalls, false);
  assert.equal(kds.wantsFinance, false);

  const kitchen = determinePollNeeds('kitchen', '/menu/kitchen');
  assert.equal(kitchen.wantsOrders, true);
  assert.equal(kitchen.wantsTables, false);
});

test('determinePollNeeds: /waiter marshrutida buyurtmalar, stollar va chaqiruvlar olinadi', () => {
  const waiter = determinePollNeeds('waiter', '/waiter');
  assert.equal(waiter.wantsOrders, true);
  assert.equal(waiter.wantsTables, true);
  assert.equal(waiter.wantsCalls, true);
  assert.equal(waiter.wantsFinance, false);
});

test('determinePollNeeds: /arrival va /hostess da faqat stollar olinadi', () => {
  const hostess = determinePollNeeds('hostess', '/arrival');
  assert.equal(hostess.wantsOrders, false);
  assert.equal(hostess.wantsTables, true);
  assert.equal(hostess.wantsCalls, false);
  assert.equal(hostess.wantsFinance, false);
});

test('determinePollNeeds: mehmon sahifalarida (/menu, /cart, /ar) xodim polling so\'rovlari yo\'q', () => {
  for (const path of ['/menu', '/cart', '/checkout', '/ar', '/menu/ar']) {
    const guestNeeds = determinePollNeeds('guest', path);
    assert.equal(guestNeeds.wantsOrders, false);
    assert.equal(guestNeeds.wantsTables, false);
    assert.equal(guestNeeds.wantsCalls, false);
    assert.equal(guestNeeds.wantsFinance, false);
  }
});

// ── P7: admin dashboarddagi "Bugungi tushum" server qiymatida turishi uchun yengil summary so'rovi ──

test('determinePollNeeds: admin boshqaruv markazida wantsRevenue=true, lekin butun moliya (wantsFinance) hamon false', () => {
  for (const path of ['/admin', '/admin/', '/admin/dashboard', '/admin/dashboard/', '/menu/admin']) {
    const needs = determinePollNeeds('admin', path);
    assert.equal(needs.wantsRevenue, true, `${path}: tushum yangilanishi kerak`);
    assert.equal(needs.wantsFinance, false, `${path}: moliya ro'yxati so'ralmasligi shart (TZ 0.5)`);
  }
});

test('determinePollNeeds: wantsRevenue faqat admin roli va faqat boshqaruv markazi uchun', () => {
  // admin bo'lmagan rol hech qachon tushum so'ramaydi
  for (const role of ['waiter', 'kitchen', 'hostess', 'guest']) {
    assert.equal(determinePollNeeds(role, '/admin').wantsRevenue, false, `${role}`);
  }
  // admin boshqa sahifalarda ham so'ramaydi (moliya sahifasi o'zining ro'yxatidan hisoblaydi)
  for (const path of ['/finance', '/menu/finance', '/kds', '/waiter', '/arrival', '/menu', '/cart']) {
    assert.equal(determinePollNeeds('admin', path).wantsRevenue, false, `${path}`);
  }
});
