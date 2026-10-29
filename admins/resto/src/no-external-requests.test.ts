/**
 * Yangi panel (/ra/) tashqi domenlarga (Google Fonts, CDN) so'rov yubormasligini kafolatlaydi.
 * Brauzerda o'lchangan (2026-10-29): /ra/* sahifalarida tashqi so'rov = 0. Bu test shu holat
 * tasodifan buzilmasligi uchun (masalan, shablonga Google Fonts <link> qaytib qolsa).
 *
 * Diqqat: Playfair Display / Plus Jakarta Sans Google Fonts so'rovlari yangi paneldan emas,
 * eski login.html va restaurant_admin/dashboard.html shablonlaridan keladi (bu faylning qamroviga kirmaydi).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const resto = path.resolve(here, '..');
const backend = path.resolve(resto, '../../backend');

const EXTERNAL = /(?:https?:)?\/\/(?!127\.0\.0\.1|localhost)[a-z0-9.-]+\.[a-z]{2,}/i;
const GOOGLE_FONTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/i;

function stripXmlNamespaces(html: string): string {
  return html.replace(/xmlns(:\w+)?="[^"]*"/g, '');
}

test('Vite kirish HTML (admins/resto/index.html) tashqi domenga havola qilmaydi', () => {
  const html = stripXmlNamespaces(fs.readFileSync(path.join(resto, 'index.html'), 'utf8'));
  assert.doesNotMatch(html, EXTERNAL);
  assert.doesNotMatch(html, GOOGLE_FONTS);
});

test('Django shabloni (admins/resto.html) tashqi domen va Google Fonts\'siz', () => {
  const html = stripXmlNamespaces(fs.readFileSync(path.join(backend, 'templates/admins/resto.html'), 'utf8'));
  assert.doesNotMatch(html, EXTERNAL);
  assert.doesNotMatch(html, GOOGLE_FONTS);
  assert.doesNotMatch(html, /preconnect/i);
});

test('favicon havolasi mavjud faylga ishora qiladi (404 bo\'lmaydi)', () => {
  const html = fs.readFileSync(path.join(backend, 'templates/admins/resto.html'), 'utf8');
  const m = html.match(/rel="icon"[^>]*href="\{% get_static_prefix %\}([^"]+)"/);
  assert.ok(m, 'shablonda favicon havolasi topilmadi');
  // /static/ prefiksi backend/static katalogiga to'g'ri keladi (STATICFILES_DIRS)
  assert.ok(fs.existsSync(path.join(backend, 'static', m[1])), `fayl yo'q: backend/static/${m[1]} (npm run build kerak)`);
  assert.ok(fs.existsSync(path.join(resto, 'public', 'favicon.svg')), 'admins/resto/public/favicon.svg yo\'q');
});

test('build qilingan CSS tashqi shrift/domenga havola qilmaydi', { skip: !fs.existsSync(path.join(backend, 'static/admins/resto/assets')) }, () => {
  const dir = path.join(backend, 'static/admins/resto/assets');
  const cssFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.css'));
  assert.ok(cssFiles.length > 0, 'build CSS topilmadi');
  for (const f of cssFiles) {
    const css = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.doesNotMatch(css, GOOGLE_FONTS, f);
    assert.doesNotMatch(css, /@import\s+url\(\s*['"]?https?:/i, f);
  }
});
