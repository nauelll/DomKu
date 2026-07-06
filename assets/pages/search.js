/* ============================================
   DompetKu — search.js
   Universal search across transactions, debts, savings, etc.
   ============================================ */

(function (global) {
  'use strict';

  function formatShort(n) {
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'k';
    return String(Math.round(n));
  }

  Router.register('search', async (container, params = {}) => {
    const currency = Settings.get('currency');
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Pencarian</h1><p class="muted">Cari transaksi, utang, piutang, tabungan, aset</p></div>
        </header>
        <div class="search-box big">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" placeholder="Ketik kata kunci..." data-input value="${Utils.escapeHtml(params.q || '')}" autofocus>
        </div>
        <div class="seg-control">
          <button class="seg-btn active" data-type="all">Semua</button>
          <button class="seg-btn" data-type="transactions">Transaksi</button>
          <button class="seg-btn" data-type="debts">Utang</button>
          <button class="seg-btn" data-type="receivables">Piutang</button>
          <button class="seg-btn" data-type="savings">Tabungan</button>
          <button class="seg-btn" data-type="assets">Aset</button>
        </div>
        <div data-results></div>
      </div>`;

    const input = container.querySelector('[data-input]');
    const results = container.querySelector('[data-results]');
    let currentType = 'all';

    async function doSearch() {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.innerHTML = '<p class="muted">Ketik kata kunci untuk mulai mencari.</p>'; return; }
      results.innerHTML = '<p class="muted">Mencari...</p>';

      const matches = [];
      if (currentType === 'all' || currentType === 'transactions') {
        const txs = await DB.filter('transactions', (t) =>
          (t.categoryName || '').toLowerCase().includes(q) ||
          (t.source || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
        txs.forEach((t) => matches.push({ type: 'Transaksi', label: `${t.type === 'income' ? '↑' : '↓'} ${t.categoryName}`, sub: Utils.formatDate(t.date) + ' · ' + Utils.formatCurrency(t.amount, currency), href: '#/transactions' }));
      }
      if (currentType === 'all' || currentType === 'debts') {
        const debts = await DB.filter('debts', (d) => d.creditorName.toLowerCase().includes(q) || (d.note || '').toLowerCase().includes(q) || (d.contact || '').includes(q));
        debts.forEach((d) => matches.push({ type: 'Utang', label: d.creditorName, sub: `Sisa ${Utils.formatCurrency(d.remainingAmount, currency)} · ${Utils.formatDate(d.borrowedDate)}`, href: '#/debts' }));
      }
      if (currentType === 'all' || currentType === 'receivables') {
        const recs = await DB.filter('receivables', (r) => r.debtorName.toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q));
        recs.forEach((r) => matches.push({ type: 'Piutang', label: r.debtorName, sub: `Sisa ${Utils.formatCurrency(r.remainingAmount, currency)}`, href: '#/receivables' }));
      }
      if (currentType === 'all' || currentType === 'savings') {
        const svs = await DB.filter('savings', (s) => s.name.toLowerCase().includes(q) || (s.note || '').toLowerCase().includes(q));
        svs.forEach((s) => matches.push({ type: 'Tabungan', label: s.name, sub: `${Utils.formatCurrency(s.currentAmount, currency)} / ${Utils.formatCurrency(s.targetAmount, currency)}`, href: '#/savings' }));
      }
      if (currentType === 'all' || currentType === 'assets') {
        const assets = await DB.filter('assets', (a) => a.name.toLowerCase().includes(q) || (a.note || '').toLowerCase().includes(q));
        assets.forEach((a) => matches.push({ type: 'Aset', label: a.name, sub: Utils.formatCurrency(a.value, currency), href: '#/assets' }));
      }

      if (!matches.length) { results.innerHTML = '<p class="muted">Tidak ada hasil yang cocok.</p>'; return; }
      results.innerHTML = matches.map((m) => `
        <a href="${m.href}" class="search-result">
          <div class="search-result-type">${m.type}</div>
          <div class="search-result-body">
            <div class="search-result-label">${Utils.escapeHtml(m.label)}</div>
            <div class="muted small">${Utils.escapeHtml(m.sub)}</div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </a>`).join('');
    }

    input.addEventListener('input', Utils.debounce(doSearch, 250));
    container.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.onclick = () => {
        container.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;
        doSearch();
      };
    });
    doSearch();
  });
})(window);
