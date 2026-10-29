#!/usr/bin/env node
/**
 * Bundle Budget Validator (gzip hajmi bo'yicha).
 *
 * Tekshiriladi:
 *   - Sahifa chunk'lari  `Page.*.js`   <= 60 KB gzip  (har bir marshrut alohida yuklanadi)
 *   - Qobiq (shell)      `index.*.js`  <= 200 KB gzip (har sahifada birinchi yuklanadi: React, router, UI)
 *   - Har bir CSS        `*.css`       <= 40 KB gzip
 *
 * Haqiqiy o'lchovlar (2026-10-29, `npm run build`, gzip, 1 KB = 1024 bayt): qobiq ~81 KB,
 * eng katta sahifa ~7.6 KB, CSS ~0.6 KB.
 * Chegaralar ataylab bundan ancha yuqori: ular hozirgi hajmni emas, "tasodifan katta narsa kirib
 * qoldi" holatini ushlaydi (masalan, butun diagramma kutubxonasi yoki to'liq CSS framework).
 *   - Qobiq 200 KB: 3G (~1.6 Mbit/s) da ~1 soniya yuklanish; hozirgi ~81 KB dan ~2.5 baravar zaxira.
 *   - CSS 40 KB: panel inline-uslublardan foydalanadi, CSS deyarli yo'q; to'liq Tailwind/UI framework
 *     (~10-40 KB gzip) kirib qolsa darrov qizil bo'ladi.
 *
 * Boshqa umumiy chunk'lar (ikonka, kesh, sana) jadvalda ko'rsatiladi, lekin alohida chegarasi yo'q.
 *
 * Ishlatish:  node scripts/check_bundle_budget.mjs [assets-katalogi]
 * Chegaradan oshsa yoki tekshirib bo'lmasa chiqish kodi 1, aks holda 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DEFAULT_ASSETS_DIR = path.resolve(__dirname, '../../backend/static/admins/resto/assets');

/** KB = 1024 bayt. Qiymatlar gzip'dan keyingi hajmga tegishli. */
export const DEFAULT_LIMITS_KB = Object.freeze({
  page: 60,
  shell: 200,
  css: 40,
});

const KINDS = {
  page: { label: 'sahifa', match: (f) => f.startsWith('Page.') && f.endsWith('.js') },
  shell: { label: 'qobiq', match: (f) => f.startsWith('index.') && f.endsWith('.js') },
  css: { label: 'css', match: (f) => f.endsWith('.css') },
};

function classify(file) {
  for (const [kind, def] of Object.entries(KINDS)) {
    if (def.match(file)) return kind;
  }
  return file.endsWith('.js') ? 'chunk' : null;
}

/**
 * Katalogdagi fayllarni o'lchaydi va chegaralarga solishtiradi. Hech narsani chop etmaydi.
 * @returns {{ ok: boolean, rows: Array, errors: string[], totals: object }}
 */
export function checkBudget(assetsDir = DEFAULT_ASSETS_DIR, limitsKb = DEFAULT_LIMITS_KB) {
  const limits = { ...DEFAULT_LIMITS_KB, ...limitsKb };
  const errors = [];

  if (!fs.existsSync(assetsDir)) {
    return {
      ok: false,
      rows: [],
      errors: [`Assets katalogi topilmadi: ${assetsDir}. Avval 'npm run build' bajaring.`],
      totals: { rawBytes: 0, gzipBytes: 0, files: 0 },
    };
  }

  const rows = [];
  for (const file of fs.readdirSync(assetsDir).sort()) {
    const kind = classify(file);
    if (!kind) continue;
    const content = fs.readFileSync(path.join(assetsDir, file));
    const gzipBytes = zlib.gzipSync(content).length;
    const limitKb = limits[kind];
    const limitBytes = limitKb === undefined ? null : limitKb * 1024;
    const passed = limitBytes === null ? true : gzipBytes <= limitBytes;
    rows.push({ file, kind, rawBytes: content.length, gzipBytes, limitKb: limitKb ?? null, passed });
    if (!passed) {
      errors.push(
        `${file} (${KINDS[kind].label}): gzip ${(gzipBytes / 1024).toFixed(2)} KB > ${limitKb} KB chegarasi`
      );
    }
  }

  // Tekshirib bo'lmaydigan holat jim o'tib ketmasin: qobiq va sahifalar bo'lishi shart.
  if (!rows.some((r) => r.kind === 'shell')) {
    errors.push('Qobiq (index.*.js) topilmadi: byudjetni tekshirib bo\'lmaydi.');
  }
  if (!rows.some((r) => r.kind === 'page')) {
    errors.push('Sahifa chunk\'lari (Page.*.js) topilmadi: byudjetni tekshirib bo\'lmaydi.');
  }

  const totals = {
    rawBytes: rows.reduce((s, r) => s + r.rawBytes, 0),
    gzipBytes: rows.reduce((s, r) => s + r.gzipBytes, 0),
    files: rows.length,
  };
  return { ok: errors.length === 0, rows, errors, totals };
}

const kb = (bytes) => (bytes / 1024).toFixed(2);

/** Natijani jadval ko'rinishida matnga aylantiradi. */
export function formatReport(result, limitsKb = DEFAULT_LIMITS_KB) {
  const limits = { ...DEFAULT_LIMITS_KB, ...limitsKb };
  const line = '-'.repeat(86);
  const out = [];
  out.push('');
  out.push(
    `Resto Admin SPA bundle byudjeti (gzip): sahifa <= ${limits.page} KB, qobiq <= ${limits.shell} KB, CSS <= ${limits.css} KB`
  );
  out.push(line);
  out.push(`${'Fayl'.padEnd(30)} ${'Tur'.padEnd(8)} ${'Raw KB'.padStart(9)} ${'Gzip KB'.padStart(9)} ${'Chegara'.padStart(9)}  Holat`);
  out.push(line);
  for (const r of result.rows) {
    out.push(
      `${r.file.padEnd(30)} ${(KINDS[r.kind]?.label ?? 'chunk').padEnd(8)} ${kb(r.rawBytes).padStart(9)} ${kb(r.gzipBytes).padStart(9)} ${(r.limitKb === null ? '-' : `${r.limitKb} KB`).padStart(9)}  ${r.passed ? 'OK' : 'OSHDI'}`
    );
  }
  out.push(line);

  const sum = (kind) => result.rows.filter((r) => r.kind === kind).reduce((s, r) => s + r.gzipBytes, 0);
  const count = (kind) => result.rows.filter((r) => r.kind === kind).length;
  out.push('Umumiy (gzip):');
  out.push(`  qobiq          ${String(count('shell')).padStart(3)} fayl  ${kb(sum('shell')).padStart(9)} KB`);
  out.push(`  sahifalar      ${String(count('page')).padStart(3)} fayl  ${kb(sum('page')).padStart(9)} KB`);
  out.push(`  boshqa chunk   ${String(count('chunk')).padStart(3)} fayl  ${kb(sum('chunk')).padStart(9)} KB`);
  out.push(`  CSS            ${String(count('css')).padStart(3)} fayl  ${kb(sum('css')).padStart(9)} KB`);
  out.push(`  JAMI           ${String(result.totals.files).padStart(3)} fayl  ${kb(result.totals.gzipBytes).padStart(9)} KB (raw ${kb(result.totals.rawBytes)} KB)`);
  out.push(line);
  return out.join('\n');
}

function main() {
  const dir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ASSETS_DIR;
  const result = checkBudget(dir);
  if (result.rows.length > 0) console.log(formatReport(result));
  if (!result.ok) {
    for (const e of result.errors) console.error(`XATOLIK: ${e}`);
    console.error('\nBundle byudjeti buzildi.\n');
    process.exit(1);
  }
  console.log('\nBarcha fayllar byudjet chegarasida.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
