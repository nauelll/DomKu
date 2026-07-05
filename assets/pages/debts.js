/* ============================================
   DompetKu — debts.js
   Debts list, progress, payment history, reminders.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('debts', async (container) => {
    const currency = Settings.get('currency');
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Utang</h1><p class="muted">Kelola seluruh utang Anda</p></div>
          <button class="btn btn-primary btn-sm" data-act="add">+ Tambah Utang</button>
        </header>
        <div data-stats class="stat-grid"></div>
        <div data-list></div>
      </div>`;

    const statsEl = container.querySelector('[data-stats]');
    const listEl = container.querySelector('[data-list]');

    async function load() {
      const debts = await DB.getAll('debts');
      const active = debts.filter((d) => d.status !== 'paid');
      const overdue = active.filter((d) => d.dueDate && Utils.daysUntil(d.dueDate) < 0);
      const totalRemaining = Utils.sumBy(active, (d) => d.remainingAmount);
      const totalOriginal = Utils.sumBy(debts, (d) => d.originalAmount);
      const totalPaid = totalOriginal - Utils.sumBy(debts, (d) => d.remainingAmount);

      statsEl.innerHTML = `
        <div class="stat-card stat-warning"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-label">Total Utang Aktif</div><div class="stat-value">${Utils.formatCurrency(totalRemaining, currency)}</div></div></div>
        <div class="stat-card stat-danger"><div class="stat-icon">⚠️</div><div class="stat-info"><div class="stat-label">Jatuh Tempo Lewat</div><div class="stat-value">${overdue.length}</div></div></div>
        <div class="stat-card stat-success"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-label">Sudah Dibayar</div><div class="stat-value">${Utils.formatCurrency(totalPaid, currency)}</div></div></div>
        <div class="stat-card stat-info"><div class="stat-icon">📋</div><div class="stat-info"><div class="stat-label">Total Utang</div><div class="stat-value">${debts.length}</div></div></div>`;

      if (!debts.length) {
        listEl.innerHTML = `<div class="empty-state"><h3>Belum ada utang</h3><p>Klik tombol di atas untuk menambahkan utang pertama Anda.</p></div>`;
        return;
      }

      debts.sort((a, b) => (a.status === 'paid') - (b.status === 'paid') || (a.dueDate || '').localeCompare(b.dueDate || ''));
      listEl.innerHTML = debts.map((d) => debtCard(d, currency)).join('');

      listEl.querySelectorAll('[data-pay]').forEach((b) => b.onclick = async () => {
        const debt = await DB.get('debts', b.dataset.pay);
        DebtForm.payment(debt, () => load());
      });
      listEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
        const debt = await DB.get('debts', b.dataset.edit);
        DebtForm.open({ edit: debt, onSaved: () => load() });
      });
      listEl.querySelectorAll('[data-history]').forEach((b) => b.onclick = async () => {
        const debt = await DB.get('debts', b.dataset.history);
        showHistory(debt, currency);
      });
      listEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (await Modal.confirm('Hapus utang ini? Riwayat pembayaran juga akan dihapus.', { danger: true, okText: 'Hapus' })) {
          const payments = await DB.getByIndex('debtPayments', 'debtId', b.dataset.del);
          for (const p of payments) await DB.remove('debtPayments', p.id);
          await DB.remove('debts', b.dataset.del);
          Toast.success('Utang dihapus');
          load();
        }
      });
    }

    container.querySelector('[data-act="add"]').onclick = () => DebtForm.open({ onSaved: () => load() });
    await load();
  });

  function debtCard(d, currency) {
    const paidPct = d.originalAmount > 0 ? ((d.originalAmount - d.remainingAmount) / d.originalAmount) * 100 : 0;
    const due = d.dueDate ? Utils.daysUntil(d.dueDate) : null;
    const overdue = due !== null && due < 0 && d.status !== 'paid';
    return `
      <div class="card debt-card ${d.status === 'paid' ? 'paid' : ''} ${overdue ? 'overdue' : ''}">
        <div class="debt-head">
          <div>
            <h3 class="debt-name">${Utils.escapeHtml(d.creditorName)}</h3>
            <div class="muted">${d.contact ? '📞 ' + Utils.escapeHtml(d.contact) + ' · ' : ''}Dipinjam ${Utils.formatDate(d.borrowedDate, 'DD MMM YYYY')}${d.dueDate ? ' · Jatuh tempo ' + Utils.formatDate(d.dueDate, 'DD MMM YYYY') : ''}</div>
            ${overdue ? `<div class="badge badge-danger">⚠️ Lewat jatuh tempo ${Math.abs(due)} hari</div>` : ''}
            ${d.status === 'paid' ? `<div class="badge badge-success">✅ Lunas</div>` : ''}
          </div>
          <div class="debt-amount">
            <div class="text-${overdue ? 'danger' : 'warning'}">${Utils.formatCurrency(d.remainingAmount, currency)}</div>
            <div class="muted small">dari ${Utils.formatCurrency(d.originalAmount, currency)}</div>
          </div>
        </div>
        <div class="debt-progress">
          <div class="debt-progress-bar"><div style="width:${paidPct}%;background:${d.status === 'paid' ? '#10B981' : '#F59E0B'}"></div></div>
          <span class="muted small">${paidPct.toFixed(1)}% telah dibayar</span>
        </div>
        ${d.monthlyInstallment > 0 && d.status !== 'paid' ? `<div class="muted small">Cicilan: ${Utils.formatCurrency(d.monthlyInstallment, currency)}/bulan</div>` : ''}
        ${d.note ? `<div class="muted small">📝 ${Utils.escapeHtml(d.note)}</div>` : ''}
        <div class="debt-actions">
          ${d.status !== 'paid' ? `<button class="btn btn-success btn-sm" data-pay="${d.id}">Bayar</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-history="${d.id}">Riwayat</button>
          <button class="btn btn-ghost btn-sm" data-edit="${d.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-del="${d.id}">Hapus</button>
        </div>
      </div>`;
  }

  async function showHistory(debt, currency) {
    const payments = await DB.getByIndex('debtPayments', 'debtId', debt.id);
    payments.sort((a, b) => b.date.localeCompare(a.date));
    const content = `
      <div class="modal-head"><h3>Riwayat Pembayaran</h3></div>
      <p class="modal-text">${Utils.escapeHtml(debt.creditorName)} — Total dibayar: <strong>${Utils.formatCurrency(debt.originalAmount - debt.remainingAmount, currency)}</strong></p>
      ${payments.length ? `
        <div class="history-list">
          ${payments.map((p) => `
            <div class="history-item">
              <div><strong>+${Utils.formatCurrency(p.amount, currency)}</strong></div>
              <div class="muted small">${Utils.formatDate(p.date, 'DD MMM YYYY')}</div>
              ${p.note ? `<div class="muted small">${Utils.escapeHtml(p.note)}</div>` : ''}
            </div>`).join('')}
        </div>` : '<p class="muted">Belum ada pembayaran.</p>'}`;
    Modal.open(content, { size: 'md' });
  }
})(window);
