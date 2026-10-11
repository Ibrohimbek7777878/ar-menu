/* M-02 — menyu sahifasi */
let MENU_DATA = { categories: [], dishes: [], upsell_rules: [] };
let VIEW = { category: null, diets: [], query: '', arOnly: false };
const VIRTUAL_THRESHOLD = 100;      // 100+ taomda virtual scroll

async function initMenu() {
  await loadI18n(window.ARMENU.lang);
  applyI18n();
  initTheme();

  try {
    MENU_DATA = await fetchMenu(window.ARMENU.lang);
  } catch (e) {
    toast(t('errors.server'), 'error');
    return;
  }

  renderCategories();
  renderDiets();
  renderDishes(visibleDishes());
  restoreCart();
  updateCartBar();
  connectWS();
  initLazyImages();
  bindUI();
  document.getElementById('skeleton')?.remove();
}

async function fetchMenu(lang) {
  const url = `/v1/menu/${window.ARMENU.slug}/?lang=${lang}`;
  const cacheKey = `menu_${window.ARMENU.slug}_${lang}`;
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
    return data;
  } catch (e) {
    // ⛔ Offline — 24 soatgacha eski keshdan ko'rsatamiz
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < 24 * 3600 * 1000) {
        toast(t('errors.network'), 'info');
        return data;
      }
    }
    throw e;
  }
}

async function reloadMenuContent(lang) {
  MENU_DATA = await fetchMenu(lang);
  renderCategories();
  renderDiets();
  renderDishes(visibleDishes());
}

/* --- Filtr --- */

function visibleDishes() {
  const q = VIEW.query.trim().toLowerCase();
  return MENU_DATA.dishes.filter(d => {
    if (VIEW.arOnly && !d.has_ar) return false;
    if (VIEW.category && d.category_id !== VIEW.category) return false;
    if (VIEW.diets.length && !VIEW.diets.every(tag => (d.diet_tags || []).includes(tag)))
      return false;
    if (q && !(`${d.name} ${d.desc || ''}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

/* --- Render --- */

function renderCategories() {
  const box = document.getElementById('cats');
  const all = `<button class="cat ${VIEW.category === null ? 'is-on' : ''}"
      data-cat="">${t('menu.category_all')}</button>`;
  box.innerHTML = all + MENU_DATA.categories.map(c =>
    `<button class="cat ${VIEW.category === c.id ? 'is-on' : ''}"
       data-cat="${c.id}">${esc(c.name)}</button>`).join('');
}

function renderDiets() {
  const tags = ['halal', 'vegetarian', 'vegan', 'no_spicy', 'gluten_free'];
  document.getElementById('diets').innerHTML = tags.map(tag =>
    `<button class="chip ${VIEW.diets.includes(tag) ? 'is-on' : ''}"
       data-diet="${tag}">${t('diet.' + tag)}</button>`).join('');
}

function dishCardHTML(d) {
  const badge = d.is_hit ? `<span class="badge badge--hit">${t('menu.hit')}</span>`
              : d.is_new ? `<span class="badge badge--new">${t('menu.new')}</span>` : '';
  const out = !d.is_available
    ? `<span class="badge badge--out">${t('menu.sold_out')}</span>` : '';
  const ar = d.has_ar
    ? `<button class="dish__ar badge--ar" data-ar="${d.id}"
         aria-label="${t('dish.view_ar', '3D / AR')}">✨ 3D / AR</button>` : '';
  return `
  <article class="dish ${d.is_available ? '' : 'dish--out'}" data-dish="${d.id}">
    <div class="dish__media">
      <img class="dish__img" data-src="${d.image || '/static/guest/img/dish-placeholder.svg'}"
           src="/static/guest/img/dish-placeholder.svg" alt="${esc(d.name)}"
           loading="lazy" width="120" height="120"
           onerror="this.onerror=null;this.src='/static/guest/img/dish-placeholder.svg';">
      ${ar}
    </div>
    <div class="dish__body">
      <div class="dish__title">${esc(d.name)} ${badge} ${out}</div>
      <div class="dish__desc">${esc((d.desc || '').slice(0, 70))}</div>
      <div class="dish__meta">
        ${d.cook_min ? `⏱ ${t('menu.cook_time', { n: d.cook_min })}` : ''}
        ${d.weight ? ` · ⚖️ ${t('menu.weight', { n: d.weight })}` : ''}
      </div>
      <div class="dish__foot">
        <span class="dish__price">${fmtMoney(d.price)}</span>
        <button class="btn btn--sm btn--primary" data-add="${d.id}"
                ${d.is_available ? '' : 'disabled'}>+ ${t('cart.title')}</button>
      </div>
    </div>
  </article>`;
}

function renderDishes(list) {
  const box = document.getElementById('dishList');
  const empty = document.getElementById('emptyState');
  if (empty) empty.hidden = list.length > 0;

  if (list.length === 0) {
    const isSearch = Boolean(VIEW.query && VIEW.query.trim());
    box.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">${isSearch ? '🔍' : '🍽'}</div>
        <div class="empty-state__title">${isSearch ? t('menu.search_empty_title', 'Taom topilmadi') : t('menu.empty_title', 'Menyu bo\'sh')}</div>
        <div class="empty-state__desc">${isSearch ? t('menu.search_empty_desc', 'Boshqa so\'z bilan qidirib ko\'ring') : ''}</div>
      </div>`;
    return;
  }

  if (list.length > VIRTUAL_THRESHOLD) { renderVirtual(box, list); return; }
  box.innerHTML = list.map(dishCardHTML).join('');
  initLazyImages();
}

/* ⚡ Virtual scroll — 100+ taomda faqat ko'rinadigan qism DOM'da */
function renderVirtual(box, list) {
  const ROW_H = 132;
  const BUFFER = 6;
  box.innerHTML = `<div class="vscroll" style="height:${list.length * ROW_H}px">
                     <div class="vscroll__win" id="vwin"></div></div>`;
  const win = document.getElementById('vwin');

  function draw() {
    const top = Math.max(0, window.scrollY - box.offsetTop);
    const first = Math.max(0, Math.floor(top / ROW_H) - BUFFER);
    const count = Math.ceil(window.innerHeight / ROW_H) + BUFFER * 2;
    const slice = list.slice(first, first + count);
    win.style.transform = `translateY(${first * ROW_H}px)`;
    win.innerHTML = slice.map(dishCardHTML).join('');
    initLazyImages();
  }
  draw();
  box._vdraw = draw;
  window.removeEventListener('scroll', box._vbound || (() => {}));
  box._vbound = () => requestAnimationFrame(draw);
  window.addEventListener('scroll', box._vbound, { passive: true });
}

function getDish(id) { return MENU_DATA.dishes.find(d => d.id === Number(id)); }

function esc(s) {
  return String(s || '').replace(/[&<>"']/g,
    m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', initMenu);

function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Lokal qidiruv (tez). 2+ belgida serverdan ham so'raladi. */
const searchDishes = debounce(async (q) => {
  VIEW.query = q;
  renderDishes(visibleDishes());

  if (q.trim().length < 2) return;
  try {
    const r = await fetch(
      `/v1/menu/${window.ARMENU.slug}/search/?q=${encodeURIComponent(q)}&lang=${window.ARMENU.lang}`);
    if (!r.ok) return;
    const { dishes } = await r.json();
    if (VIEW.query !== q) return;              // eskirgan javob — tashlab yuboramiz
    const known = new Set(MENU_DATA.dishes.map(d => d.id));
    dishes.forEach(d => { if (!known.has(d.id)) MENU_DATA.dishes.push(d); });
    renderDishes(visibleDishes());
  } catch (e) { /* offline — lokal natija yetarli */ }
}, 300);

function filterCategory(id) {
  VIEW.category = id ? Number(id) : null;
  renderCategories();
  renderDishes(visibleDishes());
  history.replaceState(null, '', id ? `#cat-${id}` : location.pathname + location.search);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleDiet(tag) {
  const i = VIEW.diets.indexOf(tag);
  if (i >= 0) VIEW.diets.splice(i, 1); else VIEW.diets.push(tag);
  renderDiets();
  renderDishes(visibleDishes());
}

function bindUI() {
  document.getElementById('searchInput')
    .addEventListener('input', e => searchDishes(e.target.value));

  document.getElementById('cats').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) filterCategory(b.dataset.cat);
  });

  document.getElementById('diets').addEventListener('click', e => {
    const b = e.target.closest('[data-diet]');
    if (b) toggleDiet(b.dataset.diet);
  });

  document.getElementById('dishList').addEventListener('click', e => {
    const ar = e.target.closest('[data-ar]');
    if (ar) {
      e.stopPropagation();
      const dishId = Number(ar.dataset.ar);
      const d = getDish(dishId);
      openAR(dishId, d ? {name: d.name, price: d.price, image: d.image_lg || d.image || '', desc: d.desc} : null);
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) { e.stopPropagation(); quickAdd(Number(add.dataset.add), add); return; }
    const card = e.target.closest('[data-dish]');
    if (card) {
      const dishId = Number(card.dataset.dish);
      const d = getDish(dishId);
      if (d && d.has_ar) {
        openAR(dishId, {name: d.name, price: d.price, image: d.image_lg || d.image || '', desc: d.desc});
        return;
      }
      openDish(dishId);
    }
  });

  document.getElementById('btnTheme').addEventListener('click', toggleTheme);
  document.getElementById('btnCart').addEventListener('click', openCart);
  document.getElementById('btnCall').addEventListener('click', openCallMenu);
  document.getElementById('btnLang').addEventListener('click', openLangMenu);

  const btnAR = document.getElementById('btnFilterAR');
  if (btnAR) {
    btnAR.addEventListener('click', () => {
      VIEW.arOnly = !VIEW.arOnly;
      btnAR.classList.toggle('is-active', VIEW.arOnly);
      btnAR.textContent = VIEW.arOnly ? "✓ Barcha Taomlar" : "✨ 3D Taomlar";
      renderDishes(visibleDishes());
    });
  }

  const btnChat = document.getElementById('btnChat');
  if (btnChat) {
    btnChat.addEventListener('click', () => {
      if (typeof window.openAIChat === 'function') window.openAIChat();
    });
  }
}

function openLangMenu() {
  const langs = [['uz', "O'zbek"], ['ru', 'Русский'], ['en', 'English']];
  openSheet(`<h3>🌐</h3><div class="langs">${langs.map(([c, n]) =>
    `<button class="btn btn--ghost btn--block" data-lang="${c}">${n}</button>`).join('')}</div>`,
    sheet => sheet.addEventListener('click', e => {
      const b = e.target.closest('[data-lang]');
      if (b) { switchLang(b.dataset.lang); closeSheet(); }
    }));
}

// Global exports
window.getDish = getDish;
window.MENU_DATA = MENU_DATA;