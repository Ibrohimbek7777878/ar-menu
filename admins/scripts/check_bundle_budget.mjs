#!/usr/bin/env node
/**
 * Bundle Budget Validator (TZ: Har bir sahifa chunk gzip <= 60 KB).
 * Har bir route / sahifa chunk'i uchun gzip hajmini tekshiradi.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_PAGE_GZIP_KB = 60; // 60 KB
const ASSETS_DIR = path.resolve(__dirname, '../../backend/static/admins/resto/assets');

if (!fs.existsSync(ASSETS_DIR)) {
  console.error(`❌ Assets katalogi topilmadi: ${ASSETS_DIR}`);
  console.error(`Avval 'npm run build' bajaring.`);
  process.exit(1);
}

const files = fs.readdirSync(ASSETS_DIR).filter((f) => f.startsWith('Page.') && f.endsWith('.js'));

if (files.length === 0) {
  console.error(`❌ Sahifa chunklari (Page.*.js) topilmadi.`);
  process.exit(1);
}

console.log(`\n📦 Resto Admin SPA Bundle Budget Tekshiruvi (Maksimum: ${MAX_PAGE_GZIP_KB} KB gzip):`);
console.log(`--------------------------------------------------------------------------------`);

let hasError = false;

for (const file of files) {
  const filePath = path.join(ASSETS_DIR, file);
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  const sizeKb = (content.length / 1024).toFixed(2);
  const gzipKb = (gzipped.length / 1024).toFixed(2);

  const passed = parseFloat(gzipKb) <= MAX_PAGE_GZIP_KB;
  const statusIcon = passed ? '✅' : '❌';

  console.log(
    ` ${statusIcon} ${file.padEnd(25)} │ Raw: ${sizeKb.padStart(7)} KB │ Gzip: ${gzipKb.padStart(6)} KB`
  );

  if (!passed) {
    hasError = true;
    console.error(`   ⚠️ XATOLIK: ${file} belgilangan ${MAX_PAGE_GZIP_KB} KB budjetdan oshdi!`);
  }
}

console.log(`--------------------------------------------------------------------------------`);

if (hasError) {
  console.error(`\n❌ Ayrim chunklar budgetdan oshib ketdi!`);
  process.exit(1);
} else {
  console.log(`\n🎉 Barcha sahifa chunklari belgilangan budget talabiga (<= 60 KB) to'liq javob beradi!\n`);
  process.exit(0);
}
