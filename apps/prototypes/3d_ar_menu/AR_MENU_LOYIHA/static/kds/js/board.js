/* KDS Board JS — realtime buyurtmalar paneli (3 metrdan o'qiladigan) */
(function() {
  'use strict';

  const board = document.getElementById('board');
  const emptyMsg = document.getElementById('empty-msg');
  const clockEl = document.getElementById('clock');
  const statNew = document.getElementById('stat-new');
  const statCooking = document.getElementById('stat-cooking');
  const statReady = document.getElementById('stat-ready');
  const wsDot = document.getElementById('ws-dot');
  const wsStatusText = document.getElementById('ws-status-text');

  let orders = {};
  let ws = null;
  let reconnectTimer = null;

  // ---- Clock ----
  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
  }
  setInterval(updateClock, 10000);
  updateClock();

  // ---- Status badge ----
  const STATUS_LABEL = {
    new: 'YANGI', accepted: 'QABUL', cooking: 'TAYYORLANMOQDA',
    ready: 'TAYYOR', served: 'BERILDI', paid: "TO'LANDI", cancelled: 'BEKOR'
  };
  const STATUS_BTN = {
    new: {cls: 'btn-accept', label: 'QABUL QILISH', action: 'accept'},
    accepted: {cls: 'btn-cook', label: 'TAYYORLASH', action: 'cook'},
    cooking: {cls: 'btn-ready', label: 'TAYYOR', action: 'ready'},
    ready: {cls: 'btn-serve', label: 'BERISH', action: 'serve'},
  };

  // ---- Timer ----
  function formatAge(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function timerLevel(order) {
    if (!order.eta_min || order.eta_min <= 0) return 'safe';
    const pct = order.eta_pct || 0;
    if (pct >= 90) return 'danger';
    if (pct >= 60) return 'warn';
    return 'safe';
  }

  // ---- Render card ----
  function renderCard(order) {
    const age = order.age_sec || 0;
    const level = timerLevel(order);
    const btn = STATUS_BTN[order.status];

    let itemsHtml = '';
    (order.items || []).forEach(it => {
      let mods = '';
      if (it.modifiers && it.modifiers.length) {
        mods = it.modifiers.map(m => `<span class="item-mod">${m.name || m}</span>`).join(' ');
      }
      itemsHtml += `
        <div class="card-item">
          <span class="item-qty">${it.qty}×</span>
          <span class="item-name">${it.name}</span>
          ${mods}
          ${it.note ? `<span class="item-note">${it.note}</span>` : ''}
        </div>`;
    });

    let btnHtml = '';
    if (btn) {
      btnHtml = `<button class="kds-btn ${btn.cls}" data-action="${btn.action}" data-id="${order.id}">${btn.label}</button>`;
    }
    if (order.status !== 'cancelled' && order.status !== 'paid' && order.status !== 'served') {
      btnHtml += `<button class="kds-btn btn-cancel" data-action="cancel" data-id="${order.id}">BEKOR</button>`;
    }

    return `
      <div class="kds-card ${level === 'danger' ? 'is-late' : ''}" data-id="${order.id}" data-status="${order.status}" data-level="${level}">
        <div class="card-head">
          <span class="card-number">#${order.number}</span>
          <span class="card-table">№${order.table_no || order.table || '—'}</span>
          <span class="card-timer" data-level="${level}">${formatAge(age)}</span>
        </div>
        <div class="card-items">${itemsHtml}</div>
        ${order.note ? `<div class="card-foot"><span class="card-note">📝 ${order.note}</span></div>` : ''}
        <div class="card-foot">${btnHtml}</div>
      </div>`;
  }

  // ---- Update board ----
  function updateBoard() {
    const sorted = Object.values(orders).sort((a, b) => {
      const so = {new: 0, accepted: 1, cooking: 2, ready: 3};
      return (so[a.status] || 9) - (so[b.status] || 9) || a.id - b.id;
    });

    if (sorted.length === 0) {
      emptyMsg.style.display = '';
      board.querySelectorAll('.kds-card').forEach(c => c.remove());
    } else {
      emptyMsg.style.display = 'none';
      const ids = new Set(sorted.map(o => o.id));

      // Remove cards no longer present
      board.querySelectorAll('.kds-card').forEach(c => {
        const id = parseInt(c.dataset.id);
        if (!ids.has(id)) c.remove();
      });

      // Add/update cards
      sorted.forEach(order => {
        let card = board.querySelector(`.kds-card[data-id="${order.id}"]`);
        const html = renderCard(order);
        if (card) {
          card.outerHTML = html;
        } else {
          board.insertAdjacentHTML('beforeend', html);
        }
      });
    }

    // Stats
    const all = Object.values(orders);
    statNew.textContent = all.filter(o => o.status === 'new').length + ' yangi';
    statCooking.textContent = all.filter(o => ['accepted','cooking'].includes(o.status)).length + ' tayyorlanmoqda';
    statReady.textContent = all.filter(o => o.status === 'ready').length + ' tayyor';

    // Update timers
    Object.values(orders).forEach(o => { o.age_sec = (o.age_sec || 0) + 1; });
  }

  // ---- API ----
  function fetchOrders() {
    fetch(`/v1/staff/orders/?status=open`, {
      headers: {'Authorization': 'Bearer ' + KDS.token}
    })
    .then(r => r.json())
    .then(data => {
      (data.orders || []).forEach(o => { orders[o.id] = o; });
      updateBoard();
    })
    .catch(() => {});
  }

  // ---- Action ----
  function doAction(action, orderId) {
    const urlMap = {
      accept: `/v1/staff/orders/${orderId}/accept/`,
      cook: `/v1/staff/orders/${orderId}/cook/`,
      ready: `/v1/staff/orders/${orderId}/ready/`,
      serve: `/v1/staff/orders/${orderId}/serve/`,
      cancel: `/v1/staff/orders/${orderId}/cancel/`,
    };
    const url = urlMap[action];
    if (!url) return;

    fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + KDS.token,
        'Content-Type': 'application/json',
      },
      body: action === 'cancel' ? JSON.stringify({reason: 'KDS bekor qildi'}) : undefined,
    })
    .then(r => r.json())
    .then(order => {
      if (order && order.id) {
        orders[order.id] = order;
        updateBoard();
      }
    })
    .catch(() => {});
  }

  // ---- Click handler ----
  board.addEventListener('click', e => {
    const btn = e.target.closest('.kds-btn');
    if (!btn) return;
    doAction(btn.dataset.action, parseInt(btn.dataset.id));
  });

  // ---- WebSocket ----
  function connectWS() {
    if (!window.KDS || !KDS.token) return;
    const port = location.port ? ':' + location.port : '';
    const wsScheme = (window.KDS && window.KDS.wsScheme) || (location.protocol === 'https:' ? 'wss' : 'ws');
    const url = `${wsScheme}://${location.hostname}${port}/ws/kds/${encodeURIComponent(KDS.token)}/`;

    try {
      ws = new WebSocket(url);
    } catch(e) {
      if (wsDot) wsDot.classList.add('offline');
      if (wsStatusText) wsStatusText.textContent = 'Offline (Polling)';
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('[KDS] WS connected:', url);
      if (wsDot) wsDot.classList.remove('offline');
      if (wsStatusText) wsStatusText.textContent = 'Online';
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    };

    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        const type = msg.type || msg.event;
        const data = msg.data || msg.payload || {};

        if (type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          return;
        }

        if (type === 'board.snapshot') {
          orders = {};
          (Array.isArray(data) ? data : (data.orders || [])).forEach(o => {
            if (o && o.id) orders[o.id] = o;
          });
          updateBoard();
          return;
        }

        if (type === 'order.status' || type === 'order.new' || type === 'order.created' || type === 'order.ready') {
          const order = data.order || data;
          if (order && order.id) {
            if (['served', 'paid', 'cancelled'].includes(order.status)) {
              delete orders[order.id];
            } else {
              orders[order.id] = order;
            }
            updateBoard();
          }
          return;
        }

        if (type === 'order.cancelled') {
          const orderId = data.order_id || (data.order && data.order.id);
          if (orderId) {
            delete orders[orderId];
            updateBoard();
          }
          return;
        }
      } catch(err) {
        console.warn('[KDS] WS parse error:', err);
      }
    };

    ws.onclose = () => {
      if (wsDot) wsDot.classList.add('offline');
      if (wsStatusText) wsStatusText.textContent = 'Offline (Polling)';
      scheduleReconnect();
    };
    ws.onerror = () => {
      if (wsDot) wsDot.classList.add('offline');
      if (wsStatusText) wsStatusText.textContent = 'Offline (Polling)';
      ws.close();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connectWS(); }, 3000);
  }

  // ---- Polling fallback (15s) ----
  setInterval(fetchOrders, 15000);

  // ---- Timer tick ----
  setInterval(updateBoard, 1000);

  // ---- Init ----
  fetchOrders();
  connectWS();
})();
