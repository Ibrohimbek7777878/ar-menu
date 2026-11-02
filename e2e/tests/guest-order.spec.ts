/**
 * (e) Mehmon buyurtmasi haqiqiy brauzerda: QR -> savat -> /checkout/ (React) -> buyurtma yaratildi; qo'sh bosish bitta
 * buyurtma beradi; restoran yopiq bo'lsa tugma o'chiq. TZ_SOTUVGA_TAYYORLASH, P1.
 */
import { API, authFile, csrfToken, expect, test } from './support';

const asList = (body: unknown): any[] =>
  Array.isArray(body) ? body : ((body as { results?: any[]; items?: any[] })?.results ?? (body as { items?: any[] })?.items ?? []);

test.use({ storageState: { cookies: [], origins: [] } });

test('e) mehmon QR orqali buyurtma beradi; qo\'sh bosish ikkita buyurtma yaratmaydi', async ({ browser, page, monitor }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  try {
    const tables = asList(await (await owner.request.get(`${API}/tables/`)).json());
    const qr = tables.find((t) => t.qr_token)?.qr_token as string;
    expect(qr, 'seed stollarida QR token bor').toBeTruthy();
    const dish = asList(await (await owner.request.get(`${API}/menu/products/?q=Palov`)).json())[0];
    expect(dish?.id, 'seed taomi Palov').toBeTruthy();
    const countOrders = async () => asList(await (await owner.request.get(`${API}/orders/`)).json()).length;
    const before = await countOrders();

    // 1. QR skanerlandi (stol sessiyaga yoziladi), savatga taom qo'shildi
    await page.goto(`/t/${qr}/`);
    const added = await page.request.post('/tma/api/cart/', { data: { action: 'add', product_id: dish.id, quantity: 1 } });
    expect(added.ok()).toBeTruthy();

    // 2. React checkout sahifasi: tugma ikki marta bosiladi, lekin buyurtma BITTA
    await page.goto('/checkout/');
    const submit = page.getByRole('button', { name: /Buyurtmani tasdiqlash/ });
    await expect(submit).toBeEnabled();
    await submit.dblclick();
    await page.waitForURL(/\/order\/\d+|\/orders\//, { timeout: 15000 });

    // 3. Serverda aynan bitta yangi buyurtma
    expect(await countOrders()).toBe(before + 1);
    expect(monitor.consoleErrors).toEqual([]);
    expect(monitor.serverErrors).toEqual([]);
  } finally {
    await owner.close();
  }
});

test('f) restoran yopiq bo\'lsa mehmon buyurtma bera olmaydi (tugma o\'chiq)', async ({ browser, page }) => {
  const owner = await browser.newContext({ storageState: authFile('owner') });
  const setOpen = async (isOpen: boolean) => {
    const resp = await owner.request.patch(`${API}/settings/`, {
      data: { is_open: isOpen }, headers: { 'X-CSRFToken': await csrfToken(owner) },
    });
    expect(resp.ok(), `is_open=${isOpen} saqlandi`).toBeTruthy();
  };
  try {
    const tables = asList(await (await owner.request.get(`${API}/tables/`)).json());
    const qr = tables.find((t) => t.qr_token)?.qr_token as string;
    const dish = asList(await (await owner.request.get(`${API}/menu/products/?q=Palov`)).json())[0];
    await setOpen(false);
    await page.goto(`/t/${qr}/`);
    await page.request.post('/tma/api/cart/', { data: { action: 'add', product_id: dish.id, quantity: 1 } });
    await page.goto('/checkout/');
    await expect(page.getByRole('button', { name: /Restoran hozir yopiq/ })).toBeDisabled();
  } finally {
    await setOpen(true);           // boshqa testlar uchun restoran ochiq qoladi
    await owner.close();
  }
});
