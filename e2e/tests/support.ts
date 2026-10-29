/**
 * E2E umumiy yordamchilar: foydalanuvchilar, sessiya fayllari, "monitor" (konsol/tarmoq kuzatuvi), tarmoq izolyatsiyasi.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

export { expect };

export const PASSWORD = process.env.E2E_PASSWORD ?? 'E2E-parol-123!';

export const ROLES = ['owner', 'manager', 'waiter'] as const;
export type Role = (typeof ROLES)[number];

export const USERNAMES: Record<Role, string> = {
  owner: 'e2e_owner',
  manager: 'e2e_manager',
  waiter: 'e2e_waiter',
};

export const AUTH_DIR = path.resolve(import.meta.dirname, '..', 'artifacts', '.auth');
export const authFile = (role: Role) => path.join(AUTH_DIR, `${role}.json`);

export const API = '/api/restaurant/admin/v1';

/** Resto-Admin sahifalari: marshrut, kutilgan birinchi darajali sarlavha (h1) va manifestdagi manba fayl. */
export const ADMIN_PAGES = [
  { slug: '', title: /Boshqaruv Markazi/, src: 'src/pages/Dashboard/Page.tsx' },
  { slug: 'orders', title: /Buyurtmalar/, src: 'src/pages/Orders/Page.tsx' },
  { slug: 'menu', title: /Menyu/, src: 'src/pages/Menu/Page.tsx' },
  { slug: 'tables', title: /Stollar/, src: 'src/pages/Tables/Page.tsx' },
  { slug: 'staff', title: /Xodimlar/, src: 'src/pages/Staff/Page.tsx' },
  { slug: 'finance', title: /Moliya/, src: 'src/pages/Finance/Page.tsx' },
  { slug: 'settings', title: /Sozlamalar/, src: 'src/pages/Settings/Page.tsx' },
] as const;

/** Vite manifestidan: sahifa manba fayli -> hash'li chunk fayli (git'dagi `backend/static/admins/resto/.vite/manifest.json`). */
export function pageChunkFiles(): Record<string, string> {
  const manifestPath = path.resolve(import.meta.dirname, '..', '..', 'backend', 'static', 'admins', 'resto', '.vite', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, { file: string; src?: string }>;
  const out: Record<string, string> = {};
  for (const page of ADMIN_PAGES) {
    const entry = Object.values(manifest).find((item) => item.src === page.src);
    if (!entry) throw new Error(`Manifestda ${page.src} topilmadi — admins build'i eskirgan yoki sahifa ko'chirilgan`);
    out[page.src] = `/static/admins/resto/${entry.file}`;
  }
  return out;
}

const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const isExternal = (url: URL) => (url.protocol === 'http:' || url.protocol === 'https:') && !LOCAL_HOSTNAMES.has(url.hostname);

const STUB_TYPES: Record<string, string> = {
  stylesheet: 'text/css',
  script: 'text/javascript',
  font: 'font/woff2',
  image: 'image/gif',
};

/** Sahifada nima bo'lganini yig'adi. Har testda yangi sahifa -> toza holat. */
export class Monitor {
  consoleErrors: string[] = [];
  pageErrors: string[] = [];
  /** 5xx javoblar */
  serverErrors: string[] = [];
  /** O'z domenimizdagi /api/ va /static/ so'rovlarining 4xx/5xx javoblari (kutilmagan xatolar) */
  httpFailures: string[] = [];
  /** Hujjat (sahifa) navigatsiya so'rovlari: `request.isNavigationRequest()` */
  navigations: string[] = [];
  /** Barcha so'rovlar (faqat yo'l qismi, o'z domenimiz) */
  requested: string[] = [];
  /** Tashqi domenlarga (127.0.0.1/localhost dan boshqa) urinilgan so'rovlar — ular tarmoqqa chiqmaydi, bo'sh javob beriladi */
  external: string[] = [];

  reset() {
    for (const key of ['consoleErrors', 'pageErrors', 'serverErrors', 'httpFailures', 'navigations', 'requested', 'external'] as const) {
      this[key] = [];
    }
  }

  attach(page: Page) {
    page.on('console', (msg) => {
      if (msg.type() === 'error') this.consoleErrors.push(`${msg.text()} @ ${msg.location().url}`);
    });
    page.on('pageerror', (err) => this.pageErrors.push(String(err)));
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (isExternal(url)) return;
      this.requested.push(url.pathname + url.search);
      if (request.isNavigationRequest()) this.navigations.push(`${request.method()} ${url.pathname}`);
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (isExternal(url)) return;
      const status = response.status();
      const label = `${status} ${response.request().method()} ${url.pathname}`;
      if (status >= 500) this.serverErrors.push(label);
      if (status >= 400 && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/static/'))) this.httpFailures.push(label);
    });
  }

  /** Berilgan yo'l qismiga mos so'rovlar (query'siz) */
  requestsMatching(prefix: string, suffix = ''): string[] {
    return this.requested.map((p) => p.split('?')[0]).filter((p) => p.startsWith(prefix) && p.endsWith(suffix));
  }
}

export const test = base.extend<{ monitor: Monitor }>({
  // Tarmoq izolyatsiyasi: tashqi domenlarga haqiqiy so'rov ketmaydi (CI/lokal bir xil, tez, internetsiz ham ishlaydi).
  // Urinishlar `monitor.external` ga yoziladi, javob esa bo'sh 200 — shuning uchun tashqi resurs konsol xatosi hosil qilmaydi
  // va "tashqi so'rov yo'q" tekshiruvi alohida testlarda (admin-tour.spec.ts, auth.spec.ts) o'tkaziladi.
  monitor: [
    async ({ page, context }, use) => {
      const monitor = new Monitor();
      await context.route(isExternal, async (route) => {
        monitor.external.push(route.request().url());
        await route.fulfill({ status: 200, contentType: STUB_TYPES[route.request().resourceType()] ?? 'text/plain', body: '' });
      });
      monitor.attach(page);
      await use(monitor);
    },
    { auto: true },
  ],
});

/** Brauzerdagi sessiya cookie'sidan CSRF tokeni (DRF SessionAuthentication yozuvlarda X-CSRFToken talab qiladi). */
export async function csrfToken(context: BrowserContext): Promise<string> {
  let cookie = (await context.cookies()).find((c) => c.name === 'csrftoken');
  if (!cookie) {
    await context.request.get(`${API}/session/`); // ensure_csrf_cookie
    cookie = (await context.cookies()).find((c) => c.name === 'csrftoken');
  }
  if (!cookie) throw new Error('csrftoken cookie topilmadi');
  return cookie.value;
}

export async function apiJson(
  context: BrowserContext | APIRequestContext,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  data?: unknown,
  csrf?: string,
) {
  const request = 'request' in context ? context.request : context;
  const token = csrf ?? ('cookies' in context ? await csrfToken(context) : '');
  return request.fetch(url, {
    method,
    headers: { 'X-CSRFToken': token, 'Content-Type': 'application/json' },
    data: data === undefined ? undefined : JSON.stringify(data),
  });
}

export function adminLink(page: Page, slug: string) {
  return slug === ''
    ? page.locator('nav a[href="/ra"], nav a[href="/ra/"]')
    : page.locator(`nav a[href="/ra/${slug}"]`);
}
