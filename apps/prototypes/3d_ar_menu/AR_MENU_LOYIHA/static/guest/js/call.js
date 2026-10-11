/* call.js — "Chaqirish" funksiyasi (M-09, 60s cooldown, 3 til, real API) */
(function() {
  'use strict';

  const CALL_COOLDOWN = 60000; // 60s
  let lastCall = 0;
  let cooldownTimer = null;

  function getI18nText(key, n) {
    if (typeof window.t === 'function') {
      let txt = window.t(key);
      if (txt && txt !== key) {
        if (n !== undefined) txt = txt.replace('{n}', n);
        return txt;
      }
    }
    const lang = (window.ARMENU && window.ARMENU.lang) || 'uz';
    const fallback = {
      uz: {
        'call.btn': 'Chaqirish',
        'call.wait_seconds': 'Iltimos, {n}s kutib turing',
        'call.sending': 'Yuborilmoqda...',
        'call.done': 'Ofitsiant kelyapti!',
        'call.error': 'Xato yuz berdi'
      },
      ru: {
        'call.btn': 'Вызвать',
        'call.wait_seconds': 'Пожалуйста, подождите {n}с',
        'call.sending': 'Отправляется...',
        'call.done': 'Официант идёт!',
        'call.error': 'Произошла ошибка'
      },
      en: {
        'call.btn': 'Call',
        'call.wait_seconds': 'Please wait {n}s',
        'call.sending': 'Sending...',
        'call.done': 'Waiter is coming!',
        'call.error': 'Error occurred'
      }
    };
    let txt = (fallback[lang] || fallback.uz)[key] || key;
    if (n !== undefined) txt = txt.replace('{n}', n);
    return txt;
  }

  function notify(msg, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type || 'info'}`;
    toast.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;
      z-index: 99999;
      background: ${type === 'success' ? '#16A34A' : type === 'warn' ? '#F59E0B' : '#DC2626'};
      color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
  }

  function handleCall(e) {
    if (e && e.preventDefault) e.preventDefault();

    const btn = document.getElementById('btnCall') || document.getElementById('btn-call-waiter');
    const now = Date.now();
    const remaining = Math.ceil((lastCall + CALL_COOLDOWN - now) / 1000);
    if (remaining > 0) {
      notify(getI18nText('call.wait_seconds', remaining), 'warn');
      return;
    }

    const sessionId = window.ARMENU && window.ARMENU.sessionId;
    const tableId = window.ARMENU && window.ARMENU.tableId;
    if (!sessionId || !tableId) {
      notify(getI18nText('call.error'), 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.dataset.prevHtml = btn.innerHTML;
      btn.innerHTML = `⏳ ${getI18nText('call.sending')}`;
    }

    fetch('/v1/guest/call-waiter/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, table_id: tableId }),
    })
    .then(r => {
      if (r.status === 429) {
        notify(getI18nText('call.wait_seconds', 60), 'warn');
        lastCall = Date.now();
        startCooldown();
        return null;
      }
      return r.json();
    })
    .then(data => {
      if (!data) return;
      if (data.ok) {
        lastCall = Date.now();
        notify(getI18nText('call.done'), 'success');
        startCooldown();
      } else {
        notify(data.error || getI18nText('call.error'), 'error');
      }
    })
    .catch(() => {
      notify(getI18nText('call.error'), 'error');
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        if (!cooldownTimer) {
          btn.innerHTML = btn.dataset.prevHtml || `🔔 ${getI18nText('call.btn')}`;
        }
      }
    });
  }

  function startCooldown() {
    if (cooldownTimer) clearInterval(cooldownTimer);
    const btn = document.getElementById('btnCall') || document.getElementById('btn-call-waiter');
    if (!btn) return;

    cooldownTimer = setInterval(() => {
      const remaining = Math.ceil((lastCall + CALL_COOLDOWN - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        btn.style.opacity = '1';
        btn.innerHTML = btn.dataset.prevHtml || `🔔 ${getI18nText('call.btn')}`;
      } else {
        btn.style.opacity = '0.6';
        btn.innerHTML = `⏱ ${remaining}s`;
      }
    }, 1000);
  }

  function bindCallUI() {
    const btn = document.getElementById('btnCall');
    if (btn) {
      btn.removeEventListener('click', handleCall);
      btn.addEventListener('click', handleCall);
    }
  }

  // Export for window
  window.callWaiter = handleCall;
  window.openCallMenu = handleCall;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCallUI);
  } else {
    bindCallUI();
  }
})();
