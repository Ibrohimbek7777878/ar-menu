#!/usr/bin/env node
// gunicorn jurnalidan (backend/gunicorn.conf.py formati) server vaqtini hisoblaydi: yo'l bo'yicha p50/p95/p99, holatlar, eng sekin so'rovlar.
// Foydalanish: docker compose logs --no-log-prefix web | node parse_access_log.mjs [--slow 5] [--keep-query]
//              node parse_access_log.mjs fayl.log
// Bu MIJOZ ko'rgan vaqt emas (tarmoq va navbat kutilmaydi), faqat gunicorn ichidagi vaqt: yuk generatori hisoboti bilan birga o'qiladi.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { summarize } from './lib/stats.mjs';

const LINE = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+)[^"]*" (\d{3}) (\S+) "[^"]*" "[^"]*" (\d+)(?: (\S+))?\s*$/;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function parseTime(s) {
  const m = s.match(/^(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+) ([+-])(\d{2})(\d{2})$/);
  if (!m) return NaN;
  const [, d, mon, y, hh, mm, ss, sign, oh, om] = m;
  const utc = Date.UTC(+y, MONTHS[mon], +d, +hh, +mm, +ss);
  return utc - (sign === '+' ? 1 : -1) * (+oh * 60 + +om) * 60000;
}

export function parseLog(text, { keepQuery = false } = {}) {
  const rows = [];
  let skipped = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(LINE);
    if (!m) { skipped++; continue; }
    const [, ip, ts, method, rawPath, status, , micros, rid] = m;
    rows.push({ ip, at: parseTime(ts), method, path: keepQuery ? rawPath : rawPath.split('?')[0], status: +status, ms: +micros / 1000, rid: rid && rid !== '-' ? rid : '' });
  }
  return { rows, skipped };
}

export function summarizeLog(rows) {
  const spanSec = rows.length ? Math.max(1, (Math.max(...rows.map((r) => r.at)) - Math.min(...rows.map((r) => r.at))) / 1000) : 0;
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.method} ${r.path}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const table = [...groups].map(([key, list]) => {
    const sm = summarize(list.map((r) => r.ms));
    const status = {};
    for (const r of list) status[r.status] = (status[r.status] ?? 0) + 1;
    return { key, count: list.length, rps: list.length / spanSec, p50: sm.p50, p95: sm.p95, p99: sm.p99, max: sm.max, status };
  }).sort((a, b) => b.count - a.count);
  return { spanSec, total: rows.length, table };
}

function main() {
  const args = process.argv.slice(2);
  const keepQuery = args.includes('--keep-query');
  const slowIdx = args.indexOf('--slow');
  const slow = slowIdx >= 0 ? Number(args[slowIdx + 1]) : 5;
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--slow');
  const text = fs.readFileSync(file ?? 0, 'utf8');
  const { rows, skipped } = parseLog(text, { keepQuery });
  const s = summarizeLog(rows);
  console.log(`So'rovlar: ${s.total} (${s.spanSec.toFixed(0)} s oralig'ida), o'qilmagan qatorlar: ${skipped}\n`);
  console.log('| So\'rov | soni | req/s | p50 ms | p95 ms | p99 ms | max ms | holatlar |\n|---|---:|---:|---:|---:|---:|---:|---|');
  for (const t of s.table) {
    console.log(`| ${t.key} | ${t.count} | ${t.rps.toFixed(1)} | ${t.p50.toFixed(1)} | ${t.p95.toFixed(1)} | ${t.p99.toFixed(1)} | ${t.max.toFixed(1)} | ${Object.entries(t.status).map(([k, v]) => `${k}:${v}`).join(' ')} |`);
  }
  if (slow > 0) {
    console.log(`\nEng sekin ${slow} ta so'rov:`);
    for (const r of [...rows].sort((a, b) => b.ms - a.ms).slice(0, slow)) console.log(`  ${r.ms.toFixed(1)} ms  ${r.method} ${r.path}  ${r.status}  id=${r.rid || '-'}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
