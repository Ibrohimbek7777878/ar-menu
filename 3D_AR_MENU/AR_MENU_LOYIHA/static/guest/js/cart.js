/* Savat — localStorage'da, sessiyaga bog'langan */
let cart = [];

function cartKey() { return `cart_${window.ARMENU.slug}_${window.ARMENU.sessionId}`; }

function saveCart() {
  try { localStorage.setItem(cartKey(), JSON.stringify(cart)); } catch (e) {}
  updateCartBar();
}

function restoreCart() {
  try {
    const raw = localStorage.getItem(cartKey());
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) { cart = []; }
  // ⚡ menyudan yo'qolgan yoki tugagan taomlarni tozalaymiz
  cart = cart.filter(i => {
    const d = getDish(i.dish_id);
    return d && d.is_available;
  }).map(i => ({ ...i, qty: Math.max(1, Math.ceil(i.qty)) }));
  saveCart();
}

function sameLine(a, b) {
  return a.dish_id === b.dish_id
    && a.note === b.note
    && JSON.stringify([...a.modifiers].sort()) === JSON.stringify([...b.modifiers].sort());
}

function addToCart(item) {
  if (navigator.vibrate) {
    try { navigator.vibrate(35); } catch (e) {}
  }
  item.qty = Math.max(1, Math.min(99, Math.ceil(item.qty || 1)));
  const found = cart.find(i => sameLine(i, item));
  if (found) found.qty = Math.min(99, Math.ceil(found.qty + item.qty));
  else cart.push(item);
  saveCart();
  toast(t('dish.added'), 'success');
  checkUpsell(getDish(item.dish_id));
}

function updateQty(idx, delta) {
  const i = cart[idx];
  if (!i) return;
  const q = Math.ceil(i.qty + delta);
  if (q <= 0) { removeItem(idx); return; }
  i.qty = Math.min(99, q);
  saveCart();
  renderCart();
}

function removeItem(idx) {
  if (!confirm(t('cart.remove_confirm'))) return;
  cart.splice(idx, 1);
  saveCart();
  renderCart();
}

function clearCart() { cart = []; saveCart(); }

function lineTotal(i) {
  const d = getDish(i.dish_id);
  if (!d) return 0;
  const delta = (d.modifiers || [])
    .filter(m => i.modifiers.includes(m.id))
    .reduce((s, m) => s + Number(m.price_delta || 0), 0);
  return (Number(d.price) + delta) * Math.ceil(i.qty);
}

function cartTotals() {
  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const pct = Number(window.ARMENU.serviceFeePct || 0);
  const fee = Math.round(subtotal * pct / 100);
  return { subtotal, fee, pct, total: subtotal + fee,
           count: cart.reduce((s, i) => s + Math.ceil(i.qty), 0) };
}

function updateCartBar() {
  const { count, total } = cartTotals();
  const btn = document.getElementById('btnCart');
  if (!btn) return;
  btn.hidden = count === 0;
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = fmtMoney(total);
}

/* Savatga qo'shilgandan keyin — qo'shimcha taklif (A-02 da sozlanadi) */
const shownUpsells = new Set();

function checkUpsell(addedDish) {
  if (!addedDish) return;
  const rules = MENU_DATA.upsell_rules || [];

  const rule = rules.find(r =>
    (r.trigger_dish_ids || []).includes(addedDish.id)
    && !shownUpsells.has(r.id)
    && !cart.some(i => i.dish_id === r.suggest_dish_id));
  if (!rule) return;

  const suggest = getDish(rule.suggest_dish_id);
  if (!suggest || !suggest.is_available) return;

  shownUpsells.add(rule.id);
  trackUpsell(rule.id, 'shown');

  showUpsellToast({
    text: rule[`text_${window.ARMENU.lang}`] || rule.text_uz || t('cart.cross_sell'),
    dish: suggest,
    onAccept: () => {
      addToCart({ dish_id: suggest.id, qty: 1, modifiers: [], note: '' });
      trackUpsell(rule.id, 'accepted');
    },
    onDismiss: () => trackUpsell(rule.id, 'dismissed')
  });
}

function showUpsellToast({ text, dish, onAccept, onDismiss }) {
  const el = document.createElement('div');
  el.className = 'toast toast--upsell';
  el.innerHTML = `
    <img class="toast__img" src="${dish.image || '/static/guest/img/dish-placeholder.svg'}" alt="" width="44" height="44"
         onerror="this.onerror=null;this.src='/static/guest/img/dish-placeholder.svg';">
    <div class="toast__body">
      <div class="toast__text">${esc(text)}</div>
      <div class="toast__sub">${esc(dish.name)} · ${fmtMoney(dish.price)}</div>
    </div>
    <button class="btn btn--sm btn--primary" data-act="ok">+</button>
    <button class="icon-btn" data-act="no" aria-label="${t('common.close')}">✕</button>`;

  el.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'ok') onAccept(); else onDismiss();
    el.remove();
  });

  document.getElementById('toastRoot').appendChild(el);
  setTimeout(() => { if (el.isConnected) { onDismiss(); el.remove(); } }, 9000);
}

function trackUpsell(ruleId, action) {
  if (action === 'accept') {
    fetch('/v1/menu/upsell/accept/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule_id: ruleId })
    }).catch(() => {});
  }
}

window.getCart = function() { return cart; };
window.clearCart = clearCart;