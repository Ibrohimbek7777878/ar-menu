/* hall-editor.js — Admin hall rejasini tahrirlash (drag & drop, metr grid) */
(function() {
  'use strict';

  const GRID_SIZE = 20; // 20px = 1 metr
  let canvas, ctx;
  let tables = [];
  let selectedTable = null;
  let dragOffset = {x: 0, y: 0};
  let isDragging = false;

  function init(containerId, planData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    canvas = document.createElement('canvas');
    canvas.width = container.offsetWidth || 800;
    canvas.height = container.offsetHeight || 600;
    canvas.style.cssText = 'border:1px solid #333;cursor:crosshair;';
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Plan ma'lumotlarini yuklash
    if (planData && planData.tables) {
      tables = planData.tables.map(t => ({
        id: t.id,
        x: t.x * GRID_SIZE,
        y: t.y * GRID_SIZE,
        w: (t.width || 1) * GRID_SIZE,
        h: (t.height || 1) * GRID_SIZE,
        number: t.number,
        status: t.status || 'available',
      }));
    }

    draw();
    bindEvents();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#1e2742';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Stollar
    const colors = {
      available: '#22c55e',
      ordering: '#3b82f6',
      waiting: '#eab308',
      ready: '#22c55e',
      occupied: '#f97316',
      cleaning: '#8b5cf6',
    };

    tables.forEach(t => {
      ctx.fillStyle = colors[t.status] || '#4b5563';
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.strokeStyle = selectedTable && selectedTable.id === t.id ? '#fff' : '#374151';
      ctx.lineWidth = selectedTable && selectedTable.id === t.id ? 2 : 1;
      ctx.strokeRect(t.x, t.y, t.w, t.h);

      // Raqam
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.number || '', t.x + t.w / 2, t.y + t.h / 2);
    });
  }

  function bindEvents() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
  }

  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Stol topish
    selectedTable = null;
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
        selectedTable = t;
        isDragging = true;
        dragOffset.x = mx - t.x;
        dragOffset.y = my - t.y;
        break;
      }
    }
    draw();
  }

  function onMouseMove(e) {
    if (!isDragging || !selectedTable) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    selectedTable.x = Math.round((mx - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
    selectedTable.y = Math.round((my - dragOffset.y) / GRID_SIZE) * GRID_SIZE;
    draw();
  }

  function onMouseUp() {
    isDragging = false;
  }

  function onDblClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Stol topish — tahrirlash
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i];
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
        const num = prompt('Stol raqami:', t.number || '');
        if (num !== null) t.number = num;
        draw();
        return;
      }
    }

    // Yangi stol qo'shish
    const num = prompt('Yangi stol raqami:');
    if (num) {
      tables.push({
        id: Date.now(),
        x: Math.round(mx / GRID_SIZE) * GRID_SIZE,
        y: Math.round(my / GRID_SIZE) * GRID_SIZE,
        w: GRID_SIZE * 2,
        h: GRID_SIZE * 2,
        number: num,
        status: 'available',
      });
      draw();
    }
  }

  function addTable() {
    const num = prompt('Stol raqami:');
    if (!num) return;
    tables.push({
      id: Date.now(),
      x: GRID_SIZE * 2,
      y: GRID_SIZE * 2,
      w: GRID_SIZE * 2,
      h: GRID_SIZE * 2,
      number: num,
      status: 'available',
    });
    draw();
  }

  function deleteTable() {
    if (!selectedTable) return;
    tables = tables.filter(t => t.id !== selectedTable.id);
    selectedTable = null;
    draw();
  }

  function getPlanData() {
    return {
      tables: tables.map(t => ({
        id: t.id,
        x: t.x / GRID_SIZE,
        y: t.y / GRID_SIZE,
        width: t.w / GRID_SIZE,
        height: t.h / GRID_SIZE,
        number: t.number,
        status: t.status,
      })),
      width: canvas.width / GRID_SIZE,
      height: canvas.height / GRID_SIZE,
    };
  }

  function savePlan(planId) {
    const data = getPlanData();
    const token = localStorage.getItem('armenu_admin_token') || localStorage.getItem('token') || '';
    const headers = {'Content-Type': 'application/json'};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const url = planId ? `/v1/admin/floorplans/${planId}/` : `/v1/admin/floorplans/`;
    const method = planId ? 'PATCH' : 'POST';

    return fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify({ plan_json: data }),
    }).then(r => r.json());
  }

  // Global
  window.HallEditor = {init, addTable, deleteTable, getPlanData, savePlan, draw};
})();
