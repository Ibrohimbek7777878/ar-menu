/* ARMENU — admin 3D boshqaruvi (A-04) */
(function () {
  'use strict';

  const A = window.AR_ADMIN;
  const $ = (id) => document.getElementById(id);
  const list = $('modelList');
  const tpl = $('tplModel');
  let models = [];
  let target = null;          // hozirgi taom (modal uchun)

  const authHeaders = (extra = {}) => {
    const h = { ...extra };
    if (A && A.token) h['Authorization'] = 'Bearer ' + A.token;
    return h;
  };
  const H = () => authHeaders({'Content-Type': 'application/json'});
  const fmtMB = (b) => b ? (b / 1048576).toFixed(1) + ' MB' : '—';

  async function load() {
    const r = await fetch('/v1/admin/ar/models/', {headers: H()});
    const j = await r.json();
    models = j.models || [];
    render();
  }

  function render() {
    const q = ($('fSearch').value || '').toLowerCase();
    const st = $('fStatus').value;
    list.innerHTML = '';

    const rows = models.filter(m =>
      (!q || m.dish_name.toLowerCase().includes(q)) &&
      (!st || m.status === st));

    rows.forEach(m => list.appendChild(card(m)));

    $('cReady').textContent = models.filter(m => m.status === 'ready').length;
    $('cProc').textContent = models.filter(m => ['processing', 'queued'].includes(m.status)).length;
    $('cNone').textContent = models.filter(m => m.status === 'none').length;
    $('cLib').textContent = models.filter(m => m.source === 'library').length;
  }

  function card(m) {
    const n = tpl.content.firstElementChild.cloneNode(true);
    n.dataset.dish = m.dish_id;

    const img = n.querySelector('.mcard__prev img');
    img.src = m.poster || m.dish_image || '';
    img.alt = m.dish_name;

    n.querySelector('.mcard__name').textContent = m.dish_name;

    const badge = n.querySelector('.mcard__badge');
    const B = {
      ready:      ['✅ TAYYOR', 'ok'],
      processing: ['⏳ JARAYONDA', 'warn'],
      queued:     ['⏳ NAVBATDA', 'warn'],
      failed:     ['⛔ XATO', 'bad'],
      none:       ['❌ MODEL YO\'Q', 'off'],
    }[m.status] || ['—', 'off'];
    badge.textContent = B[0];
    badge.className = 'mcard__badge is-' + B[1];

    const SRC = {
      library: '📚 Kutubxona (bepul)', ai: '🤖 AI (rasmdan)',
      upload: '📤 Qo\'lda yuklangan', photogrammetry: '📷 Fotogrammetriya',
    };
    n.querySelector('.mcard__src').textContent = SRC[m.source] || '';

    if (m.status === 'ready') {
      n.querySelector('.mcard__meta').innerHTML =
        `📏 <b>${m.real_size_cm}</b> sm &nbsp;|&nbsp; GLB ${fmtMB(m.glb_bytes)}` +
        ` &nbsp;|&nbsp; USDZ ${fmtMB(m.usdz_bytes)}` +
        (m.poly_count ? ` &nbsp;|&nbsp; ${m.poly_count.toLocaleString('ru-RU')} tri` : '');
      n.querySelector('.mcard__an').innerHTML =
        `👁 <b>${m.view_count}</b> ko'rish &nbsp;|&nbsp; ` +
        `📈 Konversiya <b>${m.convert_rate}%</b>`;
    } else if (['processing', 'queued'].includes(m.status)) {
      const pct = n.querySelector('.mcard__pct');
      pct.hidden = false;
      pct.textContent = (m.progress || 0) + '%';
      n.querySelector('.mcard__meta').textContent =
        m.stage_label || 'Navbatda kutmoqda…';
    } else if (m.status === 'failed') {
      const e = n.querySelector('.mcard__err');
      e.hidden = false;
      e.textContent = '⛔ ' + (m.error_msg || 'Noma\'lum xato');
    }

    const act = n.querySelector('.mcard__act');
    if (m.status === 'ready') {
      act.append(
        mkBtn('👁 Ko\'rish', () => view(m)),
        mkBtn('🔄 Almashtirish', () => openGen(m)),
        mkBtn('📏 O\'lcham', () => changeSize(m)),
      );
    } else if (m.status === 'failed' || m.status === 'none') {
      act.append(
        mkBtn('📚 Kutubxonadan', () => openLib(m), 'pri'),
        mkBtn('🤖 AI yaratish', () => openGen(m), 'pri'),
        mkBtn('📤 Yuklash', () => upload(m)),
      );
    }
    return n;
  }

  function mkBtn(text, fn, kind) {
    const b = document.createElement('button');
    b.className = 'btn btn--sm' + (kind ? ' btn--' + kind : '');
    b.textContent = text;
    b.onclick = fn;
    return b;
  }

  // ---- 👁 Ko'rish (model-viewer bilan) ----
  async function view(m) {
    target = m;
    $('viewName').textContent = m.dish_name;
    $('viewNote').innerHTML =
      `⚡ AR o'lchami: <b>${m.real_size_cm} sm</b> = <b>${(m.real_size_cm/100).toFixed(2)} m</b>`;
    $('viewStage').innerHTML =
      `<model-viewer src="${m.glb}" ${m.usdz ? `ios-src="${m.usdz}"` : ''}
        poster="${m.poster || ''}" camera-controls auto-rotate
        ar ar-modes="webxr scene-viewer quick-look"
        ar-scale="fixed" ar-placement="floor"
        shadow-intensity="1" environment-image="neutral"
        style="width:100%;height:420px"></model-viewer>`;
    if (!window.__mvLoaded) {
      const s = document.createElement('script');
      s.type = 'module';
      s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
      document.head.appendChild(s);
      window.__mvLoaded = true;
    }
    show('viewModal');
  }

  // ---- 🤖 AI yaratish ----
  function openGen(m) {
    target = m;
    $('genSize').value = m.real_size_cm || 25;
    $('genPrev').innerHTML = '';
    $('genImages').value = '';
    show('genModal');
  }

  $('genImages').onchange = () => {
    const box = $('genPrev');
    box.innerHTML = '';
    [...$('genImages').files].slice(0, 6).forEach(f => {
      const i = document.createElement('img');
      i.src = URL.createObjectURL(f);
      box.appendChild(i);
    });
  };

  document.querySelectorAll('.a-modal__quick button').forEach(b => {
    b.onclick = () => { $('genSize').value = b.dataset.size; };
  });

  $('genGo').onclick = async () => {
    const btn = $('genGo');
    btn.disabled = true;
    btn.textContent = '⏳ Navbatga qo\'yilmoqda…';
    try {
      const files = $('genImages').files;
      let r;
      if (files.length) {
        const fd = new FormData();
        fd.append('dish_id', target.dish_id);
        fd.append('real_size_cm', $('genSize').value);
        fd.append('prefer_library', $('genLib').checked);
        [...files].slice(0, 6).forEach(f => fd.append('images', f));
        r = await fetch('/v1/admin/ar/generate/', {
          method: 'POST', body: fd,
          headers: authHeaders(),
        });
      } else {
        r = await fetch('/v1/admin/ar/generate/', {
          method: 'POST', headers: H(),
          body: JSON.stringify({dish_id: target.dish_id,
                                real_size_cm: Number($('genSize').value),
                                prefer_library: $('genLib').checked}),
        });
      }
      const j = await r.json();
      if (!r.ok) { alert(j.error ? j.error.message_uz : 'Xato'); return; }
      hide('genModal');
      alert('✅ ' + (j.message || 'Navbatga qo\'yildi'));
      load();
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 Yaratish';
    }
  };

  // ---- 📚 Kutubxona ----
  function openLib(m) {
    target = m;
    $('libQ').value = m.dish_name;
    show('libModal');
    searchLib();
  }
  let libT;
  $('libQ').oninput = () => { clearTimeout(libT); libT = setTimeout(searchLib, 350); };

  async function searchLib() {
    const q = $('libQ').value.trim();
    const box = $('libRes');
    box.innerHTML = '⏳';
    const r = await fetch('/v1/admin/ar/library/search/?q=' + encodeURIComponent(q),
                          {headers: H()});
    const j = await r.json();
    box.innerHTML = '';
    if (!j.results.length) { box.textContent = 'Topilmadi'; return; }
    j.results.forEach(x => {
      const d = document.createElement('div');
      d.className = 'libitem';
      d.innerHTML =
        `<img src="${x.poster || ''}" alt="">
         <div><b>${x.name}</b><br><small>📏 ${x.real_size_cm} sm · ` +
        `⭐ ${x.quality}/5 · 🏪 ${x.used_by} restoran` +
        (x.confidence ? ` · 🎯 ${Math.round(x.confidence*100)}%` : '') + `</small></div>`;
      const b = mkBtn('Tanlash', async () => {
        b.disabled = true;
        const r2 = await fetch('/v1/admin/ar/library/use/', {
          method: 'POST', headers: H(),
          body: JSON.stringify({dish_id: target.dish_id, library_id: x.id,
                                real_size_cm: x.real_size_cm}),
        });
        if (r2.ok) { hide('libModal'); load(); }
        else b.disabled = false;
      }, 'pri');
      d.appendChild(b);
      box.appendChild(d);
    });
  }

  // ---- 📏 O'lcham o'zgartirish ----
  async function changeSize(m) {
    const v = prompt(`"${m.dish_name}" real o'lchami (sm):\n` +
                     `⚡ AR aniqligi shunga bog'liq!`, m.real_size_cm);
    if (!v) return;
    const size = parseFloat(v);
    if (!(size >= 3 && size <= 200)) { alert("3-200 sm oralig'ida"); return; }
    const r = await fetch('/v1/admin/ar/generate/', {
      method: 'POST', headers: H(),
      body: JSON.stringify({dish_id: m.dish_id, real_size_cm: size,
                            prefer_library: false, images: [m.glb]}),
    });
    if (r.ok) { alert('⏳ Qayta masshtablanmoqda…'); load(); }
  }

  // ---- 📤 Qo'lda yuklash ----
  function upload(m) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.glb';
    inp.onchange = async () => {
      const size = prompt("Taomning real o'lchami (sm):", '25');
      if (!size) return;
      const fd = new FormData();
      fd.append('dish_id', m.dish_id);
      fd.append('real_size_cm', size);
      fd.append('glb', inp.files[0]);
      const r = await fetch('/v1/admin/ar/upload/', {
        method: 'POST', body: fd,
        headers: authHeaders(),
      });
      const j = await r.json();
      if (r.ok) { alert(`✅ Yuklandi: ${j.glb_mb} MB, ${j.scale_m} m`); load(); }
      else alert(j.error ? j.error.message_uz : 'Xato');
    };
    inp.click();
  }

  // ---- Modal yordamchilari ----
  function show(id) { $(id).hidden = false; }
  function hide(id) { $(id).hidden = true; }
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]') || e.target.classList.contains('a-modal')) {
      document.querySelectorAll('.a-modal').forEach(m => m.hidden = true);
    }
  });
  $('fSearch').oninput = render;
  $('fStatus').onchange = render;

  // ---- ⚡ WS: jonli progress ----
  new ReliableWS(A.wsUrl, {
    'model3d.progress': (m) => {
      const x = models.find(o => o.dish_id === m.data.dish_id);
      if (!x) return;
      x.status = 'processing';
      x.progress = m.data.progress;
      x.stage_label = m.data.stage_label;
      render();
    },
    'model3d.ready': (m) => { load(); },
    'model3d.failed': (m) => { load(); },
  });

  load();
  setInterval(load, 30000);     // zaxira poll
})();