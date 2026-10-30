#!/usr/bin/env node
// Yuk testi ishga tushirgichi. Foydalanish: node run.mjs <profil> [--base URL] [--duration S] [--users N] ... (README ga qarang)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { Client, Recorder } from './lib/client.mjs';
import { createContext } from './lib/context.mjs';
import { assertSafeTarget } from './lib/guard.mjs';
import { buildReport, toMarkdown, writeReport } from './lib/report.mjs';
import { summarize } from './lib/stats.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out[k] = v;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
      else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

export function loadProfile(nameOrPath) {
  const file = nameOrPath.endsWith('.json') ? path.resolve(nameOrPath) : path.join(HERE, 'profiles', `${nameOrPath}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function applyOverrides(profile, args) {
  const p = structuredClone(profile);
  for (const sc of p.scenarios) {
    if (args.users && ['guest', 'burst', 'stress'].includes(sc.type)) sc.users = Number(args.users);
    if (args.paths && sc.type === 'stress') sc.paths = String(args.paths).split(',');
    if (args.conditional && sc.type === 'stress') sc.conditional = true;
    if (args.rate && sc.type === 'orders') sc.ratePerMin = Number(args.rate);
    if (args.screens && sc.type === 'staff') sc.screens = Number(args.screens);
    if (args.assets && (sc.type === 'guest' || sc.type === 'burst')) sc.assets = String(args.assets).split(',');
    if (args.conditional && sc.type === 'staff') sc.conditional = true;
  }
  return p;
}

/** Profilni yurgizadi va hisobot obyektini qaytaradi (testlar ham shuni chaqiradi). */
export async function runProfile(profileIn, opts = {}) {
  const args = opts.args ?? {};
  const profile = applyOverrides(profileIn, args);
  const base = (args.base ?? opts.base ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
  const target = assertSafeTarget(base, { confirmTarget: String(args['confirm-target'] ?? '') });
  const durationSec = Number(args.duration ?? profile.durationSec ?? 60);
  const timeScale = Number(args['time-scale'] ?? 1);
  const seed = Number(args.seed ?? 42);
  const log = opts.log ?? ((m) => console.log(m));

  const recorder = new Recorder();
  const totalUsers = profile.scenarios.reduce((n, s) => n + (s.users ?? s.screens ?? 50), 0);
  const client = new Client({ base, recorder, maxSockets: totalUsers + 512, timeoutMs: Number(args.timeout ?? 15000) });
  const ctx = createContext({ client, recorder, durationSec, timeScale, seed });

  const health = await client.request('setup-health', 'GET', '/health/');
  if (health.status !== 200) throw new Error(`Server tayyor emas: ${base}/health/ ${health.status || health.err}`);

  const config = {
    base, durationSec, timeScale, seed, label: args.label, notes: args.notes, stack: args.stack,
    loadavgStart: os.loadavg().map((v) => +v.toFixed(2)),
  };
  log(`[loadtest] ${profile.name}: ${base}, ${durationSec} s, stsenariylar: ${profile.scenarios.map((s) => s.type).join(' + ')}`);

  const startedAt = recorder.now();
  const stopTimer = setTimeout(() => ctx.stop(), durationSec * 1000);
  let lastTick = recorder.samples.length;
  const ticker = opts.quiet ? null : setInterval(() => {
    const recent = recorder.samples.slice(lastTick).filter((s) => !s.step.startsWith('setup-'));
    lastTick = recorder.samples.length;
    const sm = summarize(recent.filter((s) => !s.err).map((s) => s.ms));
    const errs = recent.filter((s) => s.err || s.status >= 500).length;
    log(`[${Math.round((recorder.now() - startedAt) / 1000)}s] so'rov ${recent.length}/10s, p95 ${Number.isFinite(sm.p95) ? Math.round(sm.p95) : '-'} ms, xato ${errs}`);
  }, 10000);

  const scenarioResults = [];
  const runs = profile.scenarios.map(async (sc) => {
    const mod = await import(pathToFileURL(path.join(HERE, 'scenarios', `${sc.type}.mjs`)).href);
    const { type, ...params } = sc;
    try {
      scenarioResults.push({ type, ok: true, result: await mod.run(ctx, params) });
    } catch (e) {
      scenarioResults.push({ type, ok: false, error: e.message });
      ctx.shared.notes.push(`Stsenariy "${type}" to'xtadi: ${e.message}`);
    }
  });
  const all = Promise.allSettled(runs);
  // Davomiylik tugagach ucha turgan so'rovlarga 30 s imkon beramiz, keyin hisobotga o'tamiz
  let graceTimer;
  const grace = new Promise((r) => { graceTimer = setTimeout(() => r('grace'), durationSec * 1000 + 30000); });
  const outcome = await Promise.race([all, grace]);
  clearTimeout(graceTimer);
  if (outcome === 'grace') ctx.shared.notes.push('Ba\'zi so\'rovlar 30 s kutishdan keyin ham tugamadi (hisobotga kirmadi)');
  clearTimeout(stopTimer);
  if (ticker) clearInterval(ticker);
  ctx.stop();
  const actualSec = (recorder.now() - startedAt) / 1000;
  client.close();
  for (const [why, n] of ctx.shared.orderErrors ?? []) ctx.shared.notes.push(`Buyurtma xatosi: ${why} (×${n})`);

  const report = buildReport({ recorder, profile, config, shared: ctx.shared, scenarioResults, actualSec, repoDir: REPO, remote: target.remote });
  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args._[0]) {
    console.error('Foydalanish: node run.mjs <profil|fayl.json> [--base URL] [--duration S] [--users N] [--rate N] [--screens N] [--time-scale X] [--label T] [--stack T] [--notes T] [--out DIR] [--no-report] [--fail-on-slo]');
    process.exit(64);
  }
  const report = await runProfile(loadProfile(args._[0]), { args });
  console.log('\n' + toMarkdown(report));
  if (!args['no-report']) {
    const out = path.resolve(String(args.out ?? path.join(REPO, 'docs/01_PRODUCT_RESTAURANT_3D_AR/load_reports')));
    const { mdPath, jsonPath } = writeReport(report, out);
    console.log(`Hisobot yozildi:\n  ${mdPath}\n  ${jsonPath}`);
  }
  if (args['fail-on-slo'] && report.slo.verdict === 'FAIL') process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`[loadtest] XATO: ${e.message}`);
    process.exit(1);
  });
}
