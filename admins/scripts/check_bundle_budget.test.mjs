import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkBudget, formatReport, DEFAULT_ASSETS_DIR, DEFAULT_LIMITS_KB } from './check_bundle_budget.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'check_bundle_budget.mjs');

/** Siqilmaydigan (tasodifiy) baytlar: gzip hajmi ~ raw hajmga teng bo'ladi. */
const noise = (kb) => crypto.randomBytes(Math.round(kb * 1024));
/** Juda yaxshi siqiladigan baytlar. */
const flat = (kb) => Buffer.alloc(Math.round(kb * 1024), 'a');

function makeDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-'));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

const healthy = () => ({
  'index.abc123.js': noise(80),
  'Page.aaa111.js': noise(10),
  'Page.bbb222.js': noise(20),
  'index.def456.css': noise(2),
  'cache.zzz999.js': noise(1),
});

test('chegara ichida: ok=true, har bir tur uchun qator bor', () => {
  const dir = makeDir(healthy());
  const r = checkBudget(dir);
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.equal(r.errors.length, 0);
  assert.deepEqual(
    r.rows.map((x) => x.kind).sort(),
    ['chunk', 'css', 'page', 'page', 'shell']
  );
  assert.equal(r.totals.files, 5);
});

test('sahifa chunk\'i 60 KB dan oshsa xato', () => {
  const dir = makeDir({ ...healthy(), 'Page.big000.js': noise(61) });
  const r = checkBudget(dir);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /Page\.big000\.js/);
});

test('qobiq 200 KB dan oshsa xato', () => {
  const dir = makeDir({ ...healthy(), 'index.abc123.js': noise(201) });
  const r = checkBudget(dir);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /index\.abc123\.js \(qobiq\)/);
});

test('CSS 40 KB dan oshsa xato', () => {
  const dir = makeDir({ ...healthy(), 'index.def456.css': noise(41) });
  const r = checkBudget(dir);
  assert.equal(r.ok, false);
  assert.match(r.errors.join('\n'), /index\.def456\.css \(css\)/);
});

test('o\'lchov gzip bo\'yicha: raw katta, lekin yaxshi siqiladigan fayl o\'tadi', () => {
  const dir = makeDir({ ...healthy(), 'Page.flat00.js': flat(500) });
  const r = checkBudget(dir);
  const row = r.rows.find((x) => x.file === 'Page.flat00.js');
  assert.ok(row.rawBytes > 400 * 1024);
  assert.ok(row.gzipBytes < 5 * 1024);
  assert.equal(r.ok, true);
});

test('aniq chegara: 60 KB gzip dan bir bayt kam o\'tadi, ko\'p bo\'lsa o\'tmaydi', () => {
  // Tasodifiy baytlarning gzip hajmi raw dan bir oz katta bo'ladi, shuning uchun chegarani o'zi o'lchaymiz.
  const dir = makeDir({ ...healthy(), 'Page.edge00.js': noise(30) });
  const row = checkBudget(dir).rows.find((x) => x.file === 'Page.edge00.js');
  const exact = checkBudget(dir, { page: row.gzipBytes / 1024 });
  assert.equal(exact.rows.find((x) => x.file === 'Page.edge00.js').passed, true);
  const tooTight = checkBudget(dir, { page: (row.gzipBytes - 1) / 1024 });
  assert.equal(tooTight.rows.find((x) => x.file === 'Page.edge00.js').passed, false);
  assert.equal(tooTight.ok, false);
});

test('sozlanadigan chegaralar DEFAULT ni to\'liq almashtirmaydi', () => {
  const dir = makeDir({ ...healthy(), 'index.abc123.js': noise(201) });
  const r = checkBudget(dir, { shell: 300 });
  assert.equal(r.ok, true);
  assert.equal(DEFAULT_LIMITS_KB.shell, 200);
  assert.equal(DEFAULT_LIMITS_KB.page, 60);
  assert.equal(DEFAULT_LIMITS_KB.css, 40);
});

test('tekshirib bo\'lmaydigan holatlar jim o\'tib ketmaydi', () => {
  const noShell = checkBudget(makeDir({ 'Page.a.js': noise(1), 'x.css': noise(1) }));
  assert.equal(noShell.ok, false);
  assert.match(noShell.errors.join('\n'), /Qobiq/);

  const noPages = checkBudget(makeDir({ 'index.a.js': noise(1) }));
  assert.equal(noPages.ok, false);
  assert.match(noPages.errors.join('\n'), /Page\.\*\.js/);

  const missing = checkBudget(path.join(os.tmpdir(), 'budget-yoq-katalog-12345'));
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join('\n'), /topilmadi/);
});

test('boshqa fayllar (rasm, map) e\'tiborga olinmaydi', () => {
  const dir = makeDir({ ...healthy(), 'logo.svg': noise(500), 'index.abc123.js.map': noise(900) });
  const r = checkBudget(dir);
  assert.equal(r.ok, true);
  assert.equal(r.totals.files, 5);
});

test('hisobot: jadval va umumiy qatorlar chiqadi', () => {
  const r = checkBudget(makeDir(healthy()));
  const text = formatReport(r);
  assert.match(text, /Page\.aaa111\.js/);
  assert.match(text, /index\.abc123\.js/);
  assert.match(text, /JAMI/);
  assert.match(text, /qobiq/);
  assert.match(text, /CSS/);
});

test('CLI: byudjet buzilsa chiqish kodi 1, aks holda 0', () => {
  const good = spawnSync(process.execPath, [SCRIPT, makeDir(healthy())], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stderr);

  const bad = spawnSync(process.execPath, [SCRIPT, makeDir({ ...healthy(), 'index.def456.css': noise(41) })], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /index\.def456\.css/);

  const missing = spawnSync(process.execPath, [SCRIPT, path.join(os.tmpdir(), 'budget-yoq-katalog-12345')], { encoding: 'utf8' });
  assert.equal(missing.status, 1);
});

test('haqiqiy build katalogi byudjetga sig\'adi (katalog bo\'lsa)', { skip: !fs.existsSync(DEFAULT_ASSETS_DIR) }, () => {
  const r = checkBudget(DEFAULT_ASSETS_DIR);
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.ok(r.rows.some((x) => x.kind === 'shell'));
  assert.ok(r.rows.some((x) => x.kind === 'page'));
});
