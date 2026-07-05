/* ============================================
   DompetKu — sidebar.js
   Side navigation with links to all modules.
   Collapses to drawer on mobile.
   ============================================ */

(function (global) {
  'use strict';

  const NAV_ITEMS = [
    { path: 'dashboard',    label: 'Dashboard',    icon: 'home' },
    { path: 'transactions', label: 'Transaksi',    icon: 'exchange' },
    { path: 'debts',        label: 'Utang',        icon: 'credit-card' },
    { path: 'receivables',  label: 'Piutang',      icon: 'hand-coins' },
    { path: 'savings',      label: 'Tabungan',     icon: 'piggy-bank' },
    { path: 'assets',       label: 'Aset',         icon: 'gem' },
    { path: 'budgets',      label: 'Anggaran',     icon: 'target' },
    { path: 'reports',      label: 'Laporan',      icon: 'chart' },
    { path: 'calendar',     label: 'Kalender',     icon: 'calendar' },
    { path: 'search',       label: 'Pencarian',    icon: 'search' },
    { path: 'settings-page',label: 'Pengaturan',   icon: 'cog' }
  ];

  const ICONS = {
    'home': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    'exchange': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
    'hand-coins': '<path d="M11 15 8.5 12.5a2 2 0 0 0-2.83 0L4 14.17a2 2 0 0 0 0 2.83L7 20"/><path d="M16 16h6"/><path d="M16 20h6"/><path d="M16 12h4"/><path d="M2 14h4l3 3"/>',
    'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/>',
    'gem': '<polygon points="6 3 18 3 22 9 12 22 2 9"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="12" y1="22" x2="12" "9"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'chart': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'cog': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  };

  function render() {
    const aside = document.createElement('aside');
    aside.className = 'sidebar';
    aside.innerHTML = `
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map((item) => `
          <a href="#/${item.path}" class="nav-item" data-nav="${item.path}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[item.icon] || ICONS['home']}</svg>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="version-badge">v1.0 • Offline Ready</div>
      </div>`;
    return aside;
  }

  global.Sidebar = { render, NAV_ITEMS };
})(window);
