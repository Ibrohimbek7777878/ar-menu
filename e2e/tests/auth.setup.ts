/**
 * "setup" loyihasi: har bir rol uchun HAQIQIY login formasi (/admin/login/) orqali kiradi, /ra/ SPA ochilishini tekshiradi
 * va sessiyani artifacts/.auth/<rol>.json ga saqlaydi. Boshqa testlar shu sessiyalardan foydalanadi.
 */
import { expect, test as setup } from './support';
import { PASSWORD, ROLES, USERNAMES, authFile } from './support';

for (const role of ROLES) {
  setup(`login (haqiqiy forma): ${role}`, async ({ page, context }) => {
    await page.goto('/admin/login/?next=/ra/');
    await page.locator('input[name="username"]').fill(USERNAMES[role]);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL(/\/ra\/?$/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible(); // SPA ishga tushdi
    await context.storageState({ path: authFile(role) });
  });
}
