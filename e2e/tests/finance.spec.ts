/**
 * (f) Egasi buyurtma to'lovini API orqali qaytaradi -> moliya xulosasi va dashboard tushumi shu summaga kamayadi.
 */
import { API, apiJson, authFile, expect, test } from './support';

test.use({ storageState: authFile('owner') });

test('f) to\'lov qaytarilganda moliya xulosasi tushumi kamayadi', async ({ page }) => {
  await page.goto('/ra/finance'); // SPA sessiyasi + CSRF cookie
  await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Moliya/ })).toBeVisible();

  const getJson = async (url: string) => {
    const res = await page.request.get(url);
    expect(res.status(), url).toBe(200);
    return res.json();
  };

  const financeBefore = await getJson(`${API}/finance/summary/`);
  const dashboardBefore = await getJson(`${API}/dashboard/summary/`);
  const paid = await getJson(`${API}/orders/?payment_status=paid&page_size=50`);
  expect(paid.items.length, "seed: kamida 1 ta to'langan buyurtma").toBeGreaterThan(0);
  const order = paid.items[0];
  const amount: number = order.final_amount;
  expect(amount).toBeGreaterThan(0);
  expect(financeBefore.income).toBeGreaterThanOrEqual(amount);

  const refund = await apiJson(page.context(), 'POST', `${API}/orders/${order.id}/payment/`, { payment_status: 'refunded' });
  expect(refund.status(), await refund.text()).toBe(200);
  expect((await refund.json()).payment_status).toBe('refunded');

  const financeAfter = await getJson(`${API}/finance/summary/`);
  const dashboardAfter = await getJson(`${API}/dashboard/summary/`);
  expect(financeAfter.income, 'moliya xulosasi tushumi').toBe(financeBefore.income - amount);
  expect(dashboardAfter.today_revenue.total, 'dashboard bugungi tushumi').toBe(dashboardBefore.today_revenue.total - amount);
  expect(financeAfter.income_cash + financeAfter.income_card).toBe(financeBefore.income_cash + financeBefore.income_card - amount);

  // Buyurtma holati ham "qaytarilgan" va to'langanlar ro'yxatidan chiqdi
  const detail = await getJson(`${API}/orders/${order.id}/`);
  expect(detail.payment_status).toBe('refunded');
  const paidAfter = await getJson(`${API}/orders/?payment_status=paid&page_size=50`);
  expect(paidAfter.items.map((o: { id: number }) => o.id)).not.toContain(order.id);
  expect(paidAfter.total).toBe(paid.total - 1);

  // UI ham yangi holatni ko'rsatadi (qayta yuklanganda xatosiz chiziladi)
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: /Moliya/ })).toBeVisible();
});
