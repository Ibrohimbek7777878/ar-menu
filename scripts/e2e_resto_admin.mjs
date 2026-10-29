#!/usr/bin/env node
/**
 * Resto-Admin (/ra/) HAQIQIY brauzer E2E ishga tushirgichi (TZ 4.7).
 *
 * Eslatma: avval bu fayl "E2E" deb o'zini ko'rsatardi, lekin brauzer ochmasdi va so'rov yubormasdi — faqat
 * manifestni o'qib "muvaffaqiyatli" deb chop etardi (soxta). Endi u Playwright testlarini (e2e/ papkasi) yurgizadi:
 * vaqtinchalik SQLite -> migrate -> seed_e2e -> Django serveri (8013) -> haqiqiy Chromium.
 *
 * Ishlatish (repo ildizidan):
 *   node scripts/e2e_resto_admin.mjs                # barcha stsenariylar
 *   node scripts/e2e_resto_admin.mjs -g "menyu"     # qo'shimcha argumentlar `playwright test` ga o'tadi
 *   node scripts/e2e_resto_admin.mjs --headed
 *
 * Birinchi marta: `cd e2e && npm ci && npx playwright install chromium` (bu skript bog'liqliklarni o'zi o'rnatadi,
 * brauzerni esa o'rnatmaydi). Batafsil: e2e/README.md
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const e2eDir = path.join(root, 'e2e');

// 1. Oldindan tekshiruv: admin SPA build'i (Vite manifest) mavjudmi — testlar commit qilingan backend/static/admins/resto ni ishlatadi
const manifestPath = path.join(root, 'backend/static/admins/resto/.vite/manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`Vite manifest.json topilmadi: ${manifestPath}\nAvval: cd admins && npm ci && npm run build`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!Object.values(manifest).some((item) => item.isEntry)) {
  console.error('Manifestda kirish nuqtasi (isEntry) topilmadi — admins build buzilgan.');
  process.exit(1);
}

// 2. E2E bog'liqliklari (faqat birinchi marta)
if (!fs.existsSync(path.join(e2eDir, 'node_modules', '@playwright', 'test'))) {
  console.log('e2e/ bog\'liqliklari o\'rnatilmoqda (npm ci)...');
  const install = spawnSync('npm', ['ci'], { cwd: e2eDir, stdio: 'inherit' });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

// 3. Haqiqiy testlar: chiqish kodi to'g'ridan-to'g'ri uzatiladi (yiqilsa nolga teng emas)
const run = spawnSync('npx', ['playwright', 'test', ...process.argv.slice(2)], { cwd: e2eDir, stdio: 'inherit' });
process.exit(run.status ?? 1);
