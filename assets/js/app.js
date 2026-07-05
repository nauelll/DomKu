/* ============================================
   DompetKu — app.js
   Main entry point. Initializes DB, settings, theme, auth,
   loads all page modules, starts router.
   ============================================ */

(async function () {
  'use strict';

  // Wait for DOM
  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  }

  // Hide app until ready
  const appRoot = document.getElementById('app');

  // 1. Initialize DB + load settings
  try {
    await DB.open();
    await Settings.load();
    await Seed.seedAll();
  } catch (e) {
    console.error('DB init failed:', e);
    appRoot.innerHTML = `
      <div style="padding:24px;text-align:center;color:#ef4444">
        <h2>Gagal memuat database</h2>
        <p>Browser Anda mungkin memblokir IndexedDB. Coba gunakan mode normal (bukan private/incognito).</p>
        <p style="font-family:monospace;font-size:12px;margin-top:16px">${e.message}</p>
      </div>`;
    return;
  }

  // 2. Initialize theme
  Theme.init();

  // 3. Build app shell
  appRoot.innerHTML = `
    <div class="app-shell" id="appShell">
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <div id="sidebarMount"></div>
      <div class="main-area">
        <div id="navbarMount"></div>
        <main id="pageMount" class="page-mount"></main>
      </div>
    </div>`;

  document.getElementById('sidebarMount').appendChild(Sidebar.render());
  document.getElementById('navbarMount').appendChild(Navbar.render());

  // 4. Bind global actions
  bindGlobalActions();

  // 5. Register routes (pages already self-register on load)
  Router.register('not-found', (c) => {
    c.innerHTML = `<div class="empty-state"><h2>404</h2><p>Halaman tidak ditemukan.</p><a href="#/dashboard" class="btn btn-primary">Kembali ke Dashboard</a></div>`;
  });

  Router.start(document.getElementById('pageMount'));

  // 6. Auto-lock on idle
  ['click', 'keydown', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, () => Auth.pingActivity(), { passive: true });
  });

  // 7. Initial reminder check (after 2 seconds to not block UI)
  setTimeout(() => {
    Reminders.regenerateDebtReminders();
    Reminders.checkDueReminders();
  }, 2000);

  // 8. Auto-backup on first visit each day
  if (Settings.get('autoBackup')) {
    const last = Settings.get('lastBackupAt');
    const today = Utils.todayISO();
    if (!last || !last.startsWith(today)) {
      // Only auto-backup if there's actual data
      DB.getAll('transactions').then((txs) => {
        if (txs.length > 0) {
          // Don't auto-trigger download — just update timestamp
          Settings.set('lastBackupAt', new Date().toISOString());
        }
      });
    }
  }

  /* ---------- Helpers ---------- */

  function bindGlobalActions() {
    document.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const act = action.dataset.action;
      if (act === 'toggle-theme') Theme.toggle();
      else if (act === 'toggle-sidebar') {
        document.getElementById('appShell').classList.toggle('sidebar-open');
      } else if (act === 'quick-add') {
        // Show a small menu
        const choice = confirm('OK = Pemasukan, Cancel = Pengeluaran');
        TransactionForm.open({ type: choice ? 'income' : 'expense', onSaved: () => Router.refresh() });
      } else if (act === 'lock') {
        Auth.lock();
      }
    });

    // Close sidebar when clicking outside on mobile
    document.getElementById('sidebarBackdrop').addEventListener('click', () => {
      document.getElementById('appShell').classList.remove('sidebar-open');
    });

    // Close sidebar on nav click (mobile)
    document.getElementById('sidebarMount').addEventListener('click', (e) => {
      if (e.target.closest('[data-nav]')) {
        document.getElementById('appShell').classList.remove('sidebar-open');
      }
    });
  }
})();
