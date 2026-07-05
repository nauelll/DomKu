/* ============================================
   DompetKu — navbar.js
   Top app bar: brand, theme toggle, quick actions.
   ============================================ */

(function (global) {
  'use strict';

  function render() {
    const navbar = document.createElement('header');
    navbar.className = 'navbar';
    navbar.innerHTML = `
      <button class="icon-btn menu-toggle" aria-label="Buka menu" data-action="toggle-sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <a href="#/dashboard" class="brand">
        <img src="assets/images/logo-square.png" alt="DomKu" class="brand-mark-img">
        <span class="brand-name"><span style="color:#3B82F6">Dom</span><span style="color:#10B981">Ku</span></span>
      </a>
      <div class="navbar-actions">
        <button class="icon-btn" data-action="quick-add" aria-label="Tambah transaksi" title="Tambah Cepat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="icon-btn" data-action="toggle-theme" aria-label="Ganti tema">
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <button class="icon-btn" data-action="lock" aria-label="Kunci aplikasi" title="Kunci">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>
      </div>`;
    return navbar;
  }

  global.Navbar = { render };
})(window);
