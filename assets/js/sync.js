/* ============================================
   DomKu — sync.js
   Offline-first sync engine.
   - Listens to network state
   - Auto-syncs pending ops when online
   - Updates UI sync indicator
   - Retries failed syncs with exponential backoff
   ============================================ */

(function (global) {
  'use strict';

  let retryCount = 0;
  let retryTimer = null;
  let status = 'idle'; // 'idle' | 'syncing' | 'online' | 'offline' | 'error'

  const Sync = {
    init() {
      // Initial state
      status = Firebase.isOnline() ? 'online' : 'offline';
      this.updateIndicator();

      // Network change handler
      document.addEventListener('dompetku:network', (e) => {
        if (e.detail.online) {
          status = 'online';
          this.updateIndicator();
          Toast.info('Kembali online. Sinkronisasi data...', 1800);
          // Wait a bit for Firestore to reconnect
          setTimeout(() => this.syncNow(), 1500);
        } else {
          status = 'offline';
          this.updateIndicator();
          Toast.warning('Mode offline. Perubahan disimpan lokal.', 2200);
        }
      });

      // Sync status updates
      document.addEventListener('dompetku:sync', (e) => {
        if (e.detail.status === 'syncing') {
          status = 'syncing';
        } else if (e.detail.status === 'done') {
          status = 'online';
          retryCount = 0;
        } else if (e.detail.status === 'error') {
          status = 'error';
          this.scheduleRetry();
        }
        this.updateIndicator();
      });

      // Try sync on app focus (return to tab)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && Firebase.isOnline()) {
          this.syncNow();
        }
      });

      // Initial sync attempt
      setTimeout(() => this.syncNow(), 2000);
    },

    async syncNow() {
      if (!Firebase.isConfigured() || !Firebase.isOnline()) return;
      const hasPending = await DB.hasPending();
      if (hasPending) {
        await DB.syncPending();
      }
    },

    scheduleRetry() {
      if (retryTimer) clearTimeout(retryTimer);
      retryCount++;
      if (retryCount > 5) {
        console.warn('[Sync] Max retries reached, giving up');
        retryCount = 0;
        return;
      }
      // Exponential backoff: 2s, 4s, 8s, 16s, 32s
      const delay = Math.min(32000, 2000 * Math.pow(2, retryCount - 1));
      retryTimer = setTimeout(() => this.syncNow(), delay);
    },

    getStatus() { return status; },

    updateIndicator() {
      document.querySelectorAll('[data-sync-indicator]').forEach((el) => {
        const dot = el.querySelector('.dot') || document.createElement('span');
        dot.className = 'dot';
        el.className = 'sync-indicator';
        if (status === 'offline') {
          el.classList.add('offline');
          el.innerHTML = '<span class="dot"></span>Offline';
        } else if (status === 'syncing') {
          el.classList.add('syncing');
          el.innerHTML = '<span class="dot"></span>Menyinkron...';
        } else if (status === 'online') {
          el.classList.add('online');
          el.innerHTML = '<span class="dot"></span>Tersinkron';
        } else {
          el.innerHTML = '<span class="dot"></span>Menunggu';
        }
      });
    }
  };

  global.Sync = Sync;
})(window);
