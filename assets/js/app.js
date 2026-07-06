/* ============================================
   DomKu — app.js (v2 — Firebase edition)
   Main entry point. Initializes:
   - DB (cache + Firestore abstraction)
   - Auth (Firebase Auth)
   - Wallet (current wallet context)
   - Sync (offline-first)
   - Notify (real-time notifications)
   - Migration dialog (local → cloud)
   Keeps UI/UX exactly the same.
   ============================================ */

(async function () {
  'use strict';

  // Wait for DOM
  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  }

  const appRoot = document.getElementById('app');

  // 1. Initialize DB cache + load settings
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

  // 3. Initialize Firebase Auth + Wallet + Sync + Notify
  if (window.Firebase && Firebase.isConfigured()) {
    AuthFB.init();
    Wallet.init();
    Sync.init();
    Notify.init();
  } else {
    console.warn('[DomKu] Firebase not configured — running offline-only mode');
    Toast.warning('Firebase belum dikonfigurasi. Aplikasi jalan mode offline.', 4000);
  }

  // 4. Build app shell (same UI as before)
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

  // 5. Bind global actions
  bindGlobalActions();
  injectFAB();

  // 6. Register not-found route
  Router.register('not-found', (c) => {
    c.innerHTML = `<div class="empty-state"><h2>404</h2><p>Halaman tidak ditemukan.</p><a href="#/dashboard" class="btn btn-primary">Kembali ke Dashboard</a></div>`;
  });

  // 7. Auth-aware routing: set a before-hook that runs before each route render.
  // Pages register themselves via Router.register; we don't override them.
  Router.before(async (path, params) => {
    // If Firebase not configured (offline-only mode), allow all routes
    if (!Firebase.isConfigured()) return true;

    // Auth guard: if not logged in, redirect to login (except login route)
    if (!AuthFB.isLoggedIn) {
      if (path !== 'login') {
        location.hash = '#/login';
        return false;
      }
      return true;
    }

    // Wallet guard: if logged in but no wallet, redirect to wallet (except allowed routes)
    if (!Wallet.getCurrent()) {
      const noWalletRoutes = ['login', 'wallet', 'not-found'];
      if (!noWalletRoutes.includes(path)) {
        location.hash = '#/wallet';
        return false;
      }
    }

    return true;
  });

  Router.start(document.getElementById('pageMount'));

  // 8. Auth state changes: refresh navbar + redirect appropriately
  document.addEventListener('dompetku:auth', async (e) => {
    Navbar.refresh?.();
    if (e.detail.user) {
      // Logged in
      // Check if user has a wallet; if not, create personal wallet
      const wallets = await Wallet.list();
      if (wallets.length === 0) {
        try {
          await Wallet.create('Wallet Pribadi', 'personal', '💰');
        } catch (e) {
          console.warn('[App] Failed to create default wallet:', e);
        }
      } else if (!Wallet.getCurrent()) {
        await Wallet.setCurrent(wallets[0].id);
      }
      // Check for migration (only if has local data + wallet set)
      if (Wallet.getCurrent()) {
        setTimeout(() => Migrate.checkAndPrompt(), 800);
      }
      // If on login page, redirect to dashboard
      if (location.hash === '#/login' || location.hash === '') {
        Router.go('dashboard');
      }
    } else {
      // Logged out
      if (location.hash !== '#/login' && Firebase.isConfigured()) {
        Router.go('login');
      }
    }
  });

  // 9. Auto-lock on idle (kept from v1)
  ['click', 'keydown', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, () => Auth.pingActivity(), { passive: true });
  });

  // 10. Reminders (kept from v1)
  setTimeout(() => {
    Reminders.regenerateDebtReminders();
    Reminders.checkDueReminders();
  }, 2000);

  // 11. Refresh notifications count periodically
  if (window.Notify && Firebase.isConfigured()) {
    setTimeout(() => Notify.refreshUnreadCount(), 3000);
    setInterval(() => Notify.refreshUnreadCount(), 60000);
  }

  /* ---------- Helpers ---------- */

  function injectFAB() {
    if (window.innerWidth > 768) return;
    if (document.querySelector('.fab')) return;
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Tambah transaksi cepat');
    fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    fab.addEventListener('click', () => {
      const choice = confirm('OK = Tambah Pemasukan\nCancel = Tambah Pengeluaran');
      TransactionForm.open({ type: choice ? 'income' : 'expense', onSaved: () => Router.refresh() });
    });
    document.body.appendChild(fab);
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768) fab.style.display = 'none';
        else fab.style.display = 'flex';
      }, 150);
    });
  }

  function bindGlobalActions() {
    document.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const act = action.dataset.action;
      if (act === 'toggle-theme') Theme.toggle();
      else if (act === 'toggle-sidebar') {
        document.getElementById('appShell').classList.toggle('sidebar-open');
      } else if (act === 'quick-add') {
        const choice = confirm('OK = Pemasukan, Cancel = Pengeluaran');
        TransactionForm.open({ type: choice ? 'income' : 'expense', onSaved: () => Router.refresh() });
      } else if (act === 'lock') {
        Auth.lock();
      } else if (act === 'logout') {
        if (confirm('Yakin ingin keluar?')) AuthFB.signOut();
      }
    });

    document.getElementById('sidebarBackdrop').addEventListener('click', () => {
      document.getElementById('appShell').classList.remove('sidebar-open');
    });

    document.getElementById('sidebarMount').addEventListener('click', (e) => {
      if (e.target.closest('[data-nav]')) {
        document.getElementById('appShell').classList.remove('sidebar-open');
      }
    });
  }
})();
