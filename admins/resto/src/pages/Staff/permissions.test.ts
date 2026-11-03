import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assignableRoles,
  buildPermissionsPatch,
  computeEffective,
  defaultsForRole,
  groupItems,
  hasOverrides,
  isOn,
  knownKeySet,
  lockReason,
  normalizeCatalog,
  onlyKnown,
  overrideCounts,
  overridesEqual,
  permissionState,
  profileLock,
  readonlyReason,
  resetOverrides,
  sameKeySet,
  setPermission,
  summarizeAccess,
  tidyOverrides,
  uniqueKeys,
} from './permissions.ts';
import type { CatalogItem, Overrides } from './permissions.ts';

const RAW_CATALOG = {
  grantable: ['pos', 'kds', 'menu_admin', 'pos'],
  is_owner: false,
  capabilities: [
    { key: 'pos', label: 'Buyurtma qabul qilish', group: 'Buyurtmalar', description: 'Stol hisobi', sensitive: false },
    { key: 'kds', label: 'Oshxona ekrani', group: 'Buyurtmalar', description: '', sensitive: false },
    { key: 'menu_admin', label: 'Menyuni tahrirlash', group: 'Menyu', description: 'Taomlar, narxlar', sensitive: false },
    { key: 'finance', label: 'Moliya', group: 'Moliya', description: 'Kassa, foyda', sensitive: true },
    { key: 'staff_admin', label: 'Xodimlar', group: 'Boshqaruv', description: 'Xodim qo\'shish', sensitive: true },
  ],
  role_defaults: {
    waiter: ['pos', 'kds'],
    kitchen: ['kds'],
    shop_manager: ['pos', 'kds', 'menu_admin', 'finance'],
  },
};

const catalog = normalizeCatalog(RAW_CATALOG);
const known = knownKeySet(catalog);
const none: Overrides = { extra: [], revoked: [] };

test('uniqueKeys: takror, bo\'sh, satr bo\'lmagan qiymatlar tashlanadi; tartib va bo\'sh joy kesiladi', () => {
  assert.deepEqual(uniqueKeys(['a', ' b ', 'a', '', '   ', 5, null, undefined, {}, 'b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(uniqueKeys(null), []);
  assert.deepEqual(uniqueKeys('pos'), []);
  assert.deepEqual(uniqueKeys({ 0: 'pos' }), []);
  assert.deepEqual(uniqueKeys([]), []);
});

test('normalizeCatalog: to\'g\'ri katalog o\'zgarishsiz o\'tadi', () => {
  assert.equal(catalog.items.length, 5);
  assert.deepEqual(catalog.items[3], { key: 'finance', label: 'Moliya', group: 'Moliya', description: 'Kassa, foyda', sensitive: true });
  assert.deepEqual(catalog.roleDefaults.waiter, ['pos', 'kds']);
  assert.deepEqual(catalog.grantable, ['pos', 'kds', 'menu_admin']);
  assert.equal(catalog.isOwner, false);
});

test('normalizeCatalog: buzuq javoblar (null, satr, massiv, bo\'sh obyekt) bo\'sh katalog beradi, xato tashlamaydi', () => {
  for (const raw of [null, undefined, 'x', 5, [], {}, { capabilities: 'x', role_defaults: 'y' }, { capabilities: null }]) {
    assert.deepEqual(normalizeCatalog(raw), { items: [], roleDefaults: {}, grantable: null, isOwner: null });
  }
});

test('normalizeCatalog: buzuq element tashlanadi, takror kalit birinchisi qoladi, label bo\'lmasa kalit, sensitive faqat true', () => {
  const result = normalizeCatalog({
    capabilities: [
      null,
      'x',
      { label: 'Kalitsiz' },
      { key: '', label: 'Bo\'sh kalit' },
      { key: 'a', label: 'Birinchi', group: 'G', sensitive: 'true' },
      { key: 'a', label: 'Takror', group: 'H', sensitive: true },
      { key: 'b' },
      { key: 'c', label: '   ', description: 5, sensitive: true },
    ],
    role_defaults: { waiter: ['a', 'a', 7, ' b '], kitchen: 'a', manager: null },
  });
  assert.deepEqual(result.items.map((i) => i.key), ['a', 'b', 'c']);
  assert.equal(result.items[0].label, 'Birinchi');
  assert.equal(result.items[0].sensitive, false);
  assert.equal(result.items[1].label, 'b');
  assert.equal(result.items[1].group, '');
  assert.equal(result.items[2].label, 'c');
  assert.equal(result.items[2].description, '');
  assert.equal(result.items[2].sensitive, true);
  assert.deepEqual(result.roleDefaults, { waiter: ['a', 'b'], kitchen: [], manager: [] });
});

test('normalizeCatalog: grantable/is_owner buzuq bo\'lsa null (server bermagan deb hisoblanadi)', () => {
  const result = normalizeCatalog({ capabilities: [], grantable: 'x', is_owner: 'true' });
  assert.equal(result.grantable, null);
  assert.equal(result.isOwner, null);
  assert.deepEqual(normalizeCatalog({ grantable: [], is_owner: true }).grantable, []);
  assert.equal(normalizeCatalog({ is_owner: true }).isOwner, true);
});

test('onlyKnown: noma\'lum kalitlar tushadi', () => {
  assert.deepEqual(onlyKnown(['pos', 'zzz', 'pos', 'finance'], known), ['pos', 'finance']);
});

test('tidyOverrides: standartda borni "qo\'shimcha" deb, standartda yo\'qni "olib tashlangan" deb yozmaydi', () => {
  const result = tidyOverrides({ extra: ['pos', 'finance'], revoked: ['menu_admin', 'kds'] }, ['pos', 'kds'], known);
  assert.deepEqual(result, { extra: ['finance'], revoked: ['kds'] });
});

test('tidyOverrides: bir kalit ikkala ro\'yxatda bo\'lsa "olib tashlangan" yutadi (server formulasi)', () => {
  assert.deepEqual(tidyOverrides({ extra: ['pos'], revoked: ['pos'] }, ['pos'], known), { extra: [], revoked: ['pos'] });
  assert.deepEqual(tidyOverrides({ extra: ['finance'], revoked: ['finance'] }, ['pos'], known), { extra: [], revoked: [] });
});

test('tidyOverrides: takror va noma\'lum kalitlar; `known` berilmasa noma\'lum kalit saqlanadi', () => {
  assert.deepEqual(
    tidyOverrides({ extra: ['finance', 'finance', 'qwerty'], revoked: ['pos', 'pos', 'nope'] }, ['pos'], known),
    { extra: ['finance'], revoked: ['pos'] },
  );
  assert.deepEqual(tidyOverrides({ extra: ['qwerty'], revoked: [] }, [], undefined), { extra: ['qwerty'], revoked: [] });
});

test('permissionState: to\'rt holat va buzuq (ikkala ro\'yxatda) kombinatsiyalar', () => {
  const defaults = ['pos', 'kds'];
  const overrides: Overrides = { extra: ['finance'], revoked: ['kds'] };
  assert.equal(permissionState('pos', defaults, overrides), 'role');
  assert.equal(permissionState('kds', defaults, overrides), 'revoked');
  assert.equal(permissionState('finance', defaults, overrides), 'extra');
  assert.equal(permissionState('menu_admin', defaults, overrides), 'none');
  // buzuq: standartda ham, extra'da ham -> standart ("rol bo'yicha")
  assert.equal(permissionState('pos', defaults, { extra: ['pos'], revoked: [] }), 'role');
  // buzuq: standartda yo'q, revoked'da -> yo'q
  assert.equal(permissionState('finance', defaults, { extra: [], revoked: ['finance'] }), 'none');
  assert.equal(permissionState('finance', defaults, { extra: ['finance'], revoked: ['finance'] }), 'none');
  assert.equal(isOn('role'), true);
  assert.equal(isOn('extra'), true);
  assert.equal(isOn('revoked'), false);
  assert.equal(isOn('none'), false);
});

test('computeEffective: (standart + qo\'shimcha) - olib tashlangan; tartib va takror', () => {
  assert.deepEqual(computeEffective(['pos', 'kds'], { extra: ['finance'], revoked: ['kds'] }), ['pos', 'finance']);
  assert.deepEqual(computeEffective(['pos', 'kds'], none), ['pos', 'kds']);
  assert.deepEqual(computeEffective([], none), []);
  assert.deepEqual(computeEffective(['pos', 'pos'], { extra: ['pos', 'finance', 'finance'], revoked: [] }), ['pos', 'finance']);
  assert.deepEqual(computeEffective(['pos'], { extra: ['pos'], revoked: ['pos'] }), []);
});

test('setPermission: rol standartidagini o\'chirish -> olib tashlangan; qaytarib yoqish -> toza', () => {
  const off = setPermission('kds', false, ['pos', 'kds'], none);
  assert.deepEqual(off, { extra: [], revoked: ['kds'] });
  assert.deepEqual(setPermission('kds', true, ['pos', 'kds'], off), none);
});

test('setPermission: standartda yo\'qni yoqish -> qo\'shimcha; qaytarib o\'chirish -> toza', () => {
  const on = setPermission('finance', true, ['pos', 'kds'], none);
  assert.deepEqual(on, { extra: ['finance'], revoked: [] });
  assert.deepEqual(setPermission('finance', false, ['pos', 'kds'], on), none);
});

test('setPermission: foydasiz amallar (allaqachon shunday) o\'zgartirmaydi va ortiqcha yozuv qoldirmaydi', () => {
  assert.deepEqual(setPermission('pos', true, ['pos'], none), none);
  assert.deepEqual(setPermission('finance', false, ['pos'], none), none);
  assert.deepEqual(setPermission('finance', true, ['pos'], { extra: ['finance'], revoked: [] }), { extra: ['finance'], revoked: [] });
});

test('setPermission: kirish obyektini o\'zgartirmaydi', () => {
  const input: Overrides = { extra: ['finance'], revoked: ['kds'] };
  const snapshot = JSON.parse(JSON.stringify(input));
  setPermission('menu_admin', true, ['pos', 'kds'], input);
  setPermission('kds', true, ['pos', 'kds'], input);
  assert.deepEqual(input, snapshot);
});

test('setPermission: buzuq kirish (kalit ikkala ro\'yxatda) toza chiqadi', () => {
  assert.deepEqual(setPermission('pos', true, ['pos'], { extra: ['pos'], revoked: ['pos'] }), none);
  assert.deepEqual(setPermission('pos', false, ['pos'], { extra: ['pos'], revoked: ['pos'] }), { extra: [], revoked: ['pos'] });
});

test('setPermission: tasodifiy ketma-ketlikdan keyin samarali ruxsatlar kutilgan to\'plamga teng (invariant)', () => {
  let seed = 12345;
  const rand = (max: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % max;
  };
  const keys = catalog.items.map((i) => i.key);
  for (let round = 0; round < 60; round += 1) {
    const defaults = catalog.roleDefaults[['waiter', 'kitchen', 'shop_manager'][rand(3)]];
    let overrides: Overrides = none;
    const expected = new Set(defaults);
    for (let step = 0; step < 25; step += 1) {
      const key = keys[rand(keys.length)];
      const on = rand(2) === 1;
      overrides = setPermission(key, on, defaults, overrides);
      if (on) expected.add(key);
      else expected.delete(key);
      assert.deepEqual(new Set(computeEffective(defaults, overrides)), expected);
      // ortiqcha yozuv yo'q
      assert.deepEqual(tidyOverrides(overrides, defaults, known), overrides);
      assert.ok(overrides.extra.every((k) => !defaults.includes(k)));
      assert.ok(overrides.revoked.every((k) => defaults.includes(k)));
      assert.equal(permissionState(key, defaults, overrides) === 'role' || permissionState(key, defaults, overrides) === 'extra', on);
    }
  }
});

test('resetOverrides / hasOverrides', () => {
  assert.deepEqual(resetOverrides(), none);
  assert.notEqual(resetOverrides(), resetOverrides());
  assert.equal(hasOverrides(none), false);
  assert.equal(hasOverrides({ extra: ['a'], revoked: [] }), true);
  assert.equal(hasOverrides({ extra: [], revoked: ['a'] }), true);
});

test('overridesEqual: tartib va takrorga e\'tibor bermaydi', () => {
  assert.equal(overridesEqual({ extra: ['a', 'b'], revoked: ['c'] }, { extra: ['b', 'a', 'a'], revoked: ['c'] }), true);
  assert.equal(overridesEqual({ extra: ['a'], revoked: [] }, { extra: [], revoked: ['a'] }), false);
  assert.equal(overridesEqual(none, { extra: [], revoked: [] }), true);
  assert.equal(overridesEqual({ extra: ['a'], revoked: [] }, { extra: ['a', 'b'], revoked: [] }), false);
});

test('defaultsForRole: saqlangan rolda server standarti, boshqa rolda katalog; noma\'lum rol bo\'sh', () => {
  const server = ['pos', 'kds', 'menu_admin'];
  assert.deepEqual(defaultsForRole('waiter', 'waiter', server, catalog), server);
  assert.deepEqual(defaultsForRole('kitchen', 'waiter', server, catalog), ['kds']);
  assert.deepEqual(defaultsForRole('waiter', 'waiter', null, catalog), ['pos', 'kds']);
  assert.deepEqual(defaultsForRole('waiter', 'waiter', undefined, catalog), ['pos', 'kds']);
  assert.deepEqual(defaultsForRole('cashier', 'waiter', server, catalog), []);
  assert.deepEqual(defaultsForRole('shop_manager', 'shop_manager', ['pos', 'pos', ''], catalog), ['pos']);
});

test('defaultsForRole: natija katalog massivini o\'zgartirib bo\'lmaydigan nusxa (mutatsiya kataloga tegmaydi)', () => {
  const result = defaultsForRole('waiter', 'kitchen', null, catalog);
  result.push('hack');
  assert.deepEqual(catalog.roleDefaults.waiter, ['pos', 'kds']);
});

test('rol o\'zgarganda: yangi standartga nisbatan ortiqcha yozuvlar tushadi, qolganlari saqlanadi', () => {
  // ofitsiantga "moliya" qo'shimcha berilgan va "oshxona ekrani" olib tashlangan
  const overrides: Overrides = { extra: ['finance'], revoked: ['kds'] };
  // menejer bo'lganda moliya o'zi bor (qo'shimcha ortiqcha), kds ham standartda (olib tashlash saqlanadi)
  assert.deepEqual(tidyOverrides(overrides, catalog.roleDefaults.shop_manager, known), { extra: [], revoked: ['kds'] });
  // oshpaz bo'lganda kds standartda (olib tashlash kuchda), moliya hamon qo'shimcha
  assert.deepEqual(tidyOverrides(overrides, catalog.roleDefaults.kitchen, known), { extra: ['finance'], revoked: ['kds'] });
  // standarti yo'q rol: olib tashlash ma'nosiz
  assert.deepEqual(tidyOverrides(overrides, [], known), { extra: ['finance'], revoked: [] });
});

test('groupItems: guruhlar birinchi uchrashish tartibida, guruhsizlar oxirida; bo\'sh katalog', () => {
  const items: CatalogItem[] = [
    { key: 'a', label: 'A', group: '', description: '', sensitive: false },
    { key: 'b', label: 'B', group: 'Menyu', description: '', sensitive: false },
    { key: 'c', label: 'C', group: 'Moliya', description: '', sensitive: false },
    { key: 'd', label: 'D', group: 'Menyu', description: '', sensitive: false },
  ];
  assert.deepEqual(groupItems(items).map((g) => [g.group, g.items.map((i) => i.key)]), [
    ['Menyu', ['b', 'd']],
    ['Moliya', ['c']],
    ['', ['a']],
  ]);
  assert.deepEqual(groupItems([]), []);
});

test('lockReason: egasi uchun qulf yo\'q', () => {
  const owner = { actorUnlimited: true, grantable: null };
  assert.equal(lockReason({ key: 'finance', sensitive: true }, owner, { currentlyOn: false, wasOn: false }), null);
});

test('lockReason: nozik ruxsatni egasi bo\'lmagan YOQA olmaydi, lekin olib tashlay oladi (server faqat yangi berilganini tekshiradi)', () => {
  const manager = { actorUnlimited: false, grantable: new Set(['pos']) };
  const finance = { key: 'finance', sensitive: true };
  assert.equal(lockReason(finance, manager, { currentlyOn: false, wasOn: false }), 'sensitive');
  assert.equal(lockReason(finance, manager, { currentlyOn: true, wasOn: true }), null);    // olib tashlash mumkin
  assert.equal(lockReason(finance, manager, { currentlyOn: false, wasOn: true }), null);   // olib tashlagan edi, qaytarib yoqadi
  assert.equal(lockReason(finance, manager, { currentlyOn: true, wasOn: false }), null);   // egasi bergan emas, lekin hozir yoqilgan
});

test('lockReason: o\'zida yo\'q ruxsatni berib bo\'lmaydi; bor ruxsatni o\'chirish va qaytarib yoqish mumkin', () => {
  const manager = { actorUnlimited: false, grantable: new Set(['pos']) };
  const kds = { key: 'kds', sensitive: false };
  assert.equal(lockReason(kds, manager, { currentlyOn: false, wasOn: false }), 'not_owned');
  assert.equal(lockReason(kds, manager, { currentlyOn: true, wasOn: true }), null);
  assert.equal(lockReason(kds, manager, { currentlyOn: false, wasOn: true }), null);
  assert.equal(lockReason({ key: 'pos', sensitive: false }, manager, { currentlyOn: false, wasOn: false }), null);
});

test('lockReason: bera oladigan ruxsatlar ro\'yxati noma\'lum bo\'lsa nozik bo\'lmaganni cheklamaydi (qarorni server qiladi)', () => {
  const unknown = { actorUnlimited: false, grantable: null };
  assert.equal(lockReason({ key: 'kds', sensitive: false }, unknown, { currentlyOn: false, wasOn: false }), null);
  assert.equal(lockReason({ key: 'finance', sensitive: true }, unknown, { currentlyOn: false, wasOn: false }), 'sensitive');
});

test('lockReason: bo\'sh bera-oladigan ro\'yxat (hech narsa bera olmaydi) — hamma yangi ruxsat qulf', () => {
  const nothing = { actorUnlimited: false, grantable: new Set<string>() };
  assert.equal(lockReason({ key: 'pos', sensitive: false }, nothing, { currentlyOn: false, wasOn: false }), 'not_owned');
});

test('profileLock: egasi bo\'lmagan xodim egasi/menejerni (o\'zidan boshqa) o\'zgartira olmaydi', () => {
  assert.equal(profileLock({ actorUnlimited: false, isSelf: false, targetRole: 'shop_manager' }), 'managed_by_owner');
  assert.equal(profileLock({ actorUnlimited: false, isSelf: false, targetRole: 'shop_owner' }), 'managed_by_owner');
  assert.equal(profileLock({ actorUnlimited: false, isSelf: false, targetRole: 'super_admin' }), 'managed_by_owner');
  assert.equal(profileLock({ actorUnlimited: false, isSelf: true, targetRole: 'shop_manager' }), null);
  assert.equal(profileLock({ actorUnlimited: false, isSelf: false, targetRole: 'waiter' }), null);
  assert.equal(profileLock({ actorUnlimited: true, isSelf: false, targetRole: 'shop_manager' }), null);
  assert.equal(profileLock({ actorUnlimited: true, isSelf: false, targetRole: 'shop_owner' }), null);
});

test('readonlyReason: egasi > o\'zi > huquqsiz > boshqa', () => {
  assert.equal(readonlyReason({ targetRole: 'shop_owner', isSelf: true, actorHasStaffAccess: false }), 'owner');
  assert.equal(readonlyReason({ targetRole: 'super_admin', isSelf: false, actorHasStaffAccess: true }), 'owner');
  assert.equal(readonlyReason({ targetRole: 'waiter', isSelf: true, actorHasStaffAccess: true }), 'self');
  assert.equal(readonlyReason({ targetRole: 'waiter', isSelf: false, actorHasStaffAccess: false }), 'no_access');
  assert.equal(readonlyReason({ targetRole: 'waiter', isSelf: false, actorHasStaffAccess: true }), 'other');
});

test('summarizeAccess: guruhlar katalog tartibida, faqat yoqilganlar; noma\'lum kalit sanalmaydi', () => {
  const summary = summarizeAccess(catalog.items, ['finance', 'kds', 'pos', 'ghost']);
  assert.equal(summary.total, 3);
  assert.deepEqual(summary.groups, [
    { group: 'Buyurtmalar', labels: ['Buyurtma qabul qilish', 'Oshxona ekrani'] },
    { group: 'Moliya', labels: ['Moliya'] },
  ]);
});

test('summarizeAccess: ruxsat yo\'q -> bo\'sh; takror kalit ikki marta sanalmaydi', () => {
  assert.deepEqual(summarizeAccess(catalog.items, []), { total: 0, groups: [] });
  assert.equal(summarizeAccess(catalog.items, ['pos', 'pos', 'pos']).total, 1);
  assert.deepEqual(summarizeAccess([], ['pos']), { total: 0, groups: [] });
});

test('buildPermissionsPatch: o\'zgarish yo\'q -> bo\'sh', () => {
  const saved = { role: 'waiter', overrides: { extra: ['finance'], revoked: ['kds'] } };
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'waiter', overrides: { extra: ['finance'], revoked: ['kds'] } }, true), {});
  // tartib farqi o'zgarish emas
  assert.deepEqual(
    buildPermissionsPatch({ role: 'waiter', overrides: { extra: ['a', 'b'], revoked: [] } }, { role: 'waiter', overrides: { extra: ['b', 'a'], revoked: [] } }, true),
    {},
  );
});

test('buildPermissionsPatch: faqat rol o\'zgarsa faqat rol; faqat ruxsat o\'zgarsa ikkala ro\'yxat, rolsiz', () => {
  const saved = { role: 'waiter', overrides: none };
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'kitchen', overrides: none }, true), { role: 'kitchen' });
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'waiter', overrides: { extra: ['finance'], revoked: [] } }, true), {
    extra_capabilities: ['finance'],
    revoked_capabilities: [],
  });
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'kitchen', overrides: { extra: [], revoked: ['kds'] } }, true), {
    role: 'kitchen',
    extra_capabilities: [],
    revoked_capabilities: ['kds'],
  });
});

test('buildPermissionsPatch: ruxsat tahrirlash mumkin bo\'lmasa, ruxsat maydonlari HECH QACHON ketmaydi', () => {
  const saved = { role: 'waiter', overrides: none };
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'waiter', overrides: { extra: ['finance'], revoked: [] } }, false), {});
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'kitchen', overrides: { extra: ['finance'], revoked: [] } }, false), { role: 'kitchen' });
});

test('buildPermissionsPatch: tozalash ("rol standartiga qaytarish") bo\'sh ro\'yxatlarni yuboradi', () => {
  const saved = { role: 'waiter', overrides: { extra: ['finance'], revoked: ['kds'] } };
  assert.deepEqual(buildPermissionsPatch(saved, { role: 'waiter', overrides: resetOverrides() }, true), {
    extra_capabilities: [],
    revoked_capabilities: [],
  });
});

test('assignableRoles: egasi to\'rt rolni ham beradi; menejer "menejer" rolini bera olmaydi (xodimda hozir shu rol bo\'lmasa)', () => {
  assert.deepEqual(assignableRoles('shop_owner', 'waiter'), ['waiter', 'kitchen', 'hostess', 'shop_manager']);
  assert.deepEqual(assignableRoles('shop_manager', 'waiter'), ['waiter', 'kitchen', 'hostess']);
  assert.deepEqual(assignableRoles('shop_manager', 'shop_manager'), ['waiter', 'kitchen', 'hostess', 'shop_manager']);
});

test('assignableRoles: hozirgi rol ro\'yxatda yo\'q bo\'lsa (egasi, kassir) oxiriga qo\'shiladi', () => {
  assert.deepEqual(assignableRoles('shop_owner', 'shop_owner'), ['waiter', 'kitchen', 'hostess', 'shop_manager', 'shop_owner']);
  assert.deepEqual(assignableRoles('shop_manager', 'cashier'), ['waiter', 'kitchen', 'hostess', 'cashier']);
});

test('sameKeySet: tartib va takrorga e\'tibor bermaydi', () => {
  assert.equal(sameKeySet(['a', 'b'], ['b', 'a', 'a']), true);
  assert.equal(sameKeySet(['a'], ['a', 'b']), false);
  assert.equal(sameKeySet([], []), true);
});

test('overrideCounts: ro\'yxat kartasi uchun sonlar; permissions yo\'q/buzuq bo\'lsa 0, takror sanalmaydi', () => {
  assert.deepEqual(overrideCounts({ extra: ['a', 'b', 'a'], revoked: ['c'], effective: [] }), { extra: 2, revoked: 1 });
  assert.deepEqual(overrideCounts({ extra: [], revoked: [] }), { extra: 0, revoked: 0 });
  assert.deepEqual(overrideCounts(undefined), { extra: 0, revoked: 0 });
  assert.deepEqual(overrideCounts(null), { extra: 0, revoked: 0 });
  assert.deepEqual(overrideCounts({ extra: 'x', revoked: null }), { extra: 0, revoked: 0 });
  assert.deepEqual(overrideCounts([]), { extra: 0, revoked: 0 });
});
