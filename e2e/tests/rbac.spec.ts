/**
 * (b) Ofitsiant dashboard'da pul raqamlarini ko'rmaydi (DOM'da ham, API javobida ham).
 * (c) Menejer egani tushira olmaydi, bloklay olmaydi va parolini tiklay olmaydi (API, 403); ega holati o'zgarmaydi.
 */
import { API, PASSWORD, USERNAMES, adminLink, apiJson, authFile, csrfToken, expect, test } from './support';

test.describe('(b) ofitsiant', () => {
  test.use({ storageState: authFile('waiter') });

  test('b) ofitsiant /ra/ ni ocha olmaydi (o\'z paneliga yo\'naltiriladi), API javobida pul raqamlari yo\'q', async ({ page, monitor }) => {
    // Boshqaruv paneli faqat egasi/boshqaruvchiga: ofitsiant /ra/ ochsa o'z ish sahifasiga o'tadi
    await page.goto('/ra/');
    await expect(page).toHaveURL(/\/waiter\/panel\/?$/);

    // Chuqur himoya: API'ga to'g'ridan-to'g'ri murojaat qilganda ham pul raqamlari yuborilmaydi
    const response = await page.request.get(`${API}/dashboard/summary/`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Object.keys(body)).toContain('active_orders'); // javob haqiqatan dashboard xulosasi
    expect(body, 'today_revenue ofitsiantga yuborilmasligi kerak').not.toHaveProperty('today_revenue');
    expect(body, 'average_check ham pul raqami').not.toHaveProperty('average_check');
    for (const dish of body.top_dishes) expect(dish).not.toHaveProperty('total_sum');

    // Moliya bo'limi API'da yopiq
    expect((await page.request.get(`${API}/finance/summary/`)).status()).toBe(403);

    expect(monitor.consoleErrors).toEqual([]);
    expect(monitor.serverErrors).toEqual([]);
  });
});

test.describe('(c) menejer', () => {
  test.use({ storageState: authFile('manager') });

  test('c) menejer egani tushira, bloklay olmaydi va parolini tiklay olmaydi (403); ega o\'zgarmaydi', async ({ page, playwright, baseURL }) => {
    await page.goto('/ra/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const context = page.context();
    const csrf = await csrfToken(context);

    const staff = await (await page.request.get(`${API}/staff/`)).json();
    const owner = staff.find((u: { username: string }) => u.username === USERNAMES.owner);
    const waiter = staff.find((u: { username: string }) => u.username === USERNAMES.waiter);
    expect(owner, "ega xodimlar ro'yxatida").toBeTruthy();
    expect(owner.role).toBe('shop_owner');

    // Nazorat: menejerning o'z huquqidagi amali shu CSRF bilan O'TADI (403 CSRF xatosi emas, rol cheklovi ekanini isbotlaydi)
    const allowed = await apiJson(context, 'PATCH', `${API}/staff/${waiter.id}/`, { phone: '+998901234500' }, csrf);
    expect(allowed.status(), 'menejer ofitsiantni tahrirlay oladi').toBe(200);

    // 1) egani tushirish (rolini o'zgartirish)
    const demote = await apiJson(context, 'PATCH', `${API}/staff/${owner.id}/`, { role: 'waiter' }, csrf);
    expect(demote.status()).toBe(403);
    expect((await demote.json()).error).toMatch(/Menejer/);
    // 2) bloklash
    const block = await apiJson(context, 'POST', `${API}/staff/${owner.id}/block/`, {}, csrf);
    expect(block.status()).toBe(403);
    expect((await block.json()).error).toMatch(/Menejer/);
    // 3) parolini tiklash
    const hackedPassword = 'Hujum-parol-777!';
    const reset = await apiJson(context, 'POST', `${API}/staff/${owner.id}/reset-password/`, { password: hackedPassword }, csrf);
    expect(reset.status()).toBe(403);
    expect((await reset.json()).error).toMatch(/Menejer/);

    // Ega holati o'zgarmagan: roli va faolligi joyida
    const after = await (await page.request.get(`${API}/staff/`)).json();
    const ownerAfter = after.find((u: { id: number }) => u.id === owner.id);
    expect(ownerAfter.role).toBe('shop_owner');
    expect(ownerAfter.is_active).toBe(true);

    // Parol haqiqatan o'zgarmagan: eski parol bilan kirish o'tadi, hujumchi paroli bilan o'tmaydi
    const login = async (password: string) => {
      // storageState bo'sh: test.use() sessiyasi (menejer) meros bo'lib qolmasin — aks holda login sahifasi darhol yo'naltiradi
      const anon = await playwright.request.newContext({ baseURL: baseURL!, storageState: { cookies: [], origins: [] } });
      expect((await anon.get('/admin/login/')).status(), 'login sahifasi anonim ochiladi').toBe(200);
      const cookies = (await anon.storageState()).cookies;
      const token = cookies.find((c) => c.name === 'csrftoken')?.value ?? '';
      const res = await anon.post('/admin/login/', {
        form: { username: USERNAMES.owner, password },
        headers: { 'X-CSRFToken': token },
        maxRedirects: 0,
      });
      const outcome = { status: res.status(), location: res.headers()['location'] ?? '', body: res.status() === 200 ? await res.text() : '' };
      await anon.dispose();
      return outcome;
    };
    const original = await login(PASSWORD);
    expect(original.status, "eski parol bilan kirish muvaffaqiyatli (302)").toBe(302);
    expect(original.location).not.toContain('/admin/login');
    const hacked = await login(hackedPassword);
    expect(hacked.status, "hujumchi paroli bilan kirish rad etiladi (login sahifasi qayta chiziladi)").toBe(200);
    expect(hacked.body).toContain('Login yoki parol xato');
  });
});
