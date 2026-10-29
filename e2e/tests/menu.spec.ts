/**
 * (d) Egasi menyuda yangi taom qo'shadi (UI orqali): ro'yxatda ko'rinadi va nomi bo'yicha qidiruvda topiladi.
 */
import { API, authFile, expect, test } from './support';

test.use({ storageState: authFile('owner') });

test('d) egasi yangi taom qo\'shadi -> ro\'yxatda ko\'rinadi -> qidiruvda topiladi', async ({ page, monitor }) => {
  const dishName = `E2E Sinov Taomi ${Date.now()}`;
  await page.goto('/ra/menu');
  await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Menyu/ })).toBeVisible();
  await expect(page.getByText('Palov', { exact: true })).toBeVisible(); // seed taomlari yuklandi

  await page.getByRole('button', { name: "Taom qo'shish" }).click();
  const form = page.locator('form').filter({ has: page.locator('input[type="number"][required]') });
  await form.locator('input[type="text"][required]').fill(dishName);
  await form.locator('input[type="number"][required]').fill('41000');
  await form.locator('select').selectOption({ label: 'Milliy taomlar' });
  const created = page.waitForResponse((r) => r.url().includes(`${API}/menu/products/`) && r.request().method() === 'POST');
  await form.locator('button[type="submit"]').click();
  expect((await created).status(), 'taom yaratish API javobi').toBe(201);

  // Ro'yxatda ko'rinadi (modal yopiladi)
  await expect(form).toHaveCount(0);
  await expect(page.getByText(dishName, { exact: true })).toBeVisible();

  // Qidiruvda topiladi; boshqa taomlar ko'rinmaydi
  const search = page.getByPlaceholder(/qidirish/i);
  await search.fill(dishName);
  await expect(page.getByText(dishName, { exact: true })).toBeVisible();
  await expect(page.getByText('Palov', { exact: true })).toHaveCount(0);
  // Aksincha: seed taomini qidirsak, yangisi ko'rinmaydi
  await search.fill('Palov');
  await expect(page.getByText('Palov', { exact: true })).toBeVisible();
  await expect(page.getByText(dishName, { exact: true })).toHaveCount(0);
  // Mavjud bo'lmagan nom — bo'sh holat
  await search.fill('yoq-bunday-taom-zzz');
  await expect(page.getByText('Taomlar topilmadi')).toBeVisible();

  // Server tomonida saqlangan: narxi va kategoriyasi to'g'ri
  const found = await (await page.request.get(`${API}/menu/products/?q=${encodeURIComponent(dishName)}`)).json();
  expect(found.count).toBe(1);
  expect(found.results[0].name).toBe(dishName);
  expect(Number(found.results[0].price)).toBe(41000);
  expect(found.results[0].category?.name).toBe('Milliy taomlar');

  expect(monitor.consoleErrors).toEqual([]);
  expect(monitor.serverErrors).toEqual([]);
  expect(monitor.httpFailures).toEqual([]);
});
