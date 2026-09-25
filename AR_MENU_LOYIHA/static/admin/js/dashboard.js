/**
 * Admin Dashboard JS — 5 ta KPI kartochkasi, Canvas soatlik grafik, top taomlar va diqqat paneli.
 * Pure HTML5 Canvas 2D (kutubxonasiz) + DRF /v1/analytics/dashboard/ API.
 */
(function() {
  'use strict';

  // ---- Element references ----
  const els = {
    revVal: document.getElementById('k-rev'),
    revDlt: document.getElementById('d-rev'),
    ordVal: document.getElementById('k-ord'),
    ordDlt: document.getElementById('d-ord'),
    avgVal: document.getElementById('k-avg'),
    avgDlt: document.getElementById('d-avg'),
    tblVal: document.getElementById('k-tbl'),
    tblDlt: document.getElementById('d-tbl'),
    arVal: document.getElementById('k-ar'),
    arDlt: document.getElementById('d-ar'),
    chartCanvas: document.getElementById('ch-hourly'),
    topDishes: document.getElementById('top-dishes') || document.getElementById('top-tbody'),
    attnList: document.getElementById('attn') || document.getElementById('att-feed'),
    liveFeed: document.getElementById('feed'),
  };

  function fmtMoney(num) {
    return Number(num || 0).toLocaleString('uz-UZ') + ' UZS';
  }

  function renderDelta(el, delta, unit = '%') {
    if (!el) return;
    if (delta === null || delta === undefined) {
      el.textContent = '—';
      el.className = 'dlt muted';
      return;
    }
    const sign = delta > 0 ? '+' : '';
    el.textContent = `${sign}${delta}${unit} kechagiga nisbatan`;
    el.className = `dlt ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'muted'}`;
  }

  // ---- Render KPIs ----
  function renderKPIs(kpis) {
    if (!kpis) return;

    // Revenue
    if (els.revVal) els.revVal.textContent = fmtMoney(kpis.revenue?.value);
    renderDelta(els.revDlt, kpis.revenue?.delta);

    // Orders
    if (els.ordVal) els.ordVal.textContent = (kpis.orders?.value ?? 0).toLocaleString();
    renderDelta(els.ordDlt, kpis.orders?.delta);

    // Avg check
    if (els.avgVal) els.avgVal.textContent = fmtMoney(kpis.avg_check?.value);
    renderDelta(els.avgDlt, kpis.avg_check?.delta);

    // Tables
    if (els.tblVal) els.tblVal.textContent = `${kpis.tables?.value ?? 0} / ${kpis.tables?.total ?? 0}`;
    if (els.tblDlt) {
      const pct = kpis.tables?.pct ?? 0;
      els.tblDlt.textContent = `${pct}% band (${kpis.tables?.value ?? 0}/${kpis.tables?.total ?? 0})`;
      els.tblDlt.className = 'dlt muted';
    }

    // AR Views
    if (els.arVal) els.arVal.textContent = (kpis.ar_views?.value ?? 0).toLocaleString();
    renderDelta(els.arDlt, kpis.ar_views?.delta);
  }

  // ---- Pure HTML5 Canvas 2D Chart ----
  function drawHourlyChart(canvas, hourlyData) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (canvas.width || 500);
    const h = rect.height > 0 ? rect.height : (canvas.height || 140);

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const labels = (hourlyData && hourlyData.labels) || [];
    const revenue = (hourlyData && hourlyData.revenue) || [];
    const n = labels.length;

    ctx.clearRect(0, 0, w, h);

    if (n === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText("Ma'lumot mavjud emas", w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...revenue, 10000);
    const padLeft = 45;
    const padRight = 15;
    const padTop = 20;
    const padBottom = 25;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid lines (3 horizontal lines)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.6;
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 3; i++) {
      const y = padTop + (plotH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      const val = Math.round(maxVal - (maxVal / 3) * i);
      const valText = val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${Math.round(val / 1000)}k`;
      ctx.fillText(valText, padLeft - 6, y + 3);
    }

    // Bars
    const barWidth = Math.max(4, Math.min(24, (plotW / n) * 0.6));
    const step = plotW / n;

    for (let i = 0; i < n; i++) {
      const x = padLeft + i * step + (step - barWidth) / 2;
      const val = revenue[i] || 0;
      const barH = (val / maxVal) * plotH;
      const y = padTop + plotH - barH;

      // Bar fill gradient
      const grad = ctx.createLinearGradient(0, y, 0, padTop + plotH);
      grad.addColorStop(0, '#3B82F6');
      grad.addColorStop(1, '#1D4ED8');

      ctx.fillStyle = grad;
      ctx.beginPath();
      const r = Math.min(3, barWidth / 2);
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, [r, r, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barH);
      }
      ctx.fill();

      // Labels (show every 2-3 hours)
      if (i % 2 === 0 || i === n - 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i] || '', x + barWidth / 2, h - 8);
      }
    }
  }

  // ---- Top Dishes Table ----
  function renderTopDishes(tbody, dishes) {
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!dishes || dishes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="muted" style="text-align:center;padding:12px;">Ma\'lumot yo\'q</td></tr>';
      return;
    }

    dishes.forEach((d, idx) => {
      const tr = document.createElement('tr');
      const name = d.name_uz || d.name_ru || d.name_en || `Taom #${d.dish_id}`;
      tr.innerHTML = `
        <td style="padding:6px 0;"><strong>${idx + 1}. ${name}</strong></td>
        <td style="padding:6px 0; text-align:right;">${d.qty} ta</td>
        <td style="padding:6px 0; text-align:right; font-weight:600; color:var(--success,#22c55e);">${fmtMoney(d.total)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ---- Attention Feed ----
  function renderAttention(el, items) {
    if (!el) return;
    el.innerHTML = '';
    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = "Hozircha diqqat talab qiluvchi holat yo'q ✓";
      el.appendChild(li);
      return;
    }

    items.forEach(it => {
      const li = document.createElement('li');
      li.className = it.level === 'danger' ? 'danger' : 'warning';

      let msg = '';
      if (it.kind === 'sold_out') {
        msg = `🛑 Stop-list: "${it.params?.dish || 'Taom'}" tugagan`;
      } else if (it.kind === 'call_late') {
        msg = `🔔 Stol ${it.params?.table || '—'}: ${it.params?.min || 0} daqiqadan beri chaqiruv kutmoqda!`;
      } else {
        msg = `⚠️ ${it.text_key || it.kind || 'Diqqat holati'}`;
      }
      li.textContent = msg;
      el.appendChild(li);
    });
  }

  // ---- Main fetch function ----
  function fetchDashboard() {
    const headers = { 'Accept': 'application/json' };
    const token = localStorage.getItem('armenu_staff_token');
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    fetch('/v1/analytics/dashboard/', {
      headers: headers,
      credentials: 'same-origin',
    })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      renderKPIs(data.kpis);
      drawHourlyChart(els.chartCanvas, data.hourly);
      renderTopDishes(els.topDishes, data.top_dishes);
      renderAttention(els.attnList, data.attention);
    })
    .catch(err => {
      console.warn('[Dashboard] Fetch error:', err);
    });
  }

  // Expose global for testing & re-render on resize
  window.refreshDashboard = fetchDashboard;
  window.addEventListener('resize', () => {
    if (els.chartCanvas && window.__lastHourlyData) {
      drawHourlyChart(els.chartCanvas, window.__lastHourlyData);
    }
  });

  // Init & periodic refresh (every 30s)
  fetchDashboard();
  setInterval(fetchDashboard, 30000);
})();
