/* Tema: auto (tizim) → light → dark */
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('armenu_theme'); } catch (e) {}
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
  syncThemeIcon();
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const next = cur ? (cur === 'dark' ? 'light' : 'dark') : (sysDark ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('armenu_theme', next); } catch (e) {}
  syncThemeIcon();
}

function syncThemeIcon() {
  const btn = document.getElementById('btnTheme');
  if (!btn) return;
  const cur = document.documentElement.getAttribute('data-theme');
  const dark = cur ? cur === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  btn.textContent = dark ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0F0F13' : '#E85D2A';
}