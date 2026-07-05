/* ============================================
   DompetKu — budgets.js
   Monthly budgets per category with usage status.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('budgets', async (container) => {
    const currency = Settings.get('currency');
    let currentMonth = Utils.monthKey();

    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Anggaran</h1><p class="muted">Atur anggaran bulanan & pantau penggunaannya</p></div>
          <div class="page-head-actions">
            <input type="month" data-month class="select-sm" value="${currentMonth}">
            <button class="btn btn-primary btn-sm" data-act="add">+ Tambah Anggaran</button>
          </div>
        </header>
        <div data-summary class="stat-grid"></div>
        <div data-list></div>
      </div>`;

    const summaryEl = container.querySelector('[data-summary]');
    const listEl = container.querySelector('[data-list]');

    async function load() {
      const budgets = (await DB.getAll('budgets')).filter((b) => b.month === currentMonth);
      const transactions = (await DB.getAll('transactions')).filter((t) => Utils.isSameMonth(t.date, currentMonth) && t.type === 'expense');

      const totalBudget = Utils.sumBy(budgets, (b) => b.amount);
      const totalSpent = Utils.sumBy(budgets, (b) => Utils.sumBy(transactions.filter((t) => t.category === b.category), (t) => t.amount));
      const overBudgets = budgets.filter((b) => {
        const spent = Utils.sumBy(transactions.filter((t) => t.category === b.category), (t) => t.amount);
        return spent > b.amount;
      });

      summaryEl.innerHTML = `
        <div class="stat-card stat-info"><div class="stat-icon">🎯</div><div class="stat-info"><div class="stat-label">Total Anggaran</div><div class="stat-value">${Utils.formatCurrency(totalBudget, currency)}</div></div></div>
        <div class="stat-card stat-warning"><div class="stat-icon">💸</div><div class="stat-info"><div class="stat-label">Total Terpakai</div><div class="stat-value">${Utils.formatCurrency(totalSpent, currency)}</div></div></div>
        <div class="stat-card ${overBudgets.length ? 'stat-danger' : 'stat-success'}"><div class="stat-icon">${overBudgets.length ? '⚠️' : '✅'}</div><div class="stat-info"><div class="stat-label">Anggaran Over</div><div class="stat-value">${overBudgets.length}</div></div></div>`;

      if (!budgets.length) {
        listEl.innerHTML = `<div class="empty-state"><h3>Belum ada anggaran</h3><p>Atur anggaran bulanan untuk kategori pengeluaran agar lebih mudah di kontrol.</p></div>`;
        return;
      }

      listEl.innerHTML = budgets.map((b) => {
        const spent = Utils.sumBy(transactions.filter((t) => t.category === b.category), (t) => t.amount);
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        const over = spent > b.amount;
        return `
          <div class="card budget-row ${over ? 'over' : ''}">
            <div class="budget-head">
              <span class="budget-name">${b.categoryName}</span>
              <span class="budget-amount ${over ? 'text-danger' : ''}">${Utils.formatCurrency(spent, currency)} / ${Utils.formatCurrency(b.amount, currency)}</span>
            </div>
            <div class="budget-bar" data-progress="${pct}" data-color="${over ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981'}"></div>
            <div class="budget-pct">${pct.toFixed(0)}% terpakai${over ? ` — over ${Utils.formatCurrency(spent - b.amount, currency)}!` : ''}</div>
            <div class="debt-actions">
              <button class="btn btn-ghost btn-sm" data-edit="${b.id}">Edit</button>
              <button class="btn btn-ghost btn-sm" data-del="${b.id}">Hapus</button>
            </div>
          </div>`;
      }).join('');

      listEl.querySelectorAll('.budget-bar').forEach((bar) => {
        Charts.progress(bar, parseFloat(bar.dataset.progress), { color: bar.dataset.color });
      });
      listEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
        const budget = await DB.get('budgets', b.dataset.edit);
        BudgetForm.open({ edit: budget, onSaved: () => load() });
      });
      listEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (await Modal.confirm('Hapus anggaran ini?', { danger: true, okText: 'Hapus' })) {
          await DB.remove('budgets', b.dataset.del);
          Toast.success('Anggaran dihapus');
          load();
        }
      });
    }

    container.querySelector('[data-month]').onchange = (e) => { currentMonth = e.target.value; load(); };
    container.querySelector('[data-act="add"]').onclick = () => BudgetForm.open({ onSaved: () => load() });
    await load();
  });
})(window);
