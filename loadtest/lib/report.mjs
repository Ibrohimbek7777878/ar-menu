// Hisobot: qadam bo'yicha natijalar, vaqt oynalari, SLO tekshiruvi. JSON (mashina uchun) va Markdown (odam uchun).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { summarize, windows } from './stats.mjs';

const isError = (s) => Boolean(s.err) || s.status >= 500;
const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '-');

function gitSha(cwd) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'noma\'lum';
  }
}

export function buildReport({ recorder, profile, config, shared, scenarioResults, actualSec, repoDir, remote }) {
  const all = recorder.samples;
  const measured = all.filter((s) => !s.step.startsWith('setup-'));
  const steps = {};
  for (const name of new Set(measured.map((s) => s.step))) {
    const list = measured.filter((s) => s.step === name);
    const sm = summarize(list.filter((s) => !s.err).map((s) => s.ms));
    const status = {};
    for (const s of list) status[s.err ? `err:${s.err}` : s.status] = (status[s.err ? `err:${s.err}` : s.status] ?? 0) + 1;
    steps[name] = {
      count: list.length, rps: list.length / Math.max(1, actualSec), errors: list.filter(isError).length,
      errorRate: list.filter(isError).length / list.length, retried: list.filter((s) => s.retried).length,
      mean: sm.mean, p50: sm.p50, p95: sm.p95, p99: sm.p99, max: sm.max, status,
    };
  }
  const overall = summarize(measured.filter((s) => !s.err).map((s) => s.ms));
  const errorCount = measured.filter(isError).length;
  const win = windows(measured, 10000);
  const third = Math.max(1, Math.floor(win.length / 3));
  const p95Of = (ws) => summarize(ws.map((w) => w.p95).filter(Number.isFinite)).p50;
  const trend = win.length >= 6 ? { firstThirdP95: p95Of(win.slice(0, third)), lastThirdP95: p95Of(win.slice(-third)) } : null;

  const orderNumbers = shared.orderNumbers;
  const duplicates = orderNumbers.length - new Set(orderNumbers).size;

  const slo = evaluateSlo(profile.slo, { steps, errorCount, total: measured.length, duplicates, shared, actualSec, config });
  return {
    meta: {
      profile: profile.name, label: config.label ?? '', date: new Date().toISOString(), base: config.base,
      remote, stack: config.stack ?? '', notes: config.notes ?? '',
      node: process.version, cpus: os.cpus().length, memGB: +(os.totalmem() / 2 ** 30).toFixed(1),
      loadavgStart: config.loadavgStart, loadavgEnd: os.loadavg().map((v) => +v.toFixed(2)), gitSha: gitSha(repoDir),
      timeScale: config.timeScale, seed: config.seed, durationSec: config.durationSec, actualSec: +actualSec.toFixed(1),
      scenarios: profile.scenarios,
    },
    totals: { requests: measured.length, errors: errorCount, errorRate: measured.length ? errorCount / measured.length : 0, retried: recorder.retried,
      rps: measured.length / Math.max(1, actualSec), p50: overall.p50, p95: overall.p95, p99: overall.p99, max: overall.max,
      orders: { created: orderNumbers.length, duplicates, failures: shared.orderFailures } },
    steps, windows: win, trend, notes: shared.notes, scenarioResults, slo,
  };
}

function evaluateSlo(spec, ctx) {
  const checks = [];
  const warnings = [];
  if (!spec) return { verdict: 'SLO belgilanmagan', checks, warnings };
  for (const [step, limits] of Object.entries(spec.steps ?? {})) {
    const s = ctx.steps[step];
    if (!s) { checks.push({ name: `${step}: so'rovlar bo'lishi kerak`, ok: false, value: 'so\'rov yo\'q' }); continue; }
    if (limits.p95Ms != null) checks.push({ name: `${step} p95 ≤ ${limits.p95Ms} ms`, ok: s.p95 <= limits.p95Ms, value: `${fmt(s.p95)} ms` });
    if (limits.p99Ms != null) checks.push({ name: `${step} p99 ≤ ${limits.p99Ms} ms`, ok: s.p99 <= limits.p99Ms, value: `${fmt(s.p99)} ms` });
  }
  if (spec.maxErrorRate != null) {
    const rate = ctx.total ? ctx.errorCount / ctx.total : 0;
    checks.push({ name: `xato ulushi ≤ ${(spec.maxErrorRate * 100).toFixed(2)}%`, ok: rate <= spec.maxErrorRate, value: `${(rate * 100).toFixed(3)}% (${ctx.errorCount}/${ctx.total})` });
  }
  if (spec.noDuplicateOrders) checks.push({ name: 'takroriy buyurtma raqami yo\'q', ok: ctx.duplicates === 0, value: `${ctx.duplicates} ta takror` });
  if (spec.maxOrderFailures != null) checks.push({ name: `buyurtma xatolari ≤ ${spec.maxOrderFailures}`, ok: ctx.shared.orderFailures <= spec.maxOrderFailures, value: `${ctx.shared.orderFailures} ta` });
  if (spec.maxDrainSec != null && ctx.shared.drainSec != null) checks.push({ name: `portlashdan keyin bo'shash ≤ ${spec.maxDrainSec} s`, ok: ctx.shared.drainSec <= spec.maxDrainSec, value: `${fmt(ctx.shared.drainSec, 1)} s` });
  if (spec.minDurationSec != null && ctx.actualSec < spec.minDurationSec) warnings.push(`Yurish ${fmt(ctx.actualSec)} s, mezon kamida ${spec.minDurationSec} s talab qiladi: bu isbot EMAS`);
  if (ctx.config.timeScale !== 1) warnings.push(`timeScale=${ctx.config.timeScale}: "o'ylash vaqti" qisqartirilgan (test rejimi), bu isbot EMAS`);
  const failed = checks.filter((c) => !c.ok).length;
  const verdict = failed ? 'FAIL' : warnings.length ? 'INCONCLUSIVE' : 'PASS';
  return { verdict, checks, warnings };
}

export function toMarkdown(r) {
  const m = r.meta;
  const L = [];
  L.push(`# Yuk testi hisoboti: ${m.profile}${m.label ? ` (${m.label})` : ''}`, '');
  L.push(`**Natija: ${r.slo.verdict}**${m.remote ? '' : ' (lokal muhit: D1 isboti sifatida qabul QILINMAYDI, TZ §7)'}`, '');
  L.push('## Sharoit', '', '| | |', '|---|---|',
    `| Sana | ${m.date} |`, `| Manzil | ${m.base} ${m.remote ? '(masofaviy)' : '(lokal/ichki)'} |`, `| Stek (qo'lda yozilgan) | ${m.stack || 'ko\'rsatilmagan'} |`,
    `| Commit | ${m.gitSha} |`, `| Generator mashinasi | ${m.cpus} yadro, ${m.memGB} GB RAM, Node ${m.node} |`,
    `| Yuklama (load avg) boshida → oxirida | ${(m.loadavgStart ?? []).join(' ')} → ${m.loadavgEnd.join(' ')} |`,
    `| Davomiylik | ${m.actualSec} s (reja ${m.durationSec} s), timeScale ${m.timeScale}, seed ${m.seed} |`, `| Izoh | ${m.notes || '-'} |`, '');
  if (!m.remote) L.push('> **Cheklov:** generator va server bir mashinada bo\'lishi mumkin (CPU talashadi), natijalar past baholanadi. Haqiqiy raqam faqat alohida VPS\'da (ROADMAP S2).', '');
  L.push('## Umumiy', '', `So'rovlar: ${r.totals.requests} · ${fmt(r.totals.rps, 1)} req/s · xato: ${r.totals.errors} (${(r.totals.errorRate * 100).toFixed(3)}%) · qayta urinilgan GET: ${r.totals.retried}`, '',
    `Javob vaqti (ms): p50 ${fmt(r.totals.p50)} · p95 ${fmt(r.totals.p95)} · p99 ${fmt(r.totals.p99)} · max ${fmt(r.totals.max)}`, '');
  if (r.totals.orders.created || r.totals.orders.failures) L.push(`Buyurtmalar: ${r.totals.orders.created} yaratildi, ${r.totals.orders.failures} xato, ${r.totals.orders.duplicates} takroriy raqam`, '');
  L.push('## Qadamlar', '', '| Qadam | So\'rov | req/s | xato | p50 | p95 | p99 | max | holatlar |', '|---|---:|---:|---:|---:|---:|---:|---:|---|');
  for (const [name, s] of Object.entries(r.steps)) {
    L.push(`| ${name} | ${s.count} | ${fmt(s.rps, 1)} | ${s.errors} | ${fmt(s.p50)} | ${fmt(s.p95)} | ${fmt(s.p99)} | ${fmt(s.max)} | ${Object.entries(s.status).map(([k, v]) => `${k}:${v}`).join(' ')} |`);
  }
  L.push('');
  if (r.trend) L.push(`Barqarorlik: p95 birinchi uchdan birida ${fmt(r.trend.firstThirdP95)} ms, oxirgisida ${fmt(r.trend.lastThirdP95)} ms ${r.trend.lastThirdP95 > r.trend.firstThirdP95 * 1.5 ? '(**yomonlashgan**)' : '(barqaror)'}`, '');
  if (r.slo.checks.length) {
    L.push('## SLO tekshiruvi', '', '| Mezon | Natija | Qiymat |', '|---|---|---|');
    for (const c of r.slo.checks) L.push(`| ${c.name} | ${c.ok ? 'PASS' : '**FAIL**'} | ${c.value} |`);
    L.push('');
  }
  if (r.slo.warnings.length || r.notes.length) {
    L.push('## Ogohlantirish va izohlar', '');
    for (const w of [...r.slo.warnings, ...r.notes]) L.push(`- ${w}`);
    L.push('');
  }
  return L.join('\n');
}

export function writeReport(r, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = r.meta.date.slice(0, 10);
  const base = `${stamp}_${r.meta.profile}${r.meta.label ? `_${r.meta.label}` : ''}`.replace(/[^\w.-]+/g, '_');
  const jsonPath = path.join(outDir, `${base}.json`);
  const mdPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(r, null, 2));
  fs.writeFileSync(mdPath, toMarkdown(r));
  return { jsonPath, mdPath };
}
