/* ============================================
   DompetKu — transactions.js
   All income + expense transactions list.
   Supports filter by type, category, month; search; edit; delete.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('transactions', async (container, params = {}) => {
    const currency = Settings.get('currency');
    const categories = await DB.getAll('categories');

    container.innerHTML = `
      <div class="page page-transactions">
        <header class="page-head">
          <div>
            <h1>Transaksi</h1>
            <p class="muted">Semua pemasukan & pengeluaran Anda</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-success btn-sm" data-act="add-income">+ Pemasukan</button>
            <button class="btn btn-danger btn-sm" data-act="add-expense">+ Pengeluaran</button>
          </div>
        </header>

        <div class="toolbar">
          <div class="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Cari transaksi..." data-search>
          </div>
          <select data-filter-type class="select-sm">
            <option value="">Semua Jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
          <select data-filter-cat class="select-sm">
            <option value="">Semua Kategori</option>
            ${categories.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
          <input type="month" data-filter-month class="select-sm" value="${Utils.monthKey()}">
          <button class="btn btn-ghost btn-sm" data-act="clear">Reset</button>
        </div>

        <div class="tx-summary" data-summary></div>
        <div class="tx-list" data-list></div>
      </div>
    `;

    const state = {
      search: params.q || '',
      type: params.type || '',
      category: params.category || '',
      month: Utils.monthKey()
    };

    const listEl = container.querySelector('[data-list]');
    const summaryEl = container.querySelector('[data-summary]');

    async function loadAndRender() {
      let all = await DB.getAll('transactions');
      if (state.search) {
        const q = state.search.toLowerCase();
        all = all.filter((t) =>
          (t.categoryName || '').toLowerCase().includes(q) ||
          (t.source || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q) ||
          String(t.amount).includes(q)
        );
      }
      if (state.type) all = all.filter((t) => t.type === state.type);
      if (state.category) all = all.filter((t) => t.category === state.category);
      if (state.month) all = all.filter((t) => Utils.isSameMonth(t.date, state.month));

      all.sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

      const totalIn = Utils.sumBy(all.filter((t) => t.type === 'income'), (t) => t.amount);
      const totalOut = Utils.sumBy(all.filter((t) => t.type === 'expense'), (t) => t.amount);

      summaryEl.innerHTML = `
        <div class="summary-card success"><span>Pemasukan</span><strong>${Utils.formatCurrency(totalIn, currency)}</strong></div>
        <div class="summary-card danger"><span>Pengeluaran</span><strong>${Utils.formatCurrency(totalOut, currency)}</strong></div>
        <div class="summary-card ${totalIn - totalOut >= 0 ? 'success' : 'danger'}"><span>Selisih</span><strong>${Utils.formatCurrency(totalIn - totalOut, currency)}</strong></div>
      `;

      if (!all.length) {
        listEl.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg>
          <h3>Belum ada transaksi</h3>
          <p>Tambahkan pemasukan atau pengeluaran pertama Anda.</p>
        </div>`;
        return;
      }

      // Group by date
      const grouped = Utils.groupBy(all, (t) => t.date);
      const dates = Object.keys(grouped).sort().reverse();
      listEl.innerHTML = dates.map((date) => {
        const items = grouped[date];
        const dayIn = Utils.sumBy(items.filter((t) => t.type === 'income'), (t) => t.amount);
        const dayOut = Utils.sumBy(items.filter((t) => t.type === 'expense'), (t) => t.amount);
        return `
          <div class="tx-day">
            <div class="tx-day-head">
              <span>${Utils.formatDate(date, 'DD MMM YYYY')}</span>
              <span class="muted">+${Utils.formatCurrency(dayIn, currency)} / −${Utils.formatCurrency(dayOut, currency)}</span>
            </div>
            ${items.map((t) => txItem(t, currency)).join('')}
          </div>`;
      }).join('');

      // Bind row actions
      listEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
        const tx = await DB.get('transactions', b.dataset.edit);
        TransactionForm.open({ type: tx.type, edit: tx, onSaved: () => loadAndRender() });
      });
      listEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (await Modal.confirm('Hapus transaksi ini?', { danger: true, okText: 'Hapus' })) {
          await DB.remove('transactions', b.dataset.del);
          Toast.success('Transaksi dihapus');
          loadAndRender();
        }
      });
    }

    function txItem(t, currency) {
      return `
        <div class="tx-item">
          <div class="tx-icon ${t.type}">${t.type === 'income' ? '↑' : '↓'}</div>
          <div class="tx-body">
            <div class="tx-title">${Utils.escapeHtml(t.categoryName || 'Tanpa kategori')}</div>
            <div class="tx-sub">${Utils.escapeHtml(t.source || t.note || (t.time ? 'Jam ' + t.time : ''))}</div>
          </div>
          <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${Utils.formatCurrency(t.amount, currency)}</div>
          <div class="tx-actions">
            <button class="icon-btn sm" data-edit="${t.id}" aria-label="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="icon-btn sm" data-del="${t.id}" aria-label="Hapus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </div>
        </div>`;
    }

    // Bind toolbar
    container.querySelector('[data-search]').value = state.search;
    container.querySelector('[data-filter-type]').value = state.type;
    container.querySelector('[data-filter-cat]').value = state.category;
    container.querySelector('[data-filter-month]').value = state.month;

    container.querySelector('[data-search]').addEventListener('input', Utils.debounce((e) => { state.search = e.target.value; loadAndRender(); }, 250));
    container.querySelector('[data-filter-type]').onchange = (e) => { state.type = e.target.value; loadAndRender(); };
    container.querySelector('[data-filter-cat]').onchange = (e) => { state.category = e.target.value; loadAndRender(); };
    container.querySelector('[data-filter-month]').onchange = (e) => { state.month = e.target.value; loadAndRender(); };
    container.querySelector('[data-act="clear"]').onclick = () => {
      state.search = ''; state.type = ''; state.category = ''; state.month = '';
      container.querySelector('[data-search]').value = '';
      container.querySelector('[data-filter-type]').value = '';
      container.querySelector('[data-filter-cat]').value = '';
      container.querySelector('[data-filter-month]').value = '';
      loadAndRender();
    };
    container.querySelector('[data-act="add-income"]').onclick = () => TransactionForm.open({ type: 'income', onSaved: () => loadAndRender() });
    container.querySelector('[data-act="add-expense"]').onclick = () => TransactionForm.open({ type: 'expense', onSaved: () => loadAndRender() });

    // Handle ?action=add&type=income from shortcut
    if (params.action === 'add') {
      TransactionForm.open({ type: params.type || 'expense', onSaved: () => loadAndRender() });
    }

    await loadAndRender();
  });
})(window);
