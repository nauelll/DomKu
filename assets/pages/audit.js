/* ============================================
   DomKu — audit.js
   Activity log page — shows all changes in current wallet.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('audit', async (container) => {
    if (Firebase.isConfigured() && !AuthFB.isLoggedIn) { Router.go('login'); return; }
    if (!Wallet.getCurrent()) { Router.go('wallet'); return; }

    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div>
            <h1>Riwayat Aktivitas</h1>
            <p class="muted">Semua perubahan di wallet ${Utils.escapeHtml(Wallet.getCurrent().name)}</p>
          </div>
        </header>
        <div data-list class="audit-list"></div>
      </div>`;

    const listEl = container.querySelector('[data-list]');
    const logs = await DB.getAuditLogs(100);

    if (!logs.length) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-illustration"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <h3>Belum ada aktivitas</h3>
        <p>Aktivitas seperti menambah transaksi, utang, atau tabungan akan muncul di sini.</p>
      </div>`;
      return;
    }

    listEl.innerHTML = logs.map((log) => {
      const initials = (log.userName || '?').charAt(0).toUpperCase();
      const photo = log.userPhoto ? `<img src="${log.userPhoto}" alt="">` : initials;
      return `
        <div class="audit-item">
          <div class="audit-avatar">${photo}</div>
          <div class="audit-body">
            <div class="audit-text">${formatAuditText(log)}</div>
            <div class="audit-time">${Utils.formatDateTime(log.createdAt)}</div>
          </div>
        </div>`;
    }).join('');
  });

  function formatAuditText(log) {
    const user = `<strong>${Utils.escapeHtml(log.userName || 'Seseorang')}</strong>`;
    const entityLabels = {
      transaction: 'transaksi', debt: 'utang', saving: 'tabungan',
      asset: 'aset', budget: 'anggaran', receivable: 'piutang',
      category: 'kategori', wallet: 'wallet'
    };
    const entity = entityLabels[log.entity] || log.entity;
    const actionLabels = { create: 'menambah', update: 'mengubah', delete: 'menghapus' };
    const action = actionLabels[log.action] || log.action;

    if (log.action === 'create' && log.entity === 'transaction') {
      const type = log.details.type === 'income' ? 'pemasukan' : 'pengeluaran';
      const amt = Utils.formatCurrency(log.details.amount || 0, Settings.get('currency'));
      return `${user} menambah ${type} <strong>${amt}</strong>${log.details.category ? ` (${Utils.escapeHtml(log.details.category)})` : ''}`;
    }
    if (log.action === 'create' && log.entity === 'debt') {
      return `${user} menambah utang <strong>${Utils.formatCurrency(log.details.amount || 0, Settings.get('currency'))}</strong> ke ${Utils.escapeHtml(log.details.creditor || '')}`;
    }
    if (log.action === 'create' && log.entity === 'saving') {
      return `${user} membuat target tabungan <strong>${Utils.escapeHtml(log.details.name || '')}</strong>`;
    }
    return `${user} ${action} ${entity}`;
  }
})(window);
