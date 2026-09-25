/* Bildirishnoma va bottom-sheet modal */
function toast(text, kind = 'info', ms = 3000) {
  const root = document.getElementById('toastRoot');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = `<div class="toast__body"><div class="toast__text"></div></div>`;
  el.querySelector('.toast__text').textContent = text;
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

/* --- Bottom sheet --- */
let sheetEl = null;
let lastFocus = null;

function openSheet(html, onReady) {
  closeSheet();
  lastFocus = document.activeElement;

  const back = document.createElement('div');
  back.className = 'sheet-backdrop';
  back.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" tabindex="-1"></div>`;
  const sheet = back.querySelector('.sheet');
  sheet.innerHTML = html;

  back.addEventListener('click', e => { if (e.target === back) closeSheet(); });
  document.addEventListener('keydown', onSheetKey);

  document.getElementById('modalRoot').appendChild(back);
  document.body.style.overflow = 'hidden';
  sheetEl = back;
  sheet.focus();
  if (typeof onReady === 'function') onReady(sheet);
  applyI18n(sheet);
  return sheet;
}

function closeSheet() {
  if (!sheetEl) return;
  sheetEl.remove();
  sheetEl = null;
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onSheetKey);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function onSheetKey(e) {
  if (e.key === 'Escape') closeSheet();
}