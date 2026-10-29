/**
 * Kirish oqimi: sessiyasiz /ra/ loginga yo'naltiradi, noto'g'ri parol rad etiladi, login sahifasi tashqi domenga chiqmaydi.
 */
import { PASSWORD, USERNAMES, expect, test } from './support';

test('sessiyasiz /ra/ login sahifasiga yo\'naltiradi (?next= bilan)', async ({ page }) => {
  await page.goto('/ra/orders');
  await expect(page).toHaveURL(/\/admin\/login\/\?next=\/ra\/orders/);
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test('noto\'g\'ri parol bilan kirib bo\'lmaydi', async ({ page }) => {
  await page.goto('/admin/login/?next=/ra/');
  await page.locator('input[name="username"]').fill(USERNAMES.owner);
  await page.locator('input[name="password"]').fill(`${PASSWORD}-xato`);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText(/Login yoki parol xato/)).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login\//);
});

// Eski restoran login sahifasi shriftlari endi lokal (backend/static/vendor/fonts/fonts-resto.css); oldin Google Fonts so'rardi.
test('login sahifasi tashqi domenga so\'rov yubormaydi', async ({ page, monitor }) => {
  await page.goto('/admin/login/');
  await expect(page.locator('input[name="username"]')).toBeVisible();
  expect(monitor.external).toEqual([]);
});
