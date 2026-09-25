/* M-04 — taom kartochkasi (bottom-sheet modal) */
let DISH_STATE = { dish: null, qty: 1, mods: new Set(), note: '' };

async function openDish(dishId) {
  let d = getDish(dishId);
  if (!d || !d.modifiers) {
    const r = await fetch(`/v1/dish/${dishId}/?lang=${window.ARMENU.lang}`);
    if (!r.ok) { toast(t('errors.server'), 'error'); return; }
    d = await r.json();
    const i = MENU_DATA.dishes.findIndex(x => x.id === dishId);
    if (i >= 0) MENU_DATA.dishes[i] = d; else MENU_DATA.dishes.push(d);
  }

  DISH_STATE = {
    dish: d, qty: 1, note: '',
    mods: new Set((d.modifiers || []).filter(m => m.is_default).map(m => m.id))
  };
  openSheet(dishModalHTML(d), bindDishModal);
}

function dishModalHTML(d) {
  const mods = (d.modifiers || []).map(m => `
    <label class="mod">
      <input type="checkbox" data-mod="${m.id}"
             ${DISH_STATE.mods.has(m.id) ? 'checked' : ''}>
      <span class="mod__name">${esc(m.name)}</span>
      <span class="mod__price">${m.price_delta > 0 ? '+' + fmtMoney(m.price_delta) : ''}</span>
    </label>`).join('');

  const allergens = (d.allergens || []).length
    ? (d.allergens).map(a => t('allergen.' + a)).join(', ')
    : t('dish.no_allergens');

  return `
  <div class="dishmodal">
    <div class="dishmodal__media" style="position:relative;">
      <img src="${d.image_lg || d.image || '/static/guest/img/dish-placeholder.svg'}" alt="${esc(d.name)}"
           onerror="this.onerror=null;this.src='/static/guest/img/dish-placeholder.svg';">
      ${d.has_ar ? `<button class="btn btn--ar" id="dmAR" style="position:absolute; bottom:10px; right:10px; background:linear-gradient(135deg, #10B981, #059669); color:#FFF; font-weight:800; border-radius:999px; padding:8px 16px; border:none; box-shadow:0 4px 14px rgba(16,185,129,0.5); cursor:pointer; font-size:12px; z-index:5;">✨ 3D / AR Stolga Qo'yish</button>` : ''}
    </div>
    <h2 class="dishmodal__title">${esc(d.name)}</h2>
    ${d.rating ? `<div class="dishmodal__rating">⭐ ${t('dish.rating',
        { n: d.rating, cnt: d.rating_count || 0 })}</div>` : ''}
    ${d.has_ar ? `
      <div style="margin:8px 0; padding:10px 14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.25); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:13px; font-weight:800; color:#059669;">✨ 3D Augmented Reality</div>
          <div style="font-size:11px; color:var(--text-soft); margin-top:2px;">Taomni 360° aylantiring yoki kamerada stolda ko'ring</div>
        </div>
        <button class="btn btn--sm" id="dmARInline" style="background:#10B981; color:#fff; font-weight:800; border-radius:8px; padding:6px 12px; border:none; cursor:pointer;">Ko'rish ↗</button>
      </div>` : ''}
    <p class="dishmodal__desc">${esc(d.desc || '')}</p>
    <div class="dishmodal__meta">
      ${d.cook_min ? `⏱ ${t('menu.cook_time', { n: d.cook_min })}` : ''}
      ${d.weight ? ` · ⚖️ ${t('menu.weight', { n: d.weight })}` : ''}
      ${d.calories ? ` · ${t('menu.calories', { n: d.calories })}` : ''}
    </div>
    <div class="dishmodal__diets">${(d.diet_tags || [])
        .map(tag => `<span class="chip chip--sm">${t('diet.' + tag)}</span>`).join('')}</div>
    <div class="dishmodal__row"><b>${t('dish.allergens')}:</b> ${esc(allergens)}</div>
    ${d.ingredients ? `<div class="dishmodal__row"><b>${t('dish.ingredients')}:</b>
        ${esc(d.ingredients)}</div>` : ''}
    ${mods ? `<div class="dishmodal__mods"><b>${t('dish.modifiers')}</b>${mods}</div>` : ''}
    ${(d.upsell || []).length ? `<div class="dishmodal__upsells">${(d.upsell).map(u => `
      <div class="dishmodal__upsell" style="margin: 10px 0; padding: 10px 14px; background: rgba(232,93,42,0.08); border: 1px solid rgba(232,93,42,0.2); border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: #E85D2A;">💡 ${esc(u.text || 'Tavsiya')}</div>
          <div style="font-size: 14px; font-weight: 600;">${esc(u.dish.name)} · ${fmtMoney(u.dish.price)}</div>
        </div>
        <button class="btn btn--sm btn--primary" data-upsell-add="${u.dish.id}" data-rule-id="${u.rule_id}">+</button>
      </div>`).join('')}</div>` : ''}
    <input class="input" id="dmNote" maxlength="200" data-i18n-ph="dish.note_placeholder">
    <div class="dishmodal__foot">
      <div class="stepper">
        <button class="stepper__btn" data-qty="-1" aria-label="-">−</button>
        <span class="stepper__val" id="dmQty">1</span>
        <button class="stepper__btn" data-qty="1" aria-label="+">+</button>
      </div>
      <span class="dishmodal__price" id="dmPrice">${fmtMoney(d.price)}</span>
    </div>
    <button class="btn btn--primary btn--block" id="dmAdd"
            ${d.is_available ? '' : 'disabled'}>🛒 ${t('dish.add_to_cart')}</button>
  </div>`;
}

function dishLinePrice() {
  const d = DISH_STATE.dish;
  const delta = (d.modifiers || [])
    .filter(m => DISH_STATE.mods.has(m.id))
    .reduce((s, m) => s + Number(m.price_delta || 0), 0);
  return (Number(d.price) + delta) * DISH_STATE.qty;
}

function bindDishModal(root) {
  applyI18n(root);

  root.addEventListener('change', e => {
    const m = e.target.closest('[data-mod]');
    if (!m) return;
    const id = Number(m.dataset.mod);
    if (m.checked) DISH_STATE.mods.add(id); else DISH_STATE.mods.delete(id);
    root.querySelector('#dmPrice').textContent = fmtMoney(dishLinePrice());
  });

  root.addEventListener('click', e => {
    const q = e.target.closest('[data-qty]');
    if (q) {
      // ⚡ miqdor DOIM butun son
      DISH_STATE.qty = Math.max(1, Math.min(99,
        Math.ceil(DISH_STATE.qty + Number(q.dataset.qty))));
      root.querySelector('#dmQty').textContent = DISH_STATE.qty;
      root.querySelector('#dmPrice').textContent = fmtMoney(dishLinePrice());
      return;
    }
    if (e.target.closest('#dmAR') || e.target.closest('#dmARInline')) {
      const d = DISH_STATE.dish;
      closeSheet(); // ⚡ Ichkima-ichki modal bo'lmasligi uchun avval pastki sheet yopiladi
      openAR(d.id, {name: d.name, price: d.price, image: d.image_lg || d.image || '', desc: d.desc});
      return;
    }
    const upAdd = e.target.closest('[data-upsell-add]');
    if (upAdd) {
      const dishId = Number(upAdd.dataset.upsellAdd);
      const ruleId = Number(upAdd.dataset.ruleId);
      quickAdd(dishId);
      if (typeof trackUpsell === 'function') trackUpsell(ruleId, 'accept');
      upAdd.textContent = '✓';
      upAdd.disabled = true;
      return;
    }
    if (e.target.closest('#dmAdd')) {
      const addBtn = e.target.closest('#dmAdd');
      DISH_STATE.note = (root.querySelector('#dmNote').value || '').slice(0, 200);
      addToCart({
        dish_id: DISH_STATE.dish.id,
        qty: Math.ceil(DISH_STATE.qty),
        modifiers: [...DISH_STATE.mods],
        note: DISH_STATE.note
      });
      animateFlyToCart(addBtn);
      closeSheet();
    }
  });
}

function animateFlyToCart(sourceEl) {
  if (navigator.vibrate) {
    try { navigator.vibrate(35); } catch (e) {}
  }
  if (!sourceEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cartBtn = document.getElementById('btnCart') || document.querySelector('.bottombar');
  if (!cartBtn) return;
  const srcRect = sourceEl.getBoundingClientRect();
  const destRect = cartBtn.getBoundingClientRect();

  // ⚡ 2 o'qli parabolik uchish (X silliq, Y sakrab tushish)
  const outer = document.createElement('div');
  outer.style.cssText = `
    position: fixed;
    z-index: 9999;
    left: ${srcRect.left + srcRect.width / 2 - 14}px;
    top: ${srcRect.top + srcRect.height / 2 - 14}px;
    pointer-events: none;
    transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.4, 1);
  `;

  const inner = document.createElement('div');
  inner.className = 'flying-badge';
  inner.textContent = '+1';
  inner.style.cssText = `
    position: static;
    transition: transform 0.5s cubic-bezier(0.5, -0.4, 0.8, 1), opacity 0.48s ease;
  `;

  outer.appendChild(inner);
  document.body.appendChild(outer);

  const deltaX = (destRect.left + destRect.width / 2) - (srcRect.left + srcRect.width / 2);
  const deltaY = (destRect.top + destRect.height / 2) - (srcRect.top + srcRect.height / 2);

  requestAnimationFrame(() => {
    outer.style.transform = `translateX(${deltaX}px)`;
    inner.style.transform = `translateY(${deltaY}px) scale(0.35)`;
    inner.style.opacity = '0.1';
  });

  setTimeout(() => {
    outer.remove();
    cartBtn.classList.remove('cart-bounce');
    void cartBtn.offsetWidth;
    cartBtn.classList.add('cart-bounce');
  }, 500);
}

/** Ro'yxatdagi "+ Savat" — modifikatorsiz, 1 dona */
function quickAdd(dishId, sourceEl) {
  const d = getDish(dishId);
  if (!d || !d.is_available) { toast(t('errors.dish_unavailable'), 'error'); return; }
  addToCart({ dish_id: d.id, qty: 1, modifiers: [], note: '' });
  animateFlyToCart(sourceEl);
}

// Global exports
window.openDish = openDish;
window.quickAdd = quickAdd;
window.animateFlyToCart = animateFlyToCart;