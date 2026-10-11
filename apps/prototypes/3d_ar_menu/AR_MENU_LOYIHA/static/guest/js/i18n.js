/* ARMENU i18n — 3 til, localStorage kesh, {n} o'rinbosarlar */
let TRANSLATIONS = {};
let CURRENT_LANG = 'uz';
const I18N_VERSION = (window.ARMENU && window.ARMENU.i18nVersion) || 1;
const SUPPORTED_LANGS = ['uz', 'ru', 'en'];

async function loadI18n(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = 'uz';
  CURRENT_LANG = lang;

  const key = `i18n_${lang}_v${I18N_VERSION}`;
  try {
    const cached = localStorage.getItem(key);
    if (cached) { TRANSLATIONS = JSON.parse(cached); return TRANSLATIONS; }
  } catch (e) { /* private rejim — keshsiz davom etamiz */ }

  const r = await fetch(`/static/i18n/${lang}.json?v=${I18N_VERSION}`);
  if (!r.ok) throw new Error(`i18n ${lang} yuklanmadi`);
  TRANSLATIONS = await r.json();
  try { localStorage.setItem(key, JSON.stringify(TRANSLATIONS)); } catch (e) {}
  return TRANSLATIONS;
}

/**
 * t('cart.empty')             → "Savat bo'sh"
 * t('order.eta', {n: 18})     → "Taxminan 18 daqiqa qoldi"
 */
function t(key, params = {}) {
  const val = key.split('.').reduce((o, k) => (o ? o[k] : undefined), TRANSLATIONS);
  if (val === undefined) { console.warn(`[i18n] yo'q: ${key}`); return key; }
  return String(val).replace(/\{(\w+)\}/g, (_, p) => (p in params ? params[p] : `{${p}}`));
}

/** Sahifadagi barcha data-i18n* elementlarini tarjima qiladi */
function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-tpl]').forEach(el => {
    el.textContent = t(el.dataset.i18nTpl, { n: el.dataset.i18nN || '' });
  });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', t(el.dataset.i18nTitle));
  });
  document.documentElement.lang = CURRENT_LANG;
}

/** Summani formatlash: 173800 → "173 800 so'm" */
function fmtMoney(v) {
  const n = Math.round(Number(v) || 0);
  return n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + t('common.sum');
}

/** Til almashtirish — sahifa qayta yuklanmaydi */
async function switchLang(lang) {
  await loadI18n(lang);
  applyI18n();
  document.cookie = `armenu_lang=${lang};path=/;max-age=31536000;samesite=Lax`;
  window.ARMENU.lang = lang;
  const el = document.getElementById('langCode');
  if (el) el.textContent = lang.toUpperCase();
  if (typeof reloadMenuContent === 'function') await reloadMenuContent(lang);
  fetch('/v1/lang/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang, session_id: window.ARMENU.sessionId })
  }).catch(() => {});
}