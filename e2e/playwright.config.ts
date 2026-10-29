import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8013);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const IN_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // Yiqilgan testning skrinshoti, trace'i va HTML hisobot shu yerga tushadi (e2e/artifacts — git'da emas)
  outputDir: './artifacts/test-results',
  // Bitta SQLite baza va holatni o'zgartiruvchi stsenariylar (taom qo'shish, to'lovni qaytarish) -> ketma-ket
  fullyParallel: false,
  workers: 1,
  retries: 0, // qayta urinish "ba'zan yiqiladi"ni yashiradi; flaky bo'lsa sababini tuzatamiz
  forbidOnly: IN_CI,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: IN_CI
    ? [['github'], ['list'], ['html', { outputFolder: 'artifacts/report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'artifacts/report', open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: BASE_URL,
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // 1) Haqiqiy login formasi orqali 4 rolda kirib, sessiyani artifacts/.auth/ ga saqlaydi
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // 2) Stsenariylar tayyor sessiyalar bilan ishlaydi
    { name: 'chromium', testIgnore: /auth\.setup\.ts/, dependencies: ['setup'] },
  ],
  webServer: {
    // Vaqtinchalik SQLite -> migrate -> seed_e2e -> runserver (scripts/start-server.mjs)
    command: 'node scripts/start-server.mjs',
    url: `${BASE_URL}/health/`,
    timeout: 180_000,
    // Port band bo'lsa to'xtaydi (boshqa serverga "tasodifan" ulanib, noma'lum holatda yurgizmaslik uchun);
    // ataylab ishlayotgan serverda yurgizish: E2E_REUSE_SERVER=1 (baza seed_e2e bilan to'ldirilgan bo'lishi kerak)
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1',
    stdout: 'pipe',
    stderr: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
