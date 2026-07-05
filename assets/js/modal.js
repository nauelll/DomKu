/* ============================================
   DompetKu — modal.js
   Promise-based modal & confirm dialogs.
   ============================================ */

(function (global) {
  'use strict';

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal-close" aria-label="Tutup">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="modal-body"></div>
      </div>`;
    return overlay;
  }

  /**
   * Open a modal with custom HTML content.
   * Returns the overlay element. Call Modal.close(overlay) to dismiss.
   */
  function open(content, options = {}) {
    const { size = 'md', onClose } = options;
    const overlay = createOverlay();
    overlay.querySelector('.modal').classList.add(`modal-${size}`);
    const body = overlay.querySelector('.modal-body');
    if (typeof content === 'string') body.innerHTML = content;
    else body.appendChild(content);

    const close = (result) => {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        if (typeof onClose === 'function') onClose(result);
      }, 200);
    };
    overlay.querySelector('.modal-close').onclick = () => close(null);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(null); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('show'));
    return { overlay, close, body };
  }

  /** Simple confirm dialog. Resolves to true/false. */
  function confirm(message, options = {}) {
    const { title = 'Konfirmasi', okText = 'OK', cancelText = 'Batal', danger = false } = options;
    return new Promise((resolve) => {
      const content = `
        <div class="modal-head">
          <h3 class="modal-title">${Utils.escapeHtml(title)}</h3>
        </div>
        <p class="modal-text">${Utils.escapeHtml(message)}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-act="cancel">${Utils.escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${Utils.escapeHtml(okText)}</button>
        </div>`;
      const { close } = open(content, { size: 'sm' });
      const overlay = document.querySelector('.modal-overlay:last-child');
      overlay.querySelector('[data-act="cancel"]').onclick = () => { close(); resolve(false); };
      overlay.querySelector('[data-act="ok"]').onclick = () => { close(); resolve(true); };
    });
  }

  /** Alert dialog (single button). */
  function alert(message, options = {}) {
    const { title = 'Informasi', okText = 'OK' } = options;
    return new Promise((resolve) => {
      const content = `
        <div class="modal-head"><h3 class="modal-title">${Utils.escapeHtml(title)}</h3></div>
        <p class="modal-text">${Utils.escapeHtml(message)}</p>
        <div class="modal-actions"><button class="btn btn-primary" data-act="ok">${Utils.escapeHtml(okText)}</button></div>`;
      const { close } = open(content, { size: 'sm' });
      const overlay = document.querySelector('.modal-overlay:last-child');
      overlay.querySelector('[data-act="ok"]').onclick = () => { close(); resolve(true); };
    });
  }

  global.Modal = { open, confirm, alert };
})(window);
