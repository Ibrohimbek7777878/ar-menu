/* Staff Orders JS — PIN login + buyurtmalar + WS */
(function() {
  'use strict';

  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.getElementById('main-app');
  const pinDisplay = document.getElementById('pin-display');
  const loginError = document.getElementById('login-error');
  const ordersList = document.getElementById('orders-list');
  const emptyMsg = document.getElementById('empty-msg');
  const btnLogout = document.getElementById('btn-logout');

  let pin = '';
  let token = localStorage.getItem('armenu_staff_token') || '';
  let orders = {};
  let ws = null;
  let currentFilter = 'open';

  // ---- PIN pad ----
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const num = btn.dataset.num;
      if (num === 'C') {
        pin = '';
        loginError.textContent = '';
      } else if (num === 'OK') {
        if (pin.length >= 4) doLogin(pin);
        return;
      } else {
        if (pin.length < 6) pin += num;
      }
      pinDisplay.textContent = pin.padEnd(4, '_').split('').join(' ');
    });
  });

  // ---- Login ----
  function doLogin(pinCode) {
    loginError.textContent = 'Tekshirilmoqda...';
    fetch('/v1/auth/staff/login/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({pin: pinCode, restaurant_id: STAFF.restaurantId}),
    })
    .then(r => r.json())
    .then(data => {
      if (data.access) {
        token = data.access;
        localStorage.setItem('armenu_staff_token', token);
        showMain();
      } else {
        loginError.textContent = data.detail || data.error || 'Noto\'g\'ri PIN';
        pin = '';
        pinDisplay.textContent = '____';
      }
    })
    .catch(() => {
      loginError.textContent = 'Ulanish xatosi';
      pin = '';
      pinDisplay.textContent = '____';
    });
  }

  // ---- Show main ----
  function showMain() {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    fetchOrders();
    connectWS();
  }

  // ---- Check existing token ----
  if (token) {
    fetch('/v1/auth/staff/me/', {headers: {'Authorization': 'Bearer ' + token}})
    .then(r => { if (r.ok) showMain(); else token = ''; })
    .catch(() => { token = ''; });
  }

  // ---- Logout ----
  btnLogout.addEventListener('click', () => {
    token = '';
    localStorage.removeItem('armenu_staff_token');
    location.reload();
  });

  // ---- Tabs ----
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderOrders();
    });
  });

  // ---- Fetch orders ----
  function fetchOrders() {
    fetch('/v1/staff/orders/?status=' + currentFilter, {
      headers: {'Authorization': 'Bearer ' + token}
    })
    .then(r => r.json())
    .then(data => {
      orders = {};
      (data.orders || []).forEach(o => { orders[o.id] = o; });
      renderOrders();
      if (data.stats) {
        document.getElementById('s-sum').textContent = Number(data.stats.sum || 0).toLocaleString() + ' UZS';
        document.getElementById('s-tables').textContent = (data.stats.tables || 0) + ' stol';
        document.getElementById('s-tips').textContent = (data.stats.tips || 0) + ' tips';
      }
    })
    .catch(() => {});
  }

  // ---- Render ----
  const STATUS_UZ = {
    new: 'Yangi', accepted: 'Qabul qilindi', cooking: 'Tayyorlanmoqda',
    ready: 'Tayyor', served: 'Berildi', paid: "To'landi", cancelled: 'Bekor'
  };

  function renderOrders() {
    const list = Object.values(orders);
    if (list.length === 0) {
      emptyMsg.style.display = '';
      ordersList.querySelectorAll('.st-order').forEach(c => c.remove());
      return;
    }
    emptyMsg.style.display = 'none';

    let html = '';
    list.forEach(o => {
      let items = (o.items || []).map(it =>
        `<div class="st-item"><span class="st-item-qty">${it.qty}×</span> ${it.name}${it.note ? ' (' + it.note + ')' : ''}</div>`
      ).join('');

      let actions = '';
      if (o.status === 'new') {
        actions = `<button class="st-btn st-btn-accept" data-action="accept" data-id="${o.id}">Qabul qilish</button>`;
      } else if (o.status === 'ready') {
        actions = `<button class="st-btn st-btn-serve" data-action="serve" data-id="${o.id}">Berish</button>`;
      }
      actions += `<button class="st-btn st-btn-cancel" data-action="cancel" data-id="${o.id}">Bekor</button>`;

      const age = o.age_sec || 0;
      const mm = Math.floor(age / 60);

      html += `
        <div class="st-order" data-id="${o.id}" data-status="${o.status}">
          <div class="st-order-head">
            <span class="st-num">${o.number}</span>
            <span class="st-table">Stol ${o.table_no}</span>
            <span class="st-time">${mm} daqiqa</span>
            <span class="st-total">${Number(o.total).toLocaleString()} UZS</span>
          </div>
          <div class="st-items">${items}</div>
          <div class="st-actions">${actions}</div>
        </div>`;
    });

    ordersList.querySelectorAll('.st-order').forEach(c => c.remove());
    ordersList.insertAdjacentHTML('beforeend', html);
  }

  // ---- Actions ----
  function doAction(action, orderId) {
    const urlMap = {
      accept: `/v1/staff/orders/${orderId}/accept/`,
      serve: `/v1/staff/orders/${orderId}/serve/`,
      cancel: `/v1/staff/orders/${orderId}/cancel/`,
    };
    fetch(urlMap[action], {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
      body: action === 'cancel' ? JSON.stringify({reason: 'Ofitsiant bekor qildi'}) : undefined,
    })
    .then(r => r.json())
    .then(o => { if (o && o.id) { orders[o.id] = o; renderOrders(); } })
    .catch(() => {});
  }

  ordersList.addEventListener('click', e => {
    const btn = e.target.closest('.st-btn');
    if (!btn) return;
    doAction(btn.dataset.action, parseInt(btn.dataset.id));
  });

  // ---- Audio notification (WebAudio beep) ----
  function playBeep(freq = 880, duration = 0.25) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch(e) {
      try { new Audio('/static/sounds/ready.mp3').play(); } catch(err) {}
    }
  }

  function showStaffToast(msg, type = 'info') {
    const t = document.createElement('div');
    if (type === 'call') {
      t.className = 'staff-call-toast';
    } else {
      t.className = `staff-toast staff-toast--${type}`;
      t.style.cssText = `
        position: fixed; top: 16px; right: 16px; z-index: 99999;
        padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 15px;
        color: white; box-shadow: 0 4px 16px rgba(0,0,0,0.3); animation: slideIn 0.3s;
        background: ${type === 'success' ? '#16A34A' : '#2563EB'};
      `;
    }
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.remove(); }, 5000);
  }

  // ---- WebSocket ----
  function connectWS() {
    if (!token) return;
    const port = location.port ? ':' + location.port : '';
    const wsScheme = (window.STAFF && window.STAFF.wsScheme) || (location.protocol === 'https:' ? 'wss' : 'ws');
    const url = `${wsScheme}://${location.hostname}${port}/ws/staff/${encodeURIComponent(token)}/`;

    try {
      ws = new WebSocket(url);
    } catch(e) {
      setTimeout(connectWS, 3000);
      return;
    }

    ws.onopen = () => {
      console.log('[Staff] WS connected:', url);
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

        if (type === 'call.new') {
          playBeep(880, 0.4);
          const tableNo = data.table_no || data.table_id || '—';
          showStaffToast(`🔔 Stol ${tableNo}: Mijoz ofitsiantni chaqirmoqda!`, 'call');
          return;
        }

        if (type === 'order.status' || type === 'order.new' || type === 'order.created') {
          const o = data.order || data;
          if (o && o.id) {
            orders[o.id] = o;
            renderOrders();
            playBeep(659, 0.2);
            showStaffToast(`📦 Yangi buyurtma #${o.number || o.id} (Stol ${o.table_no || '—'})`, 'info');
          }
          return;
        }

        if (type === 'order.ready') {
          playBeep(880, 0.35);
          const o = data.order || data;
          if (o && o.id) {
            orders[o.id] = o;
            renderOrders();
            showStaffToast(`✅ Buyurtma #${o.number || o.id} tayyor!`, 'success');
          }
          return;
        }
      } catch(err) {
        console.warn('[Staff] WS parse error:', err);
      }
    };

    ws.onclose = () => { setTimeout(connectWS, 3000); };
    ws.onerror = () => { ws.close(); };
  }

  // Auto refresh (15s)
  setInterval(fetchOrders, 15000);
})();
