/* ============================================
   DompetKu — toast.js
   Lightweight toast notification.
   Usage: Toast.show('Saved', { type: 'success' });
   ============================================ */

(function (global) {
  'use strict';

  let container = null;
  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
    return container;
  }

  const ICONS = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/><circle cx="12" cy="12" r="10"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };

  function show(message, options = {}) {
    const { type = 'info', duration = 2600 } = options;
    const wrap = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${ICONS[type] || ICONS.info}</span><span class="toast-msg"></span>`;
    toast.querySelector('.toast-msg').textContent = message;
    wrap.appendChild(toast);
    // Trigger entrance animation
    requestAnimationFrame(() => toast.classList.add('show'));
    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 250);
    }, duration);
    return toast;
  }

  global.Toast = { show, success: (m, o) => show(m, { ...o, type: 'success' }),
    error: (m, o) => show(m, { ...o, type: 'error' }),
    info: (m, o) => show(m, { ...o, type: 'info' }),
    warning: (m, o) => show(m, { ...o, type: 'warning' }) };
})(window);
