/* order.js — submitOrder(), offline navbat, idempotency */
(function() {
  'use strict';

  const ORDER_API = '/v1/orders/';
  const OFFLINE_KEY = 'armenu_offline_orders';
  let submitting = false;

  // ---- Savatdan buyurtma yaratish ----
  window.submitOrder = async function submitOrder(opts) {
    if (submitting) return { error: 'already_submitting' };

    const getCartFn = window.getCart || (typeof cart !== 'undefined' ? () => cart : null);
    const currentCart = (getCartFn ? getCartFn() : []) || [];

    if (!currentCart.length) {
      const msg = typeof t === 'function' ? t('cart.empty') : 'Savat bo\'sh';
      if (typeof toast === 'function') toast(msg, 'error');
      return { error: 'cart_empty' };
    }

    const btn = document.getElementById('btnSubmit');
    submitting = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = typeof t === 'function' ? t('cart.sending') : 'Yuborilmoqda...';
    }

    const armenu = window.ARMENU || {};
    const noteEl = document.getElementById('cartNote');
    const orderNote = (noteEl ? noteEl.value : (opts && opts.note) || '').slice(0, 500);

    const idempotencyKey = generateIdempotencyKey();
    const payload = {
      restaurant_id: armenu.restaurantId || null,
      table_id: armenu.tableId || null,
      session_id: armenu.sessionId || '',
      note: orderNote,
      items: currentCart.map(i => ({
        dish_id: i.dish_id,
        qty: Math.ceil(i.qty || 1),
        modifiers: i.modifiers || [],
        note: (i.note || '').slice(0, 200),
        ar_viewed: !!i.ar_viewed,
      })),
      idempotency_key: idempotencyKey,
    };

    try {
      if (navigator.onLine) {
        const resp = await fetch(ORDER_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(payload),
        });

        if (resp.status === 409) {
          const dupData = await resp.json().catch(() => ({}));
          const orderId = dupData.order_id || dupData.id;
          finishOrderSuccess(orderId, armenu.sessionId);
          return { ok: true, duplicate: true, order_id: orderId };
        }

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          handleOrderError(data);
          return { ok: false, error: data };
        }

        finishOrderSuccess(data.id, armenu.sessionId);
        return { ok: true, order: data };
      } else {
        saveOfflineOrder(payload, idempotencyKey);
        finishOfflineQueued();
        return { ok: true, offline: true };
      }
    } catch (err) {
      // Tarmoq xatosi bo'lsa offline navbatga yoziladi
      saveOfflineOrder(payload, idempotencyKey);
      finishOfflineQueued();
      return { ok: true, offline: true, error: err };
    } finally {
      submitting = false;
      if (btn && btn.isConnected) {
        btn.disabled = false;
        btn.textContent = '✅ ' + (typeof t === 'function' ? t('cart.submit') : 'Buyurtma berish');
      }
    }
  };

  function finishOrderSuccess(orderId, sessionId) {
    if (window.clearCart) window.clearCart();
    if (typeof closeSheet === 'function') closeSheet();
    if (typeof toast === 'function') {
      toast(typeof t === 'function' ? t('order.created') : 'Buyurtma qabul qilindi!', 'success');
    }
    if (orderId) {
      const sParam = sessionId ? `?s=${encodeURIComponent(sessionId)}` : '';
      setTimeout(() => {
        location.href = `/o/${orderId}/${sParam}`;
      }, 300);
    }
  }

  function finishOfflineQueued() {
    if (window.clearCart) window.clearCart();
    if (typeof closeSheet === 'function') closeSheet();
    if (typeof toast === 'function') {
      toast('Internet yo\'q. Buyurtma saqlandi va ulanish tiklanganda yuboriladi!', 'info', 6000);
    }
  }

  async function handleOrderError(data) {
    const code = data.error?.code;
    if (code === 'DISH_UNAVAILABLE') {
      const dishId = data.error.details?.dish_id;
      const getCartFn = window.getCart || (typeof cart !== 'undefined' ? () => cart : null);
      if (getCartFn) {
        const c = getCartFn();
        const filtered = c.filter(i => i.dish_id !== dishId);
        c.length = 0;
        c.push(...filtered);
        if (typeof saveCart === 'function') saveCart();
        if (typeof renderCart === 'function') renderCart();
      }
      if (typeof toast === 'function') {
        toast(data.error.message || (typeof t === 'function' ? t('errors.dish_unavailable') : 'Taom mavjud emas'), 'error');
      }
    } else if (code === 'PRICE_CHANGED') {
      if (typeof reloadMenuContent === 'function') {
        await reloadMenuContent(window.ARMENU?.lang || 'uz');
      }
      if (typeof renderCart === 'function') renderCart();
      if (typeof toast === 'function') {
        toast(typeof t === 'function' ? t('errors.price_changed') : 'Narxlar o\'zgardi', 'error');
      }
    } else {
      if (typeof toast === 'function') {
        toast(data.error?.message || (typeof t === 'function' ? t('errors.server') : 'Xatolik yuz berdi'), 'error');
      }
    }
  }

  // ---- Offline saqlash ----
  function saveOfflineOrder(payload, idempotencyKey) {
    const orders = getOfflineOrders();
    orders.push({
      payload,
      idempotencyKey,
      timestamp: Date.now(),
    });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(orders.slice(-30)));

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.sync.register('sync-orders').catch(() => {});
      });
    }
  }

  // ---- Offline orderlarni olish ----
  function getOfflineOrders() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    } catch(e) {
      return [];
    }
  }

  window.clearOfflineOrders = function() {
    localStorage.removeItem(OFFLINE_KEY);
  };

  // ---- Online bo'lganda offline orderlarni yuborish ----
  async function syncOfflineOrders() {
    const orders = getOfflineOrders();
    if (!orders.length) return;

    const remaining = [];
    let syncedCount = 0;

    for (const item of orders) {
      // 24 soatdan eski so'rovlar tashlanadi
      if (Date.now() - (item.timestamp || 0) > 86400 * 1000) continue;
      try {
        const resp = await fetch(ORDER_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': item.idempotencyKey,
          },
          body: JSON.stringify(item.payload),
        });

        if (resp.ok || resp.status === 409) {
          syncedCount++;
        } else if (resp.status >= 500) {
          remaining.push(item);
        }
      } catch (err) {
        remaining.push(item);
      }
    }

    localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));
    if (syncedCount > 0 && typeof toast === 'function') {
      toast(`${syncedCount} ta offline buyurtma serverga yuborildi!`, 'success');
    }
  }

  window.syncOfflineOrders = syncOfflineOrders;
  window.addEventListener('online', syncOfflineOrders);

  // ---- Idempotency key generatsiya ----
  function generateIdempotencyKey() {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).substring(2, 10);
    return `ord-${ts}-${rand}`;
  }

  // ---- Order holatini tekshirish ----
  window.checkOrderStatus = function(orderId) {
    return fetch(`/v1/orders/${orderId}/`, {
      headers: { 'Accept': 'application/json' },
    }).then(r => r.json());
  };

  // ---- Offline soni ----
  window.getOfflineCount = function() {
    return getOfflineOrders().length;
  };
})();
