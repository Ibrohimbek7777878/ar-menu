/**
 * (i) Til almashtirish: sozlamalar oynasi -> Русский; matn tilga o'tadi, savat saqlanadi, qayta yuklaganda tanlov turadi.
 * (j) Kun / Tun / Avto: `<html data-theme>`, fon rangi, qayta yuklaganda eslab qolish, Avto tizim mavzusiga ergashadi.
 * (k) Sozlamadan o'chirilsa (guest_theme=off, guest_languages=uz) almashtirgich tugmasi umuman chizilmaydi.
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

const bodyLuma = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const [r, g, b] = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g)!.map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });

test('i) til almashadi: matn, savat va tanlov saqlanadi', async ({ browser, page, monitor }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  try {
    await page.goto(`/t/${await qrToken(owner)}/`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'uz');
    await page.locator('.dish-card', { hasText: 'Manti' }).first().locator('.btn-add-to-cart').click();
    await expect(page.locator('.header-cart-btn .cart-badge')).toHaveText('1');

    await page.getByRole('button', { name: 'Sozlamalar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sozlamalar' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('radio', { name: 'Русский' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    // Oyna ochiq qoladi, lekin endi ruscha (daraxt qayta ulandi): tanlov darrov ko'rinadi
    const ruDialog = page.getByRole('dialog', { name: 'Настройки' });
    await expect(ruDialog).toBeVisible();
    await expect(ruDialog.getByRole('radio', { name: 'Русский' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.header-cart-btn .cart-badge')).toHaveText('1'); // savat yo'qolmadi

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('button', { name: 'Настройки' })).toBeVisible();

    // Inglizcha va qaytib o'zbekcha (oyna ochiq qoladi)
    await page.getByRole('button', { name: 'Настройки' }).click();
    await page.getByRole('dialog', { name: 'Настройки' }).getByRole('radio', { name: 'English' }).click();
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('radio', { name: "O'zbekcha" }).click();
    await expect(page.getByRole('dialog', { name: 'Sozlamalar' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Sozlamalar' })).toBeVisible();

    expect(monitor.consoleErrors).toEqual([]);
    expect(monitor.serverErrors).toEqual([]);
  } finally {
    await owner.close();
  }
});

test('j) Kun / Tun / Avto: rejim almashadi, fon qorayadi, tanlov qayta yuklaganda turadi', async ({ browser, page, monitor }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  try {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(`/t/${await qrToken(owner)}/`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await bodyLuma(page)).toBeGreaterThan(0.85);

    await page.getByRole('button', { name: 'Sozlamalar' }).click();
    await page.getByRole('dialog', { name: 'Sozlamalar' }).getByRole('radio', { name: /Tun/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect.poll(() => bodyLuma(page)).toBeLessThan(0.15);
    await page.keyboard.press('Escape');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await bodyLuma(page)).toBeLessThan(0.15);

    // Avto: telefon mavzusiga ergashadi (oyna reload'dan keyin yopiq: qayta ochamiz, so'ng ochiq qoladi)
    await page.getByRole('button', { name: 'Sozlamalar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sozlamalar' });
    await dialog.getByRole('radio', { name: /Avto/ }).click();
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Kun
    await dialog.getByRole('radio', { name: /Kun/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    expect(monitor.consoleErrors).toEqual([]);
    expect(monitor.serverErrors).toEqual([]);
  } finally {
    await owner.close();
  }
});

test('k) sozlamadan o\'chirilsa almashtirgich tugmasi chizilmaydi; yangi mehmon sozlamadagi rejimni ko\'radi', async ({ browser, page }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  const set = async (fields: Record<string, string>) => {
    const resp = await owner.request.patch(`${API}/settings/`, { data: fields, headers: { 'X-CSRFToken': await csrfToken(owner) } });
    expect(resp.ok(), JSON.stringify(fields)).toBeTruthy();
  };
  try {
    await set({ guest_theme: 'off', guest_languages: 'uz' });
    await page.goto(`/t/${await qrToken(owner)}/`);
    await expect(page.locator('.dish-card').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sozlamalar' })).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);

    // Faqat tema yoqiq, til bitta: tugma bor, ichida faqat "Ko'rinish"
    await set({ guest_theme: 'night', guest_languages: 'uz' });
    await page.goto(`/t/${await qrToken(owner)}/`);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Sozlamalar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sozlamalar' });
    await expect(dialog.getByText("Ko'rinish")).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Русский' })).toHaveCount(0);
  } finally {
    await set({ guest_theme: 'day', guest_languages: 'uz,ru,en' });
    await owner.close();
  }
});
