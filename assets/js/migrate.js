/* ============================================
   DomKu — migrate.js
   Migration dialog: when user logs in and has local data,
   ask what to do with it.
   Options: Merge to cloud / Replace cloud / Ignore
   ============================================ */

(function (global) {
  'use strict';

  const Migrate = {
    /** Check if migration is needed. Call after login + wallet set. */
    async checkAndPrompt() {
      // Only prompt if user has local data
      const hasLocal = await DB.hasLocalData();
      if (!hasLocal) return false;

      // Check if cloud already has data (so we know if it's a fresh wallet)
      let cloudHasData = false;
      if (Firebase.isConfigured() && Firebase.isOnline()) {
        try {
          const snap = await Firebase.getDocs(Firebase.collection(Firebase.db, 'wallets', DB.getWallet(), 'transactions'));
          cloudHasData = snap.size > 0;
        } catch (e) {}
      }

      await this.showDialog(cloudHasData);
      return true;
    },

    async showDialog(cloudHasData) {
      return new Promise((resolve) => {
        const content = `
          <div class="modal-head">
            <h3 class="modal-title">Data Lokal Ditemukan</h3>
          </div>
          <p class="modal-text">
            Kami menemukan data keuangan Anda yang tersimpan lokal di perangkat ini.
            Apakah Anda ingin memindahkannya ke cloud?
          </p>
          <div class="migrate-options">
            <button class="migrate-option" data-act="merge">
              <div class="migrate-option-icon" style="background:var(--success-light);color:var(--success)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div class="migrate-option-body">
                <strong>Gabungkan ke Cloud</strong>
                <small>Tambahkan data lokal ke cloud. Data cloud yang sudah ada tidak dihapus.</small>
              </div>
            </button>
            ${cloudHasData ? `
            <button class="migrate-option" data-act="replace">
              <div class="migrate-option-icon" style="background:var(--warning-light);color:var(--warning)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </div>
              <div class="migrate-option-body">
                <strong>Ganti Data Cloud</strong>
                <small>Hapus semua data cloud, ganti dengan data lokal. Tidak bisa dibatalkan!</small>
              </div>
            </button>` : ''}
            <button class="migrate-option" data-act="ignore">
              <div class="migrate-option-icon" style="background:var(--bg-soft);color:var(--text-muted)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
              <div class="migrate-option-body">
                <strong>Abaikan</strong>
                <small>Pakai data cloud saja. Data lokal akan dihapus dari perangkat ini.</small>
              </div>
            </button>
          </div>`;

        const { close } = Modal.open(content, { size: 'md' });
        const overlay = document.querySelector('.modal-overlay:last-child');

        overlay.querySelectorAll('[data-act]').forEach((btn) => {
          btn.onclick = async () => {
            const act = btn.dataset.act;
            close();
            await this.execute(act, cloudHasData);
            resolve();
          };
        });
      });
    },

    async execute(action, cloudHasData) {
      const localData = await DB.getLocalData();
      const stores = Object.keys(localData).filter((s) => s !== 'pendingOps' && s !== 'auditLogs');

      if (action === 'merge') {
        Toast.info('Menggabungkan data ke cloud...', 3000);
        for (const store of stores) {
          const items = localData[store];
          if (items && items.length > 0) {
            await DB.bulkPut(store, items);
          }
        }
        await DB.wipeLocal();
        Toast.success('Data lokal berhasil digabung ke cloud');
        Router.refresh();
      } else if (action === 'replace') {
        if (!await Modal.confirm('Yakin ganti SEMUA data cloud dengan data lokal? Data cloud saat ini akan dihapus permanen.', { danger: true, okText: 'Ya, Ganti', cancelText: 'Batal' })) return;
        Toast.info('Mengganti data cloud...', 3000);
        // Clear cloud first
        for (const store of stores) {
          await DB.clear(store);
        }
        // Then upload local
        for (const store of stores) {
          const items = localData[store];
          if (items && items.length > 0) {
            await DB.bulkPut(store, items);
          }
        }
        await DB.wipeLocal();
        Toast.success('Data cloud berhasil diganti');
        Router.refresh();
      } else if (action === 'ignore') {
        await DB.wipeLocal();
        Toast.info('Data lokal dihapus. Memakai data cloud.');
        Router.refresh();
      }
    }
  };

  global.Migrate = Migrate;
})(window);
