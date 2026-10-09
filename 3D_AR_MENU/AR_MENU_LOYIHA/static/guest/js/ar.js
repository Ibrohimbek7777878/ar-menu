/* ARMENU — AR ko'rish (M-05) V-122 + V-124 */
(function (w) {
  'use strict';

  const MV_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  let mvLoaded = false;

  function loadModelViewer() {
    if (mvLoaded) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = MV_SRC;
      s.onload = () => { mvLoaded = true; res(); };
      s.onerror = () => rej(new Error('model-viewer yuklanmadi'));
      document.head.appendChild(s);
      setTimeout(() => mvLoaded ? res() : rej(new Error('timeout')), 12000);
    });
  }

  function buildViewer(d, mode) {
    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', d.glb);
    if (d.usdz) mv.setAttribute('ios-src', d.usdz);
    if (d.poster) mv.setAttribute('poster', d.poster);
    mv.setAttribute('alt', d.name);
    if (mode !== '3d-only') {
      mv.setAttribute('ar', '');
      mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
      mv.setAttribute('ar-scale', 'fixed');
      mv.setAttribute('ar-placement', 'floor');
    }
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('touch-action', 'pan-y');
    mv.setAttribute('interaction-prompt', 'auto');
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('auto-rotate-delay', '2500');
    mv.setAttribute('rotation-per-second', '18deg');
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('shadow-softness', '0.8');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('exposure', '1.0');
    mv.setAttribute('loading', 'eager');
    mv.setAttribute('reveal', 'auto');
    mv.setAttribute('camera-orbit', '0deg 75deg 105%');
    mv.setAttribute('min-camera-orbit', 'auto auto auto');
    mv.setAttribute('max-camera-orbit', 'auto auto auto');
    mv.setAttribute('field-of-view', 'auto');
    mv.style.cssText = 'width:100%;height:100%;background:transparent;--poster-color:transparent';
    const btn = document.createElement('button');
    btn.slot = 'ar-button';
    btn.className = 'ar-cta';
    btn.innerHTML = '📱 <span>Stolga qo\'yib ko\'rish (AR)</span>';
    mv.appendChild(btn);
    const pr = document.createElement('div');
    pr.slot = 'progress-bar';
    pr.className = 'ar-progress';
    pr.innerHTML = '<div class="ar-progress__bar"></div>';
    mv.appendChild(pr);
    return mv;
  }

  w.ARCore = { loadModelViewer, buildViewer, MV_SRC };
})(window);

/* V-124 — 4 bosqichli fallback zanjiri */
(function (w) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let state = {dishId: null, data: null, mode: null, t0: 0, viewer: null, sent: false, meta: {}};
  let arQty = 1;

  function updateArPriceDisplay() {
    const qtyEl = $('arQty');
    if (qtyEl) qtyEl.textContent = arQty;
    const unitPrice = state.meta && state.meta.price ? Number(state.meta.price) : 0;
    const total = unitPrice * arQty;
    const formatted = total > 0 ? (typeof fmtMoney === 'function' ? fmtMoney(total) : Math.round(total).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm") : '';
    const prEl = $('arPrice');
    if (prEl) prEl.textContent = formatted;
    const prHead = $('arPriceHeader');
    if (prHead) prHead.textContent = formatted;
  }

  async function openAR(dishId, dishMeta) {
    arQty = 1;
    state = {dishId, data: null, mode: null, t0: 0, viewer: null, sent: false, meta: dishMeta || {}};
    showModal();
    resetPanes();
    const titleEl = $('arTitle');
    if (titleEl) titleEl.textContent = (dishMeta && dishMeta.name) || '';
    const descEl = $('arDishDesc');
    if (descEl) descEl.textContent = (dishMeta && dishMeta.desc) || '';
    updateArPriceDisplay();

    const support = await (w.ARDetect ? w.ARDetect.detectARSupport() : Promise.resolve('3d-only'));
    const lang = (w.ARMENU && w.ARMENU.lang) || w.LANG || 'uz';
    let d;
    try {
      const r = await fetch(`/v1/ar/${dishId}/?lang=${lang}`, {
        headers: {'X-Session-Id': localStorage.getItem('gs') || localStorage.getItem('armenu_device') || ''},
      });
      d = await r.json();
    } catch (_) {
      return fallbackImage(null, 'Tarmoq xatosi');
    }
    state.data = d;

    if (!d.ready) {
      return fallbackImage(d, d.status === 'processing' || d.status === 'queued' ? '3D model tayyorlanmoqda…' : '');
    }

    const sizeCmEl = $('arSizeCm');
    const sizeEl = $('arSize');
    if (sizeCmEl) sizeCmEl.textContent = d.real_size_cm;
    if (sizeEl) sizeEl.textContent = d.glb_bytes ? (d.glb_bytes / 1048576).toFixed(1) + ' MB' : '';

    if (['webxr', 'quick-look', 'scene-viewer', '3d-only'].includes(support)) {
      try {
        await w.ARCore.loadModelViewer();
        return mount3D(d, support);
      } catch (e) {
        console.warn('[AR] model-viewer yiqildi:', e);
      }
    }

    if (d.preview_360) return mount360(d, support);

    return fallbackImage(d, '');
  }

  function mount3D(d, mode) {
    const stage = $('arStage');
    if (!stage) return;
    stage.innerHTML = '';
    const mv = w.ARCore.buildViewer(d, mode);
    stage.appendChild(mv);
    state.viewer = mv;
    state.mode = mode;

    const modeLbl = $('arModeLbl');
    if (modeLbl) modeLbl.textContent = {
      'webxr': '🥽 WebXR AR', 'quick-look': '📱 AR (iOS)',
      'scene-viewer': '📱 AR (Android)', '3d-only': '🔄 360° 3D',
    }[mode] || mode;

    mv.addEventListener('progress', (e) => {
      const p = Math.round(e.detail.totalProgress * 100);
      const barFill = $('arBarFill');
      if (barFill) barFill.style.width = p + '%';
      const bar = mv.querySelector('.ar-progress__bar');
      if (bar) bar.style.width = p + '%';
    });

    mv.addEventListener('load', () => {
      show('arStage'); show('arMeta');
      state.t0 = Date.now();
      try {
        const dim = mv.getDimensions();
        console.info('[AR] model o\'lchami (m):', dim, '| kutilgan:', d.scale_m);
        const maxDim = Math.max(dim.x, dim.y, dim.z);
        const targetM = d.scale_m || 0.28;
        if (maxDim > 0 && (maxDim > targetM * 2.0 || maxDim < targetM * 0.5)) {
          const autoScale = targetM / maxDim;
          mv.scale = `${autoScale} ${autoScale} ${autoScale}`;
          if (typeof mv.updateFraming === 'function') mv.updateFraming();
        }
      } catch (_) {}
    });

    mv.addEventListener('error', (e) => {
      console.warn('[AR] model yuklanmadi:', e);
      if (d.preview_360) mount360(d, '360');
      else fallbackImage(d, '3D yuklanmadi');
    });

    mv.addEventListener('ar-status', (e) => {
      if (e.detail.status === 'session-started') {
        state.mode = mode;
        state.t0 = state.t0 || Date.now();
      }
      if (e.detail.status === 'not-presenting' && state.t0) {
        sendView();
      }
      if (e.detail.status === 'failed') {
        console.warn('[AR] AR sessiya ochilmadi — 3D rejimda qolamiz');
      }
    });

    setTimeout(() => {
      const st = $('arStage');
      if (st && st.hidden) {
        if (d.preview_360) mount360(d, '360');
        else fallbackImage(d, 'Yuklash uzoq davom etdi');
      }
    }, 25000);
  }

  function mount360(d, mode) {
    state.mode = '360';
    state.t0 = Date.now();
    const base = d.preview_360;
    const img = $('ar360Img');
    const rng = $('ar360Range');
    if (!img || !rng) return fallbackImage(d, '');
    const frame = (i) => base.replace('{i}', String(i).padStart(2, '0'));

    for (let i = 0; i < 24; i++) { const p = new Image(); p.src = frame(i); }
    img.src = frame(0);
    rng.oninput = () => { img.src = frame(Number(rng.value)); };

    let sx = 0, sv = 0;
    img.addEventListener('touchstart', (e) => {
      sx = e.touches[0].clientX; sv = Number(rng.value);
    }, {passive: true});
    img.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - sx;
      let v = Math.round(sv + dx / 12) % 24;
      if (v < 0) v += 24;
      rng.value = v; img.src = frame(v);
    }, {passive: true});

    show('ar360'); show('arMeta');
    const modeLbl = $('arModeLbl');
    if (modeLbl) modeLbl.textContent = '🔄 360°';
  }

  function fallbackImage(d, note) {
    state.mode = 'image';
    state.t0 = Date.now();
    const src = (d && d.poster) || (state.meta && state.meta.image) || '';
    const img = $('arPlainImg');
    const noteEl = $('arPlainNote');
    if (img) { img.src = src; img.alt = (d && d.name) || (state.meta && state.meta.name) || ''; }
    if (noteEl) noteEl.textContent = note || '';
    show('arPlain');
    if (d && d.ready) show('arMeta');
  }

  function showModal() { const m=$('arModal'); if(m) m.hidden=false; document.body.style.overflow='hidden'; }
  function closeModal() {
    sendView();
    const m=$('arModal'); if(m) m.hidden=true;
    document.body.style.overflow='';
    const st=$('arStage'); if(st) st.innerHTML='';
    state.viewer=null;
  }
  function resetPanes() {
    ['arStage', 'ar360', 'arPlain', 'arMeta'].forEach(id => {
      const el = $(id);
      if (el) { el.hidden = true; el.style.setProperty('display', 'none', 'important'); }
    });
    const l = $('arLoading');
    if (l) { l.hidden = false; l.style.removeProperty('display'); }
    const b = $('arBarFill');
    if (b) b.style.width = '0%';
  }
  function show(id) {
    const l = $('arLoading');
    if (l) { l.hidden = true; l.style.setProperty('display', 'none', 'important'); }
    const el = $(id);
    if (el) { el.hidden = false; el.style.removeProperty('display'); }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-ar-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    const m=$('arModal'); if (e.key === 'Escape' && m && !m.hidden) closeModal();
  });

  const btnMinus = $('arQtyMinus');
  if (btnMinus) btnMinus.onclick = (e) => {
    e.stopPropagation();
    arQty = Math.max(1, arQty - 1);
    updateArPriceDisplay();
  };
  const btnPlus = $('arQtyPlus');
  if (btnPlus) btnPlus.onclick = (e) => {
    e.stopPropagation();
    arQty = Math.min(99, arQty + 1);
    updateArPriceDisplay();
  };

  const addBtn = $('arAddBtn');
  if (addBtn) addBtn.onclick = () => {
    sendView(true);
    if (state.dishId) {
      if (w.addToCart) w.addToCart({dish_id: state.dishId, qty: arQty, modifiers: [], note: ''});
      else if (w.Cart && w.Cart.add) w.Cart.add(state.dishId, arQty, {ar_viewed: true});
      if (w.animateFlyToCart) w.animateFlyToCart(addBtn);
    }
    closeModal();
    if (typeof toast !== 'undefined' && w.t) toast(w.t('cart.added') || "Savatga qo'shildi", 'success');
  };

  function sendView(converted) {
    if (state.sent || !state.t0 || !state.dishId) return;
    state.sent = true;
    const dur = Math.round((Date.now() - state.t0) / 1000);
    const body = JSON.stringify({
      dish_id: state.dishId,
      session_id: (w.ARMENU && w.ARMENU.sessionId) || localStorage.getItem('gs') || localStorage.getItem('armenu_device') || '',
      table_id: (w.ARMENU && w.ARMENU.tableId) || Number(localStorage.getItem('table_id') || 0) || null,
      mode: state.mode || 'image',
      duration_sec: dur,
      device: w.ARDetect ? w.ARDetect.device() : 'desktop',
      converted: !!converted,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/v1/ar/view/', new Blob([body], {type: 'application/json'}));
    } else {
      fetch('/v1/ar/view/', {method: 'POST', body, headers: {'Content-Type': 'application/json'}, keepalive: true}).catch(() => {});
    }
  }

  w.addEventListener('pagehide', () => sendView());

  w.openAR = openAR;
  w.ARView = {openAR, closeModal, sendView};
})(window);
