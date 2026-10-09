/* M-06 — savat ekrani */
function openCart() {
  openSheet('<div id="cartBox"></div>', root => {
    renderCart();
    root.addEventListener('click', onCartClick);
  });
}

function renderCart() {
  const box = document.getElementById('cartBox');
  if (!box) return;

  if (!cart.length) {
    box.innerHTML = `<div class="empty">
      <div class="empty__icon">🛒</div>
      <div>${t('cart.empty')}</div>
      <div class="empty__hint">${t('cart.empty_hint')}</div></div>`;
    return;
  }

  const { subtotal, fee, pct, total } = cartTotals();

  const rows = cart.map((i, idx) => {
    const d = getDish(i.dish_id);
    const modNames = (d.modifiers || [])
      .filter(m => i.modifiers.includes(m.id))
      .map(m => '+ ' + esc(m.name)).join('<br>');
    return `
    <div class="cartrow">
      <img class="cartrow__img" src="${d.image || ''}" alt="" width="56" height="56">
      <div class="cartrow__body">
        <div class="cartrow__name">${esc(d.name)}</div>
        ${modNames ? `<div class="cartrow__mods">${modNames}</div>` : ''}
        ${i.note ? `<div class="cartrow__note">"${esc(i.note)}"</div>` : ''}
        <div class="stepper stepper--sm">
          <button class="stepper__btn" data-cq="${idx}" data-d="-1">−</button>
          <span class="stepper__val">${Math.ceil(i.qty)}</span>
          <button class="stepper__btn" data-cq="${idx}" data-d="1">+</button>
        </div>
      </div>
      <div class="cartrow__right">
        <div class="cartrow__price">${fmtMoney(lineTotal(i))}</div>
        <button class="icon-btn" data-crm="${idx}" aria-label="${t('common.delete')}">🗑</button>
      </div>
    </div>`;
  }).join('');

  const cross = crossSellHTML();

  box.innerHTML = `
    <h2>${t('cart.title')}</h2>
    <div class="cartlist">${rows}</div>
    ${cross}
    <div class="totals">
      <div class="totals__row"><span>${t('cart.subtotal')}</span><b>${fmtMoney(subtotal)}</b></div>
      ${pct ? `<div class="totals__row"><span>${t('cart.service_fee', { pct })}</span>
               <b>${fmtMoney(fee)}</b></div>` : ''}
      <div class="totals__row totals__row--big"><span>${t('cart.total')}</span>
        <b>${fmtMoney(total)}</b></div>
    </div>
    <input class="input" id="cartNote" maxlength="500" data-i18n-ph="cart.note_placeholder">
    <button class="btn btn--primary btn--block" id="btnSubmit">✅ ${t('cart.submit')}</button>`;
  applyI18n(box);
}

function crossSellHTML() {
  const ids = new Set(cart.map(i => i.dish_id));
  const picks = MENU_DATA.dishes
    .filter(d => d.is_available && d.is_cross_sell && !ids.has(d.id)).slice(0, 4);
  if (!picks.length) return '';
  return `<div class="crosssell"><div class="crosssell__title">💡 ${t('cart.cross_sell')}</div>
    <div class="crosssell__row">${picks.map(d =>
      `<button class="chip" data-add="${d.id}">${esc(d.name)} ${fmtMoney(d.price)}</button>`
    ).join('')}</div></div>`;
}

function onCartClick(e) {
  const q = e.target.closest('[data-cq]');
  if (q) { updateQty(Number(q.dataset.cq), Number(q.dataset.d)); return; }
  const rm = e.target.closest('[data-crm]');
  if (rm) { removeItem(Number(rm.dataset.crm)); return; }
  const add = e.target.closest('[data-add]');
  if (add) { quickAdd(Number(add.dataset.add)); renderCart(); return; }
  if (e.target.closest('#btnSubmit')) {
    if (window.submitOrder) window.submitOrder();
  }
}

/* --- Buyurtma yuborish window.submitOrder (order.js) orqali boshqariladi --- */

/* Rasmlar faqat ko'rinishga kirganda yuklanadi */
let imgObserver = null;

function initLazyImages() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('img[data-src]').forEach(loadImg);
    return;
  }
  if (!imgObserver) {
    imgObserver = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        loadImg(en.target);
        imgObserver.unobserve(en.target);
      });
    }, { rootMargin: '300px 0px' });
  }
  document.querySelectorAll('img[data-src]').forEach(img => imgObserver.observe(img));
}

function loadImg(img) {
  const src = img.dataset.src;
  if (!src) {
    img.src = '/static/guest/img/dish-placeholder.svg';
    img.classList.add('is-loaded');
    return;
  }
  img.src = src;
  img.removeAttribute('data-src');
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => {
    img.classList.add('is-error');
    img.src = '/static/guest/img/dish-placeholder.svg';
  }, { once: true });
}

/** Ko'rinadigan taomlarning AR posterlarini oldindan yuklash */
function prefetchARPosters() {
  const cards = [...document.querySelectorAll('[data-ar]')].slice(0, 6);
  cards.forEach(c => {
    const d = getDish(Number(c.dataset.ar));
    if (!d || !d.ar_poster) return;
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = d.ar_poster;
    document.head.appendChild(link);
  });
}

/* Offline navbat order.js va offline.js orqali boshqariladi */

/* M-09 — ofitsiant chaqirish */
const CALL_TYPES = [
  { type: 'waiter', icon: '🧑‍🍳', key: 'call.waiter' },
  { type: 'bill',   icon: '💳',  key: 'call.bill' },
  { type: 'water',  icon: '💧',  key: 'call.water' },
  { type: 'clean',  icon: '🧹',  key: 'call.clean' },
];

function openCallMenu() {
  const grid = CALL_TYPES.map(c => `
    <button class="callbtn" data-call="${c.type}">
      <span class="callbtn__icon">${c.icon}</span>
      <span>${t(c.key)}</span>
    </button>`).join('');

  openSheet(`<h2>${t('call.title')}</h2><div class="callgrid">${grid}</div>`, root => {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-call]');
      if (b) sendCall(b.dataset.call, b);
    });
  });
}

async function sendCall(type, btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('/v1/calls/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: window.ARMENU.tableId,
        session_id: window.ARMENU.sessionId,
        type
      })
    });
    const data = await r.json();

    if (r.status === 429) { toast(t('call.cooldown'), 'info'); return; }
    if (!r.ok) { toast(data.error?.message || t('errors.server'), 'error'); return; }

    closeSheet();
    toast(t('call.sent'), 'success');
    if (navigator.vibrate) navigator.vibrate(60);
  } catch (e) {
    toast(t('errors.network'), 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* M-08 — real-time buyurtma holati */
const STEPS = ['new', 'accepted', 'cooking', 'ready', 'served'];
let ORDER = null;
let PREV_ORDER_STATUS = null;

async function initStatus() {
  // Faqat buyurtma holati sahifasida (orderId mavjud) — menyuda emas
  if (!window.ARMENU || !window.ARMENU.orderId) return;
  await loadI18n(window.ARMENU.lang);
  applyI18n();
  initTheme();
  await loadOrder();
  connectWS();
  bindStatusUI();
}

async function loadOrder() {
  try {
    const r = await fetch(`/v1/orders/${window.ARMENU.orderId}/?lang=${window.ARMENU.lang}`);
    if (!r.ok) throw new Error(r.status);
    ORDER = await r.json();
    renderStatus();
  } catch (e) {
    toast(t('errors.network'), 'error');
  }
}

function renderStatus() {
  if (!ORDER) return;
  const numEl = document.getElementById('ordNumber');
  if (numEl) numEl.textContent = t('order.number', { n: ORDER.number });
  const tblEl = document.getElementById('ordTable');
  if (tblEl) tblEl.textContent = ORDER.table_number ? t('order.table', { n: ORDER.table_number }) : '';

  const cur = Math.max(0, STEPS.indexOf(ORDER.status));
  const isStatusChanged = PREV_ORDER_STATUS !== null && PREV_ORDER_STATUS !== ORDER.status;
  PREV_ORDER_STATUS = ORDER.status;

  const stepsEl = document.getElementById('steps');
  if (stepsEl) {
    stepsEl.className = 'progress-steps';
    stepsEl.innerHTML = STEPS.map((s, i) => {
      const isDone = i < cur;
      const isNow = i === cur;
      let dotContent = `${i + 1}`;
      if (isDone) {
        dotContent = `<svg class="checkmark" viewBox="0 0 52 52" style="width:16px;height:16px;vertical-align:middle;"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`;
      } else if (isNow && isStatusChanged) {
        dotContent = `<svg class="checkmark" viewBox="0 0 52 52" style="width:16px;height:16px;vertical-align:middle;"><circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/><path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/></svg>`;
      }
      return `
        <li class="progress-step ${isDone ? 'is-done' : ''} ${isNow ? 'is-now' : ''}">
          <span class="progress-step__dot">${dotContent}</span>
          <span class="progress-step__label">${t('order.status_' + s)}</span>
        </li>`;
    }).join('');
  }

  updateETA(ORDER.eta_min);

  const itemsEl = document.getElementById('orderItems');
  if (itemsEl) {
    itemsEl.innerHTML = (ORDER.items || []).map(i => `
      <div class="orderitem">
        <span>${esc(i.name)} × ${Math.ceil(i.qty)}</span>
        <b>${fmtMoney(i.price * Math.ceil(i.qty))}</b>
      </div>`).join('');
  }

  const totEl = document.getElementById('ordTotal');
  if (totEl) totEl.textContent = fmtMoney(ORDER.total);
}

function updateETA(min) {
  const el = document.getElementById('eta');
  if (!el) return;
  if (ORDER && ['served', 'paid'].includes(ORDER.status)) { el.textContent = ''; return; }
  el.textContent = min > 0 ? `⏱ ${t('order.eta', { n: Math.ceil(min) })}` : '';
}

/* WS hodisalari (ws.js chaqiradi) */
function onWSMessage(msg) {
  switch (msg.type) {
    case 'order.status':
      if (msg.data.order_id !== window.ARMENU.orderId) break;
      ORDER.status = msg.data.status;
      ORDER.eta_min = msg.data.eta_min;
      renderStatus();
      if (msg.data.status === 'ready') {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        toast(t('order.ready_title'), 'success', 8000);
        playReadySound();
      }
      break;
    case 'order.item_unavailable':
      toast(t('order.unavailable', { dish: msg.data.dish_name }), 'error', 8000);
      break;
    case 'call.resolved':
      toast(t('call.resolved'), 'info');
      break;
    case 'bill.ready':
      location.href = `/bill/${window.ARMENU.sessionId}/`;
      break;
  }
}

function playReadySound() {
  try {
    const a = new Audio('/static/guest/snd/ready.mp3');
    a.volume = 0.6;
    a.play().catch(() => {});
  } catch (e) {}
}

function bindStatusUI() {
  var el;
  el = document.getElementById('btnTheme'); if (el) el.addEventListener('click', toggleTheme);
  el = document.getElementById('btnCall'); if (el) el.addEventListener('click', openCallMenu);
  el = document.getElementById('btnBill'); if (el) el.addEventListener('click', function(){ sendCall('bill'); });
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g,
    m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

document.addEventListener('DOMContentLoaded', initStatus);

/**
 * ⚡ Ishonchli WebSocket klient.
 *  - eksponensial qayta ulanish (jitter bilan)
 *  - seq bo'yicha yo'qolgan xabarlarni aniqlash → syncMissed()
 *  - WS umuman ishlamasa → 15 soniyalik polling fallback
 *  - dublikat xabarlarni tashlab yuborish
 */
class ReliableWS {
  constructor(url, { onMessage, onState, syncMissed, poll } = {}) {
    this.url = url;
    this.onMessage = onMessage || (() => {});
    this.onState = onState || (() => {});
    this.syncMissed = syncMissed || (async () => {});
    this.poll = poll || (async () => {});

    this.ws = null;
    this.lastSeq = 0;
    this.seen = new Set();
    this.attempt = 0;
    this.maxDelay = 30000;
    this.closedByUser = false;
    this.pollTimer = null;
    this.pingTimer = null;
  }

  connect() {
    if (this.closedByUser) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.attempt = 0;
      this.onState('online');
      this.stopPolling();
      this.startPing();
      if (this.lastSeq > 0) this.syncMissed(this.lastSeq);   // ⚡ yo'qolganini olamiz
    };

    this.ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch (err) { return; }
      if (msg.type === 'pong') return;

      // dublikat
      const id = `${msg.type}:${msg.seq}`;
      if (msg.seq && this.seen.has(id)) return;
      if (msg.seq) {
        this.seen.add(id);
        if (this.seen.size > 300) this.seen = new Set([...this.seen].slice(-150));
        // ⚡ seq sakradi → oradagi xabarlar yo'qolgan
        if (this.lastSeq && msg.seq > this.lastSeq + 1) this.syncMissed(this.lastSeq);
        this.lastSeq = Math.max(this.lastSeq, msg.seq);
      }
      this.onMessage(msg);
    };

    this.ws.onclose = () => { this.stopPing(); this.onState('offline'); this.scheduleReconnect(); };
    this.ws.onerror = () => { try { this.ws.close(); } catch (e) {} };
  }

  scheduleReconnect() {
    if (this.closedByUser) return;
    this.attempt += 1;
    const base = Math.min(this.maxDelay, 800 * Math.pow(2, this.attempt - 1));
    const delay = base * (0.7 + Math.random() * 0.6);      // jitter
    if (this.attempt >= 3) this.startPolling();            // ⛔ zaxira yo'l
    setTimeout(() => this.connect(), delay);
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  stopPing() { if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; } }

  startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.poll(), 15000);
    this.poll();
  }

  stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; } }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  close() { this.closedByUser = true; this.stopPing(); this.stopPolling();
            if (this.ws) this.ws.close(); }
}

/* --- Sahifalar uchun yagona ulanish --- */
let GUEST_WS = null;

function connectWS() {
  if (!window.ARMENU.sessionId) return;

  GUEST_WS = new ReliableWS(window.ARMENU.wsUrl, {
    onMessage: (msg) => {
      if (typeof onWSMessage === 'function') onWSMessage(msg);
    },
    onState: (state) => {
      showOfflineBar(state === 'offline' && !navigator.onLine);
    },
    // ⚡ Yo'qolgan xabarlarni REST orqali qo'lga olamiz
    syncMissed: async (sinceSeq) => {
      try {
        const r = await fetch(
          `/v1/orders/session/${window.ARMENU.sessionId}/?since_seq=${sinceSeq}`);
        if (!r.ok) return;
        const { events } = await r.json();
        (events || []).forEach(ev => {
          if (typeof onWSMessage === 'function') onWSMessage(ev);
        });
      } catch (e) {}
    },
    // ⛔ WS umuman ishlamasa
    poll: async () => {
      if (!window.ARMENU.orderId) return;
      try {
        const r = await fetch(`/v1/orders/${window.ARMENU.orderId}/`);
        if (!r.ok) return;
        const o = await r.json();
        if (typeof onWSMessage === 'function') {
          onWSMessage({ type: 'order.status',
                        data: { order_id: o.id, status: o.status, eta_min: o.eta_min } });
        }
      } catch (e) {}
    }
  });
  GUEST_WS.connect();
}

window.addEventListener('pagehide', () => { if (GUEST_WS) GUEST_WS.close(); });