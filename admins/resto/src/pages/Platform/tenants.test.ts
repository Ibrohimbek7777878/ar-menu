import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOwnerMessage } from './message.ts';
import { isPlatformMode, platformFlags } from './mode.ts';
import { clientsRoute } from './route.ts';
import { filterTenants, formatDay, isActive, loginUrlOf, normalizeTenant, safeHttpUrl, statusCounts, tenantsFromResponse, toggledStatus } from './tenants.ts';
import type { Tenant } from './tenants.ts';

const row = (extra: Record<string, unknown> = {}) => ({
  id: 7,
  name: 'Guliston',
  subdomain: 'guliston',
  business_type: 'restaurant',
  status: 'active',
  owner_username: 'guliston_ega',
  created_at: '2026-11-03T08:15:00Z',
  tables: 12,
  products: 80,
  url: 'https://guliston.menu.uz',
  ...extra,
});

const sample = (): Tenant[] => tenantsFromResponse({ count: 3, results: [row(), row({ id: 8, name: 'Osh Markazi', subdomain: 'osh', status: 'suspended', owner_username: 'osh_admin' }), row({ id: 9, name: 'Kafe Ko\'k', subdomain: 'kok', owner_username: 'kok1' })] });

test('route', () => {
  assert.equal(clientsRoute.path, 'clients');
});

test('platforma rejimi: ikkala bayroq qat\'iy true bo\'lsagina', () => {
  assert.equal(isPlatformMode({ is_platform_admin: true, platform_host: true }), true);
  assert.equal(isPlatformMode({ is_platform_admin: true, platform_host: false }), false);
  assert.equal(isPlatformMode({ is_platform_admin: false, platform_host: true }), false);
  assert.equal(isPlatformMode({ is_platform_admin: true }), false, 'platform_host yo\'q (eski server)');
  assert.equal(isPlatformMode({ is_platform_admin: 'true', platform_host: 1 }), false, 'matn/son true emas');
  for (const bad of [null, undefined, 0, 'x', [], {}]) assert.equal(isPlatformMode(bad), false);
  assert.deepEqual(platformFlags({ user: { role: 'super_admin' } }), { is_platform_admin: false, platform_host: false });
});

test('normalizeTenant: to\'liq qator', () => {
  const tenant = normalizeTenant(row());
  assert.deepEqual(tenant, {
    id: '7',
    name: 'Guliston',
    subdomain: 'guliston',
    business_type: 'restaurant',
    status: 'active',
    owner_username: 'guliston_ega',
    created_at: '2026-11-03T08:15:00Z',
    tables: 12,
    products: 80,
    url: 'https://guliston.menu.uz/',
  });
});

test('normalizeTenant: id satr ham bo\'lishi mumkin; id yo\'q yoki yaroqsiz qator tashlanadi; buzuq sonlar 0', () => {
  assert.equal(normalizeTenant(row({ id: 'abc-1' }))?.id, 'abc-1');
  assert.equal(normalizeTenant(row({ id: null })), null);
  assert.equal(normalizeTenant(row({ id: '' })), null);
  for (const bad of [null, undefined, 5, 'x', [], true]) assert.equal(normalizeTenant(bad), null);
  const odd = normalizeTenant(row({ tables: -3, products: 'ko\'p', name: 5, url: 'javascript:alert(1)' })) as Tenant;
  assert.equal(odd.tables, 0);
  assert.equal(odd.products, 0);
  assert.equal(odd.name, '');
  assert.equal(odd.url, '', 'xavfli havola rad etiladi');
});

test('tenantsFromResponse: {results}, oddiy massiv yoki buzuq javob', () => {
  assert.equal(sample().length, 3);
  assert.equal(tenantsFromResponse([row()]).length, 1);
  assert.deepEqual(tenantsFromResponse(null), []);
  assert.deepEqual(tenantsFromResponse({ count: 0, results: null }), []);
  assert.equal(tenantsFromResponse({ results: [row(), null, 5, row({ id: 2 })] }).length, 2);
});

test('safeHttpUrl', () => {
  assert.equal(safeHttpUrl('https://a.uz'), 'https://a.uz/');
  assert.equal(safeHttpUrl('http://a.uz/x'), 'http://a.uz/x');
  for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.uz', '', 'a.uz', null, 5]) assert.equal(safeHttpUrl(bad), '', String(bad));
});

test('filterTenants: nom, subdomen, ega logini bo\'yicha (katta-kichik harf farqsiz) va holat', () => {
  const list = sample();
  assert.equal(filterTenants(list, '', 'all').length, 3);
  assert.deepEqual(filterTenants(list, 'GULI', 'all').map((x) => x.id), ['7']);
  assert.deepEqual(filterTenants(list, 'osh_adm', 'all').map((x) => x.id), ['8'], 'ega logini bo\'yicha');
  assert.deepEqual(filterTenants(list, '  kok  ', 'all').map((x) => x.id), ['9'], 'atrofdagi bo\'shliq');
  assert.deepEqual(filterTenants(list, '', 'suspended').map((x) => x.id), ['8']);
  assert.deepEqual(filterTenants(list, '', 'active').map((x) => x.id), ['7', '9']);
  assert.deepEqual(filterTenants(list, 'osh', 'active'), [], 'qidiruv + holat birga');
  assert.deepEqual(filterTenants(list, 'yo\'q-bunaqa', 'all'), []);
});

test('statusCounts va toggledStatus', () => {
  assert.deepEqual(statusCounts(sample()), { all: 3, active: 2, suspended: 1 });
  assert.deepEqual(statusCounts([]), { all: 0, active: 0, suspended: 0 });
  const [active, suspended] = sample();
  assert.equal(isActive(active), true);
  assert.equal(toggledStatus(active), 'suspended');
  assert.equal(toggledStatus(suspended), 'active');
  assert.equal(toggledStatus({ status: 'nomalum' }), 'suspended', 'noma\'lum holat faol deb olinadi');
});

test('formatDay', () => {
  assert.equal(formatDay('2026-11-03T08:15:00Z'), '03.11.2026');
  assert.equal(formatDay('2026-01-09'), '09.01.2026');
  assert.equal(formatDay(''), '');
  assert.equal(formatDay('kecha'), '');
});

test('loginUrlOf: tenant manzilidan kirish sahifasi', () => {
  assert.equal(loginUrlOf('https://guliston.menu.uz'), 'https://guliston.menu.uz/admin/login/');
  assert.equal(loginUrlOf('https://guliston.menu.uz/boshqa/yol'), 'https://guliston.menu.uz/admin/login/');
  assert.equal(loginUrlOf('javascript:alert(1)'), '');
  assert.equal(loginUrlOf(''), '');
});

test('buildOwnerMessage: havola, login, parol va eslatma', () => {
  const text = buildOwnerMessage({ name: 'Guliston', loginUrl: 'https://guliston.menu.uz/admin/login/', username: 'guliston_ega', password: 'Ab3dEf7hJk' });
  assert.equal(
    text,
    [
      'Salom! «Guliston» uchun boshqaruv paneli tayyor.',
      'Kirish: https://guliston.menu.uz/admin/login/',
      'Login: guliston_ega',
      'Parol: Ab3dEf7hJk',
      "Kirgach parolni o'zingizga qulayiga almashtiring.",
    ].join('\n'),
  );
});

test('buildOwnerMessage: havola bo\'lmasa qator tushadi, nom bo\'sh bo\'lsa "restoran"; tarjima funksiyasi ishlatiladi', () => {
  const text = buildOwnerMessage({ name: '  ', loginUrl: '', username: 'x_ega', password: 'p' });
  assert.ok(!text.includes('Kirish:'));
  assert.match(text, /«restoran»/);
  const ru = buildOwnerMessage({ name: 'Г', loginUrl: '', username: 'u', password: 'p' }, (key, params) => `RU:${key.replace(/\{(\w+)\}/g, (_m, k: string) => String(params?.[k] ?? ''))}`);
  assert.match(ru, /^RU:Salom! «Г» uchun/);
});
