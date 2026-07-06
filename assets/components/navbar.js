/* ============================================
   DomKu — navbar.js (v2 — Firebase edition)
   Top app bar: brand, wallet switcher, sync indicator,
   theme toggle, notifications, user menu.
   UI stays the same; adds Firebase-aware elements.
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

      <div class="navbar-center" data-wallet-switcher></div>

      <div class="navbar-actions">
        <div class="sync-indicator" data-sync-indicator>
          <span class="dot"></span>Menunggu
        </div>
        <a href="#/notifications" class="icon-btn" aria-label="Notifikasi" title="Notifikasi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-badge hidden" data-notif-count>0</span>
        </a>
        <button class="icon-btn" data-action="quick-add" aria-label="Tambah transaksi" title="Tambah Cepat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="icon-btn" data-action="toggle-theme" aria-label="Ganti tema">
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </button>
        <div class="user-menu hidden" data-user-menu>
          <div class="user-avatar" data-user-avatar>?</div>
          <span class="user-name" data-user-name></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>
          <div class="user-dropdown">
            <div class="user-dropdown-header">
              <strong data-dd-name></strong>
              <small data-dd-email></small>
            </div>
            <a href="#/wallet" class="user-dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 12V7H5a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg>
              Wallet Saya
            </a>
            <a href="#/audit" class="user-dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
              Riwayat Aktivitas
            </a>
            <a href="#/settings-page" class="user-dropdown-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Pengaturan
            </a>
            <div class="user-dropdown-divider"></div>
            <button class="user-dropdown-item danger" data-action="logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Keluar
            </button>
          </div>
        </div>
      </div>`;

    // Bind user menu toggle
    const userMenu = navbar.querySelector('[data-user-menu]');
    userMenu.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      userMenu.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-user-menu]')) userMenu.classList.remove('open');
    });

    // Render wallet switcher
    setTimeout(() => renderWalletSwitcher(navbar), 100);

    return navbar;
  }

  function renderWalletSwitcher(navbar) {
    const mount = navbar.querySelector('[data-wallet-switcher]');
    if (!mount) return;
    if (!Firebase.isConfigured() || !AuthFB.isLoggedIn) {
      mount.innerHTML = '';
      return;
    }
    const wallet = Wallet.getCurrent();
    if (!wallet) {
      mount.innerHTML = '';
      return;
    }
    mount.innerHTML = `
      <a href="#/wallet" class="wallet-switcher" title="Ganti wallet">
        <span class="wallet-switcher-icon">${wallet.emoji || '💰'}</span>
        <span class="wallet-switcher-info">
          <span class="wallet-switcher-label">${wallet.type === 'couple' ? 'Wallet Bersama' : 'Wallet Pribadi'}</span>
          <span class="wallet-switcher-name">${Utils.escapeHtml(wallet.name)}</span>
        </span>
        ${wallet.type === 'couple' ? '<span class="wallet-switcher-badge">' + Object.keys(wallet.members || {}).length + ' anggota</span>' : ''}
      </a>`;
  }

  function refresh() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    const userMenu = navbar.querySelector('[data-user-menu]');
    const avatar = navbar.querySelector('[data-user-avatar]');
    const name = navbar.querySelector('[data-user-name]');
    const ddName = navbar.querySelector('[data-dd-name]');
    const ddEmail = navbar.querySelector('[data-dd-email]');

    if (AuthFB.isLoggedIn) {
      const user = AuthFB.currentUser;
      userMenu.classList.remove('hidden');
      const displayName = user.displayName || user.email?.split('@')[0] || 'User';
      name.textContent = displayName.split(' ')[0];
      ddName.textContent = displayName;
      ddEmail.textContent = user.email || '';
      if (user.photoURL) {
        avatar.innerHTML = `<img src="${user.photoURL}" alt="${Utils.escapeHtml(displayName)}">`;
      } else {
        avatar.textContent = displayName.charAt(0).toUpperCase();
      }
    } else {
      userMenu.classList.add('hidden');
    }
    renderWalletSwitcher(navbar);
  }

  // Listen to auth + wallet changes
  document.addEventListener('dompetku:auth', () => refresh());
  document.addEventListener('dompetku:wallet-change', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) renderWalletSwitcher(navbar);
  });

  global.Navbar = { render, refresh };
})(window);
