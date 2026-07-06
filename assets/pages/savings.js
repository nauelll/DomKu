/* ============================================
   DompetKu — savings.js
   Savings goals grid with progress + transaction history.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('savings', async (container) => {
    const currency = Settings.get('currency');
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Tabungan</h1><p class="muted">Kelola target tabungan Anda</p></div>
          <button class="btn btn-primary btn-sm" data-act="add">+ Target Baru</button>
        </header>
        <div data-stats class="stat-grid"></div>
        <div data-grid class="saving-grid"></div>
      </div>`;

    const statsEl = container.querySelector('[data-stats]');
    const gridEl = container.querySelector('[data-grid]');

    async function load() {
      const savings = await DB.getAll('savings');
      const totalSaved = Utils.sumBy(savings, (s) => s.currentAmount);
      const totalTarget = Utils.sumBy(savings, (s) => s.targetAmount);
      const completed = savings.filter((s) => s.status === 'completed').length;

      statsEl.innerHTML = `
        <div class="stat-card stat-success"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-label">Total Tabungan</div><div class="stat-value">${Utils.formatCurrency(totalSaved, currency)}</div></div></div>
        <div class="stat-card stat-info"><div class="stat-icon">🎯</div><div class="stat-info"><div class="stat-label">Total Target</div><div class="stat-value">${Utils.formatCurrency(totalTarget, currency)}</div></div></div>
        <div class="stat-card stat-warning"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-label">Target Tercapai</div><div class="stat-value">${completed} / ${savings.length}</div></div></div>`;

      if (!savings.length) {
        gridEl.innerHTML = `<div class="empty-state"><h3>Belum ada target tabungan</h3><p>Mulai buat target pertama Anda: dana darurat, liburan, gadget, dll.</p></div>`;
        return;
      }

      gridEl.innerHTML = savings.map((s) => card(s, currency)).join('');

      gridEl.querySelectorAll('[data-deposit]').forEach((b) => b.onclick = async () => {
        const s = await DB.get('savings', b.dataset.deposit);
        SavingForm.transact(s, 'deposit', () => load());
      });
      gridEl.querySelectorAll('[data-withdraw]').forEach((b) => b.onclick = async () => {
        const s = await DB.get('savings', b.dataset.withdraw);
        SavingForm.transact(s, 'withdraw', () => load());
      });
      gridEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
        const s = await DB.get('savings', b.dataset.edit);
        SavingForm.open({ edit: s, onSaved: () => load() });
      });
      gridEl.querySelectorAll('[data-history]').forEach((b) => b.onclick = async () => {
        const s = await DB.get('savings', b.dataset.history);
        showHistory(s, currency);
      });
      gridEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (await Modal.confirm('Hapus target tabungan ini?', { danger: true, okText: 'Hapus' })) {
          const txs = await DB.getByIndex('savingTransactions', 'savingId', b.dataset.del);
          for (const t of txs) await DB.remove('savingTransactions', t.id);
          await DB.remove('savings', b.dataset.del);
          Toast.success('Tabungan dihapus');
          load();
        }
      });
    }

    container.querySelector('[data-act="add"]').onclick = () => SavingForm.open({ onSaved: () => load() });
    await load();
  });

  function card(s, currency) {
    const pct = s.targetAmount > 0 ? Math.min(100, (s.currentAmount / s.targetAmount) * 100) : 0;
    const remaining = Math.max(0, s.targetAmount - s.currentAmount);
    const targetDate = s.targetDate ? Utils.daysUntil(s.targetDate) : null;
    return `
      <div class="card saving-card ${s.status === 'completed' ? 'completed' : ''}">
        <div class="saving-head">
          <div class="saving-icon" style="background:${s.color}22;color:${s.color}">${s.icon || '🎯'}</div>
          <div>
            <h3>${Utils.escapeHtml(s.name)}</h3>
            <div class="muted small">${s.status === 'completed' ? '✅ Target tercapai' : targetDate !== null ? `⏰ ${targetDate > 0 ? targetDate + ' hari lagi' : 'Lewat target ' + Math.abs(targetDate) + ' hari'}` : 'Tanpa target tanggal'}</div>
          </div>
        </div>
        <div class="saving-amounts">
          <div><strong style="color:${s.color}">${Utils.formatCurrency(s.currentAmount, currency)}</strong></div>
          <div class="muted">dari ${Utils.formatCurrency(s.targetAmount, currency)}</div>
        </div>
        <div class="saving-bar" data-progress="${pct}" data-color="${s.color}"></div>
        <div class="saving-pct">${pct.toFixed(1)}% tercapai · Sisa ${Utils.formatCurrency(remaining, currency)}</div>
        ${s.note ? `<div class="muted small">📝 ${Utils.escapeHtml(s.note)}</div>` : ''}
        <div class="debt-actions">
          ${s.status !== 'completed' ? `<button class="btn btn-success btn-sm" data-deposit="${s.id}">Setor</button>` : ''}
          ${s.currentAmount > 0 ? `<button class="btn btn-danger btn-sm" data-withdraw="${s.id}">Tarik</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-history="${s.id}">Riwayat</button>
          <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-del="${s.id}">Hapus</button>
        </div>
      </div>`;
  }

  async function showHistory(saving, currency) {
    const txs = await DB.getByIndex('savingTransactions', 'savingId', saving.id);
    txs.sort((a, b) => b.date.localeCompare(a.date));
    const content = `
      <div class="modal-head"><h3>Riwayat Tabungan: ${Utils.escapeHtml(saving.name)}</h3></div>
      ${txs.length ? `<div class="history-list">${txs.map((t) => `
        <div class="history-item">
          <div><strong class="text-${t.type === 'deposit' ? 'success' : 'danger'}">${t.type === 'deposit' ? '+' : '−'}${Utils.formatCurrency(t.amount, currency)}</strong></div>
          <div class="muted small">${Utils.formatDate(t.date, 'DD MMM YYYY')}</div>
          ${t.note ? `<div class="muted small">${Utils.escapeHtml(t.note)}</div>` : ''}
        </div>`).join('')}</div>` : '<p class="muted">Belum ada transaksi.</p>'}`;
    Modal.open(content, { size: 'md' });
  }
})(window);
