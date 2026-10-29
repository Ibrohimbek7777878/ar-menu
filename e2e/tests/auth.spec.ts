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

// KUTILGAN XATO (test.fail): backend/templates/restaurant_admin/login.html Google Fonts (fonts.googleapis.com) so'raydi —
// tashqi domen, offline/cheklangan tarmoqda login sahifasi sekin ochiladi va maxfiylik uchun ham yomon. Shablon boshqa
// agent/egasi zimmasida. Tuzatilgach bu test "kutilgan xato, lekin o'tdi" deb yiqiladi — shunda `test.fail` ni olib tashlang.
test('login sahifasi tashqi domenga so\'rov yubormaydi', async ({ page, monitor }) => {
  test.fail(true, 'restaurant_admin/login.html Google Fonts so\'raydi (fonts.googleapis.com)');
  await page.goto('/admin/login/');
  await expect(page.locator('input[name="username"]')).toBeVisible();
  expect(monitor.external).toEqual([]);
});
