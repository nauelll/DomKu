/* ============================================
   DompetKu — assets.js
   Asset list grouped by type, total net worth.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('assets', async (container) => {
    const currency = Settings.get('currency');
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Aset</h1><p class="muted">Kelola seluruh aset Anda</p></div>
          <button class="btn btn-primary btn-sm" data-act="add">+ Tambah Aset</button>
        </header>
        <div data-stats class="stat-grid"></div>
        <div data-list></div>
      </div>`;

    const statsEl = container.querySelector('[data-stats]');
    const listEl = container.querySelector('[data-list]');

    async function load() {
      const assets = await DB.getAll('assets');
      const totalValue = Utils.sumBy(assets, (a) => a.value);
      const grouped = Utils.groupBy(assets, (a) => a.type);
      const cats = Seed.DEFAULT_ASSET_CATEGORIES;

      statsEl.innerHTML = `
        <div class="stat-card stat-success"><div class="stat-icon">💎</div><div class="stat-info"><div class="stat-label">Total Nilai Aset</div><div class="stat-value">${Utils.formatCurrency(totalValue, currency)}</div></div></div>
        <div class="stat-card stat-info"><div class="stat-icon">📊</div><div class="stat-info"><div class="stat-label">Jenis Aset</div><div class="stat-value">${Object.keys(grouped).length}</div></div></div>
        <div class="stat-card stat-warning"><div class="stat-icon">📦</div><div class="stat-info"><div class="stat-label">Total Item</div><div class="stat-value">${assets.length}</div></div></div>`;

      if (!assets.length) {
        listEl.innerHTML = `<div class="empty-state"><h3>Belum ada aset</h3><p>Tambahkan uang tunai, rekening bank, e-wallet, emas, kendaraan, dll.</p></div>`;
        return;
      }

      listEl.innerHTML = cats.map((cat) => {
        const items = grouped[cat.id] || [];
        if (!items.length) return '';
        const subtotal = Utils.sumBy(items, (a) => a.value);
        return `
          <div class="card asset-group">
            <div class="card-head">
              <h3>${cat.icon} ${cat.name}</h3>
              <span class="muted">${Utils.formatCurrency(subtotal, currency)}</span>
            </div>
            <div class="asset-list">
              ${items.map((a) => `
                <div class="asset-item">
                  <div class="asset-info">
                    <div class="asset-name">${Utils.escapeHtml(a.name)}</div>
                    ${a.note ? `<div class="muted small">${Utils.escapeHtml(a.note)}</div>` : ''}
                  </div>
                  <div class="asset-value">${Utils.formatCurrency(a.value, currency)}</div>
                  <div class="tx-actions">
                    <button class="icon-btn sm" data-edit="${a.id}" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="icon-btn sm" data-del="${a.id}" aria-label="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
                  </div>
                </div>`).join('')}
            </div>
          </div>`;
      }).join('');

      listEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
        const a = await DB.get('assets', b.dataset.edit);
        AssetForm.open({ edit: a, onSaved: () => load() });
      });
      listEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (await Modal.confirm('Hapus aset ini?', { danger: true, okText: 'Hapus' })) {
          await DB.remove('assets', b.dataset.del);
          Toast.success('Aset dihapus');
          load();
        }
      });
    }

    container.querySelector('[data-act="add"]').onclick = () => AssetForm.open({ onSaved: () => load() });
    await load();
  });
})(window);
