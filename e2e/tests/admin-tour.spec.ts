/**
 * (a) Egasi /ra/ ning 7 sahifasini ketma-ket ochadi: sarlavha, xatosizlik, hujjat qayta yuklanmasligi, faqat shu sahifa bo'lagi.
 * (e) /ra/ sahifalari tashqi domenga so'rov yubormaydi.
 */
import { ADMIN_PAGES, adminLink, authFile, expect, pageChunkFiles, test } from './support';

test.use({ storageState: authFile('owner') });

const heading = (page: import('@playwright/test').Page, title: RegExp) =>
  page.getByRole('heading', { level: 1 }).filter({ hasText: title });

test('a) egasi: 7 sahifa ketma-ket — sarlavha ko\'rinadi, xato yo\'q, hujjat qayta yuklanmaydi, faqat shu sahifaning JS bo\'lagi yuklanadi', async ({ page, monitor }) => {
  const chunkOf = pageChunkFiles(); // manba fayl -> /static/admins/resto/assets/Page.<hash>.js
  const allChunks = Object.values(chunkOf);
  expect(new Set(allChunks).size, "7 sahifa = 7 ta alohida bo'lak (lazy)").toBe(7);
  const loadedPageChunks = () => allChunks.filter((file) => monitor.requestsMatching(file).length > 0);

  await page.goto('/ra/'); // yagona hujjat navigatsiyasi (sessiya tayyor — login redirecti yo'q)
  await expect(heading(page, ADMIN_PAGES[0].title)).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __e2eMarker: string }).__e2eMarker = 'hujjat-qayta-yuklanmadi';
  });
  // Dastlabki yuklashda faqat Dashboard bo'lagi olingan, qolgan 6 sahifa hali yuklanmagan
  expect(loadedPageChunks()).toEqual([chunkOf[ADMIN_PAGES[0].src]]);

  const visited = [chunkOf[ADMIN_PAGES[0].src]];
  for (const target of ADMIN_PAGES.slice(1)) {
    await adminLink(page, target.slug).click();
    await expect(page).toHaveURL(new RegExp(`/ra/${target.slug}/?$`));
    await expect(heading(page, target.title), `${target.slug}: sarlavha ko'rinishi kerak`).toBeVisible();
    visited.push(chunkOf[target.src]);
    expect(loadedPageChunks(), `${target.slug}: faqat ko'rilgan sahifalar bo'laklari yuklangan bo'lishi kerak`).toEqual(visited);
  }

  // Dashboard'ga qaytish: yangi so'rovsiz (bo'lak keshda), yana hujjat yuklanmaydi
  await adminLink(page, '').click();
  await expect(heading(page, ADMIN_PAGES[0].title)).toBeVisible();

  // Hujjat bir marta ham qayta yuklanmagan
  expect(monitor.navigations, 'butun sayohat davomida faqat bitta navigatsiya so\'rovi').toEqual(['GET /ra/']);
  expect(await page.evaluate(() => (window as unknown as { __e2eMarker?: string }).__e2eMarker)).toBe('hujjat-qayta-yuklanmadi');
  for (const file of allChunks) {
    expect(monitor.requestsMatching(file), `${file} aynan bir marta yuklangan`).toHaveLength(1);
  }

  // Xatosizlik
  expect(monitor.consoleErrors, 'console.error').toEqual([]);
  expect(monitor.pageErrors, 'ushlanmagan JS xatolar').toEqual([]);
  expect(monitor.serverErrors, '5xx javoblar').toEqual([]);
  expect(monitor.httpFailures, "/api/ va /static/ da 4xx/5xx javoblar").toEqual([]);
});

test('e) /ra/ ning hamma sahifasi tashqi domenga (127.0.0.1/localhost dan boshqa) so\'rov yubormaydi', async ({ page, monitor }) => {
  await page.goto('/ra/');
  await expect(heading(page, ADMIN_PAGES[0].title)).toBeVisible();
  for (const target of ADMIN_PAGES.slice(1)) {
    await adminLink(page, target.slug).click();
    await expect(heading(page, target.title)).toBeVisible();
  }
  expect(monitor.external, 'tashqi domenlarga urinilgan so\'rovlar (Google Fonts, CDN va h.k.)').toEqual([]);
});
