import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoUz, roleLabel } from './uz.ts';

test('roleLabel: beshta asosiy rol odam tilida', () => {
  assert.equal(roleLabel('shop_owner'), 'Restoran egasi');
  assert.equal(roleLabel('shop_manager'), 'Menejer');
  assert.equal(roleLabel('waiter'), 'Ofitsiant');
  assert.equal(roleLabel('kitchen'), 'Oshpaz');
  assert.equal(roleLabel('hostess'), 'Hostess');
});

test('roleLabel: boshqa ma\'lum rollar (kassir, bosh administrator)', () => {
  assert.equal(roleLabel('cashier'), 'Kassir');
  assert.equal(roleLabel('super_admin'), 'Bosh administrator');
});

test('roleLabel: katta-kichik harf va bo\'sh joy xatosiz', () => {
  assert.equal(roleLabel('Shop_Owner'), 'Restoran egasi');
  assert.equal(roleLabel('  waiter '), 'Ofitsiant');
});

test('roleLabel: noma\'lum, bo\'sh va xavfli kalitlar uchun xom kod chiqmaydi', () => {
  assert.equal(roleLabel('courier_manager'), 'Xodim');
  assert.equal(roleLabel(''), 'Xodim');
  assert.equal(roleLabel(null), 'Xodim');
  assert.equal(roleLabel(undefined), 'Xodim');
  // Object.prototype kalitlari rol sifatida o'tib ketmasin
  assert.equal(roleLabel('constructor'), 'Xodim');
  assert.equal(roleLabel('__proto__'), 'Xodim');
  assert.equal(roleLabel('toString'), 'Xodim');
});

test('lug\'at: ko\'rinadigan matnlarda taqiqlangan so\'zlar yo\'q', () => {
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') texts.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(restoUz);
  for (const t of texts) {
    assert.doesNotMatch(t, /KDS/, `"${t}" ichida KDS bor`);
    assert.doesNotMatch(t, /slug/i, `"${t}" ichida Slug bor`);
    assert.doesNotMatch(t, /csv/i, `"${t}" ichida CSV bor`);
    assert.doesNotMatch(t, /shop_owner/i, `"${t}" ichida xom rol kodi bor`);
  }
});

test('lug\'at: TZ 1.1 bo\'yicha yangi matnlar', () => {
  assert.equal(restoUz.kitchenScreen, 'Oshxona ekrani');
  assert.equal(restoUz.settingsPage.menuLink, 'Menyu havolasi');
  assert.equal(restoUz.financePage.exportButton, 'Excel uchun yuklab olish');
  assert.equal(restoUz.financePage.profit, 'Foyda');
  assert.equal(restoUz.financePage.profitHint, 'Tushum minus Xarajat');
  assert.equal(restoUz.financePage.debtsTab, 'Qarzlar');
  assert.equal(restoUz.ordersPage.viewReceipt, "Chekni ko'rish");
});
