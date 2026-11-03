/**
 * (g) Taom oynasi: karta bosilganda pastdan oyna ochiladi, ichida qisqa ma'lumot va tavsiyalar ("Shunga o'xshash", "Qo'shimcha");
 * oynadan savatga qo'shish; yopish. Sozlama o'chirilsa karta avvalgidek. Seed: Palov (Milliy taomlar), Achchiq-chuchuk salat (Salatlar).
 */
import { API, authFile, csrfToken, expect, test } from './support';

const asList = (body: unknown): any[] =>
  Array.isArray(body) ? body : ((body as { results?: any[]; items?: any[] })?.results ?? (body as { items?: any[] })?.items ?? []);

test.use({ storageState: { cookies: [], origins: [] } });

async function qrToken(owner: import('@playwright/test').BrowserContext): Promise<string> {
  const tables = asList(await (await owner.request.get(`${API}/tables/`)).json());
  const qr = tables.find((t) => t.qr_token)?.qr_token as string;
  expect(qr, 'seed stollarida QR token bor').toBeTruthy();
  return qr;
}

test('g) taom kartasini bosganda oyna ochiladi: ma\'lumot, tavsiyalar, savatga qo\'shish, yopish', async ({ browser, page, monitor }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  try {
    await page.goto(`/t/${await qrToken(owner)}/`);
    const card = page.locator('.dish-card', { hasText: 'Palov' }).first();
    await expect(card).toBeVisible();

    // Kartaning rasm qismini bosish oynani ochadi (3D bo'lmagan taomda ham)
    await card.locator('.dish-card-media').click();
    const sheet = page.getByRole('dialog', { name: 'Palov' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Palov' })).toBeVisible();
    await expect(sheet.getByText('45,000').or(sheet.getByText('45 000'))).toBeVisible();

    // Tavsiyalar: shu bo'limdagi taomlar va asosiy taomga mos salat
    await expect(sheet.getByText("Shunga o'xshash taomlar")).toBeVisible();
    await expect(sheet.getByRole('button', { name: /Lag'mon: batafsil/ })).toBeVisible();
    await expect(sheet.getByText("Qo'shimcha: salatlar")).toBeVisible();

    // Tavsiyadagi salatga o'tish: oyna yopilmaydi, mazmuni almashadi; seedda shirinlik yo'q, shuning uchun "Qo'shimcha" qatori yo'q
    await sheet.getByRole('button', { name: /Achchiq-chuchuk salat: batafsil/ }).click();
    const salad = page.getByRole('dialog', { name: 'Achchiq-chuchuk salat' });
    await expect(salad).toBeVisible();
    await expect(salad.getByText(/Qo'shimcha:/)).toHaveCount(0);

    // Oynadan savatga qo'shish: tugma "Savatga o'tish" ga almashadi, savat soni 1
    await page.locator('.ds-cta').click();
    await expect(page.locator('.ds-cta')).toHaveText("Savatga o'tish");
    await expect(page.locator('.header-cart-btn .cart-badge')).toHaveText('1');

    // Escape yopadi va sahifa avvalgi joyida qoladi
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/menu\/?/);

    // Karta ichidagi "Qo'shish" tugmasi oynani OCHMAYDI
    await page.locator('.dish-card', { hasText: 'Manti' }).first().locator('.btn-add-to-cart').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Telefonning "orqaga" tugmasi oynani yopadi, sahifadan chiqarib yubormaydi
    await card.locator('.dish-card-media').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/menu\/?/);

    expect(monitor.consoleErrors).toEqual([]);
    expect(monitor.serverErrors).toEqual([]);
  } finally {
    await owner.close();
  }
});

test('h) taom oynasi sozlamadan o\'chirilsa karta avvalgidek (oyna ochilmaydi)', async ({ browser, page }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  const setSheet = async (value: 'on' | 'off') => {
    const resp = await owner.request.patch(`${API}/settings/`, {
      data: { guest_dish_sheet: value }, headers: { 'X-CSRFToken': await csrfToken(owner) },
    });
    expect(resp.ok(), `guest_dish_sheet=${value}`).toBeTruthy();
  };
  try {
    await setSheet('off');
    await page.goto(`/t/${await qrToken(owner)}/`);
    const card = page.locator('.dish-card', { hasText: 'Palov' }).first();
    await expect(card).toBeVisible();
    await card.locator('.dish-card-media').click();
    await page.waitForTimeout(500);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  } finally {
    await setSheet('on');
    await owner.close();
  }
});
