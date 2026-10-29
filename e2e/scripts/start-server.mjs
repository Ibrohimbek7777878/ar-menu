#!/usr/bin/env node
/**
 * E2E uchun Django serverini ko'taradi (Playwright `webServer` shu skriptni ishga tushiradi).
 *
 * Har safar toza holatdan boshlaydi: vaqtinchalik SQLite fayl -> migrate -> seed_e2e -> runserver.
 * Haqiqiy baza (backend/db.sqlite3), .env va tashqi xizmatlar (Telegram, AI, Sentry, Redis) ishlatilmaydi.
 *
 * Muhit o'zgaruvchilari (hammasi ixtiyoriy):
 *   E2E_PORT     server porti (standart 8013)
 *   E2E_PYTHON   Python yo'li (standart: backend/venv/bin/python, bo'lmasa python3)
 *   E2E_WORKDIR  vaqtinchalik papka (standart: e2e/.tmp) — ichidagi hamma narsa har safar o'chirib qayta yaratiladi
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const e2eDir = path.resolve(import.meta.dirname, '..');
const repoDir = path.resolve(e2eDir, '..');
const backendDir = path.join(repoDir, 'backend');

const venvPython = path.join(backendDir, 'venv', 'bin', 'python');
const python = process.env.E2E_PYTHON || (fs.existsSync(venvPython) ? venvPython : 'python3');
const port = process.env.E2E_PORT || '8013';
const workDir = path.resolve(process.env.E2E_WORKDIR || path.join(e2eDir, '.tmp'));

// Himoya: faqat o'zimiz yaratadigan papkani tozalaymiz (tasodifan "/" yoki uy papkasini o'chirmaslik uchun)
if (path.basename(workDir) !== '.tmp' && !process.env.E2E_WORKDIR_FORCE) {
  console.error(`[e2e] E2E_WORKDIR nomi ".tmp" bilan tugashi shart (xavfsizlik): ${workDir}`);
  process.exit(1);
}
fs.rmSync(workDir, { recursive: true, force: true });
for (const sub of ['logs', 'cache', 'media']) fs.mkdirSync(path.join(workDir, sub), { recursive: true });
const dbPath = path.join(workDir, 'db.sqlite3');

const env = {
  ...process.env,
  PYTHONUNBUFFERED: '1',
  DJANGO_SKIP_DOTENV: '1',          // hech qachon backend/.env dan o'qima
  DEBUG: 'True',
  DJANGO_PRODUCT: 'restaurant',     // urls_restaurant (port 8001 bilan bir xil mahsulot)
  E2E_SEED_ALLOWED: '1',
  DATABASE_URL: `sqlite://${encodeURI(dbPath)}`,   // yo'l '/' bilan boshlanadi -> sqlite:///abs/yo'l (bo'shliqlar kodlanadi)
  LOG_DIR: path.join(workDir, 'logs'),
  CACHE_DIR: path.join(workDir, 'cache'),
  ALLOWED_HOSTS: '127.0.0.1,localhost',
  // Tashqi xizmatlar o'chirilgan: test hech qachon tarmoqqa chiqmasin
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_RESTAURANT_BOT_TOKEN: '',
  TELEGRAM_MARKET_BOT_TOKEN: '',
  TELEGRAM_STUDIO_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',
  TELEGRAM_ADMIN_CHAT_IDS: '',
  TELEGRAM_WEBHOOK_SECRET: '',
  AI_API_KEY: '',
  GROQ_API_KEY: '',
  OPENAI_API_KEY: '',
  SENTRY_DSN: '',
  REDIS_URL: '',
};

function manage(...args) {
  console.log(`[e2e] manage.py ${args.join(' ')}`);
  const res = spawnSync(python, ['manage.py', ...args], { cwd: backendDir, env, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`[e2e] manage.py ${args[0]} xato bilan tugadi (kod ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

manage('migrate', '--noinput', '--verbosity', '0');
manage('seed_e2e');

console.log(`[e2e] server: http://127.0.0.1:${port} (baza: ${dbPath})`);
const server = spawn(python, ['manage.py', 'runserver', '--noreload', `127.0.0.1:${port}`], {
  cwd: backendDir,
  env,
  stdio: 'inherit',
});

const stop = (signal) => {
  if (!server.killed) server.kill(signal);
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
server.on('exit', (code, signal) => process.exit(code ?? (signal ? 0 : 1)));
