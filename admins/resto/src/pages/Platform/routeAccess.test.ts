import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORM_ROUTE_PATHS, platformRouteAccess } from './mode.ts';

const PLATFORM = { is_platform_admin: true, platform_host: true };
const ROUTES_SOURCE = fs.readFileSync(path.resolve(import.meta.dirname, '../../routes.tsx'), 'utf8');

/** routes.tsx dagi barcha marshrut yo'llari ("" bosh sahifa ham) */
const routePaths = [...ROUTES_SOURCE.matchAll(/^\s{4}path: '([^']*)',/gm)].map((m) => m[1]);

test('yo\'l -> qaror jadvali: platforma rejimida faqat clients ochiq, qolgan hammasi Mijozlarga yo\'naltiriladi', () => {
  const table: Record<string, string> = {
    clients: 'allow',
    '': 'redirect_clients',
    orders: 'redirect_clients',
    menu: 'redirect_clients',
    tables: 'redirect_clients',
    bookings: 'redirect_clients',
    staff: 'redirect_clients',
    finance: 'redirect_clients',
    brand: 'redirect_clients',
    tour: 'redirect_clients',
    settings: 'redirect_clients',
  };
  for (const [routePath, expected] of Object.entries(table)) assert.equal(platformRouteAccess(routePath, PLATFORM), expected, `"${routePath}"`);
  assert.deepEqual([...PLATFORM_ROUTE_PATHS], ['clients']);
});

test('platformRouteAccess: yo\'l yozilishi (katta harf, slesh, ichma-ich) qarorni aylanib o\'tishga yo\'l qo\'ymaydi', () => {
  for (const ok of ['clients', 'Clients', '/clients', 'clients/', 'clients/7', ' clients ']) assert.equal(platformRouteAccess(ok, PLATFORM), 'allow', ok);
  for (const closed of ['Orders', '/menu', 'menu/', 'brand/colors', 'client', 'clients-old', '//orders', '*']) assert.equal(platformRouteAccess(closed, PLATFORM), 'redirect_clients', closed);
});

test('platformRouteAccess: mijoz hostida yoki platforma administratori bo\'lmaganda hech narsa yopilmaydi', () => {
  const sessions: unknown[] = [
    { is_platform_admin: true, platform_host: false },   // mijoz hostida super administrator
    { is_platform_admin: false, platform_host: true },   // platforma hostida oddiy xodim
    { is_platform_admin: true },                          // eski server: platform_host yo'q
    { is_platform_admin: 'true', platform_host: 1 },      // qat'iy true emas
    { user: { role: 'shop_owner' } },
    null,
    undefined,
  ];
  for (const session of sessions) {
    for (const routePath of ['', 'orders', 'menu', 'brand', 'finance', 'clients']) {
      assert.equal(platformRouteAccess(routePath, session), 'allow', `${JSON.stringify(session)} / "${routePath}"`);
    }
  }
});

test('routes.tsx: hamma marshrut yagona joyda PlatformRouteGate bilan o\'raladi; yangi marshrut ham avtomatik yopiladi', () => {
  assert.match(ROUTES_SOURCE, /export const adminRoutes: RouteObject\[\] = baseRoutes\.map\(/);
  assert.match(ROUTES_SOURCE, /<PlatformRouteGate routePath=\{route\.path \?\? ''\}>\{route\.element\}<\/PlatformRouteGate>/);
  // yo'llar o'chirilmagan (soft): restoran marshrutlari ham, clients ham joyida
  for (const needed of ['', 'bookings', 'brand', 'clients', 'finance', 'menu', 'orders', 'settings', 'staff', 'tables', 'tour']) assert.ok(routePaths.includes(needed), `marshrut o'chirilgan: "${needed}"`);
  // har bir mavjud marshrut uchun qaror aniq: clients ochiq, qolgani yo'naltiriladi
  for (const routePath of routePaths) {
    assert.equal(platformRouteAccess(routePath, PLATFORM), routePath === 'clients' ? 'allow' : 'redirect_clients', `"${routePath}"`);
  }
});
