/* ============================================
   DompetKu — dashboard.js
   Main dashboard: summary cards, charts, recent activity.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('dashboard', async (container) => {
    const currency = Settings.get('currency');
    const monthKey = Utils.monthKey();
    const monthRange = Utils.monthRange(monthKey);

    // Load all data needed
    const [transactions, debts, receivables, savings, assets, budgets] = await Promise.all([
      DB.getAll('transactions'),
      DB.getAll('debts'),
      DB.getAll('receivables'),
      DB.getAll('savings'),
      DB.getAll('assets'),
      DB.getAll('budgets')
    ]);

    // Compute metrics
    const monthTx = transactions.filter((t) => Utils.isSameMonth(t.date, monthKey));
    const monthIncome = Utils.sumBy(monthTx.filter((t) => t.type === 'income'), (t) => t.amount);
    const monthExpense = Utils.sumBy(monthTx.filter((t) => t.type === 'expense'), (t) => t.amount);
    const totalIncome = Utils.sumBy(transactions.filter((t) => t.type === 'income'), (t) => t.amount);
    const totalExpense = Utils.sumBy(transactions.filter((t) => t.type === 'expense'), (t) => t.amount);
    const balance = totalIncome - totalExpense;
    const totalSavings = Utils.sumBy(savings, (s) => s.currentAmount);
    const totalDebt = Utils.sumBy(debts.filter((d) => d.status !== 'paid'), (d) => d.remainingAmount);
    const totalReceivable = Utils.sumBy(receivables.filter((r) => r.status !== 'received'), (r) => r.remainingAmount);
    const totalAssets = Utils.sumBy(assets, (a) => a.value);
    const netWorth = balance + totalAssets + totalReceivable - totalDebt;
    const available = balance + totalReceivable - totalDebt;

    // Monthly installments
    const monthlyInstallments = Utils.sumBy(debts.filter((d) => d.status !== 'paid'), (d) => d.monthlyInstallment || 0);

    const savingsPercent = balance > 0 ? (totalSavings / (balance + totalSavings)) * 100 : 0;
    const expensePercent = monthIncome > 0 ? (monthExpense / monthIncome) * 100 : 0;

    container.innerHTML = `
      <div class="page page-dashboard">
        <header class="page-head">
          <div>
            <h1>Dashboard</h1>
            <p class="muted">Ringkasan keuangan Anda bulan ${Utils.formatDate(new Date().toISOString(), 'DD MMM YYYY')}</p>
          </div>
          <div class="page-head-actions">
            <button class="btn btn-success btn-sm" data-act="add-income">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Pemasukan
            </button>
            <button class="btn btn-danger btn-sm" data-act="add-expense">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Pengeluaran
            </button>
          </div>
        </header>

        <!-- Main balance hero -->
        <section class="balance-hero">
          <div class="balance-label">Saldo Saat Ini</div>
          <div class="balance-amount">${Utils.formatCurrency(balance, currency)}</div>
          <div class="balance-meta">
            <div><span class="meta-label">Available</span><span class="meta-value">${Utils.formatCurrency(available, currency)}</span></div>
            <div><span class="meta-label">Net Worth</span><span class="meta-value">${Utils.formatCurrency(netWorth, currency)}</span></div>
          </div>
        </section>

        <!-- Stat cards grid -->
        <section class="stat-grid">
          ${statCard('Pemasukan Bulan Ini', Utils.formatCurrency(monthIncome, currency), 'success', 'trending-up')}
          ${statCard('Pengeluaran Bulan Ini', Utils.formatCurrency(monthExpense, currency), 'danger', 'trending-down')}
          ${statCard('Total Tabungan', Utils.formatCurrency(totalSavings, currency), 'info', 'piggy-bank')}
          ${statCard('Total Utang', Utils.formatCurrency(totalDebt, currency), 'warning', 'credit-card')}
          ${statCard('Total Piutang', Utils.formatCurrency(totalReceivable, currency), 'info', 'hand-coins')}
          ${statCard('Cicilan/Bulan', Utils.formatCurrency(monthlyInstallments, currency), 'warning', 'calendar')}
          ${statCard('Total Aset', Utils.formatCurrency(totalAssets, currency), 'success', 'gem')}
          ${statCard('Sisa Uang', Utils.formatCurrency(available, currency), available < 0 ? 'danger' : 'success', 'wallet')}
        </section>

        <!-- Charts row -->
        <section class="chart-grid">
          <div class="card chart-card">
            <div class="card-head">
              <h3>Pemasukan vs Pengeluaran</h3>
              <span class="badge">${expensePercent.toFixed(0)}% digunakan</span>
            </div>
            <canvas data-chart="income-expense" height="240"></canvas>
          </div>
          <div class="card chart-card">
            <div class="card-head">
              <h3>Kategori Pengeluaran</h3>
            </div>
            <canvas data-chart="category-pie" height="240"></canvas>
          </div>
        </section>

        <!-- Progress + recent -->
        <section class="dashboard-grid">
          <div class="card">
            <div class="card-head"><h3>Rasio Keuangan</h3></div>
            <div class="ratio-list">
              <div class="ratio-row">
                <div class="ratio-label">Persentase Tabungan <span>${savingsPercent.toFixed(1)}%</span></div>
                <div class="ratio-bar" data-progress="${savingsPercent}" data-color="#10B981"></div>
              </div>
              <div class="ratio-row">
                <div class="ratio-label">Persentase Pengeluaran <span>${expensePercent.toFixed(1)}%</span></div>
                <div class="ratio-bar" data-progress="${expensePercent}" data-color="${expensePercent > 90 ? '#EF4444' : '#F59E0B'}"></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <h3>Transaksi Terkini</h3>
              <a href="#/transactions" class="link-more">Lihat semua</a>
            </div>
            <div class="recent-list" data-recent></div>
          </div>
        </section>

        <!-- Budget warnings -->
        ${budgets.length > 0 ? `
        <section class="card">
          <div class="card-head"><h3>Status Anggaran Bulan Ini</h3></div>
          <div data-budget-status></div>
        </section>` : ''}
      </div>
    `;

    // Render charts
    renderCharts(container, monthTx);
    renderRatios(container);
    renderRecent(container, transactions);
    if (budgets.length) renderBudgetStatus(container, budgets, monthTx);

    // Bind action buttons
    container.querySelector('[data-act="add-income"]').onclick = () => TransactionForm.open({ type: 'income', onSaved: () => Router.refresh() });
    container.querySelector('[data-act="add-expense"]').onclick = () => TransactionForm.open({ type: 'expense', onSaved: () => Router.refresh() });

    // Re-render charts on theme change
    const observer = new MutationObserver(() => renderCharts(container, monthTx));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  });

  /* ---------- helpers ---------- */
  function statCard(label, value, tone, icon) {
    const ICONS = {
      'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
      'trending-down': '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>',
      'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z"/>',
      'credit-card': '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
      'hand-coins': '<path d="M11 15 8.5 12.5a2 2 0 0 0-2.83 0L4 14.17a2 2 0 0 0 0 2.83L7 20"/><path d="M16 16h6"/><path d="M16 20h6"/><path d="M16 12h4"/>',
      'calendar': '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      'gem': '<polygon points="6 3 18 3 22 9 12 22 2 9"/><line x1="2" y1="9" x2="22" y2="9"/>',
      'wallet': '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>'
    };
    return `
      <div class="stat-card stat-${tone}">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[icon] || ICONS['wallet']}</svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">${label}</div>
          <div class="stat-value">${value}</div>
        </div>
      </div>`;
  }

  function renderCharts(container, monthTx) {
    // Income vs Expense — last 6 months bar chart
    const ieCanvas = container.querySelector('[data-chart="income-expense"]');
    if (ieCanvas) {
      const months = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ key, label: d.toLocaleDateString('id-ID', { month: 'short' }) });
      }
      const allTx = window._allTxForChart || [];
      // Cache all transactions once
      if (!window._allTxForChart) {
        DB.getAll('transactions').then((tx) => {
          window._allTxForChart = tx;
          renderCharts(container, monthTx);
        });
        return;
      }
      const incomeData = months.map((m) => Utils.sumBy(allTx.filter((t) => t.type === 'income' && Utils.isSameMonth(t.date, m.key)), (t) => t.amount));
      const expenseData = months.map((m) => Utils.sumBy(allTx.filter((t) => t.type === 'expense' && Utils.isSameMonth(t.date, m.key)), (t) => t.amount));
      Charts.bar(ieCanvas, {
        labels: months.map((m) => m.label),
        datasets: [
          { label: 'Pemasukan', data: incomeData, color: '#10B981' },
          { label: 'Pengeluaran', data: expenseData, color: '#EF4444' }
        ]
      });
    }

    // Category pie
    const pieCanvas = container.querySelector('[data-chart="category-pie"]');
    if (pieCanvas) {
      const expenses = monthTx.filter((t) => t.type === 'expense');
      const byCat = Utils.groupBy(expenses, (t) => t.categoryName || 'Lainnya');
      const labels = Object.keys(byCat);
      const data = labels.map((k) => Utils.sumBy(byCat[k], (t) => t.amount));
      const colors = labels.map((k) => Utils.colorFromString(k));
      if (labels.length === 0) {
        const ctx = pieCanvas.getContext('2d');
        ctx.clearRect(0, 0, pieCanvas.width, pieCanvas.height);
        ctx.fillStyle = '#A1A1AA';
        ctx.font = '14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('Belum ada pengeluaran bulan ini', pieCanvas.width / 2, pieCanvas.height / 2);
      } else {
        Charts.doughnut(pieCanvas, {
          labels, data, colors
        }, { donut: true, centerLabel: 'Total', centerSub: Utils.formatCurrency(Utils.sumBy(expenses, (t) => t.amount), Settings.get('currency')) });
      }
    }
  }

  function renderRatios(container) {
    container.querySelectorAll('.ratio-bar').forEach((bar) => {
      const pct = parseFloat(bar.dataset.progress);
      const color = bar.dataset.color || '#10B981';
      Charts.progress(bar, pct, { color });
    });
  }

  function renderRecent(container, allTx) {
    const list = container.querySelector('[data-recent]');
    if (!list) return;
    const recent = [...allTx].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);
    if (!recent.length) {
      list.innerHTML = `<div class="empty-mini">Belum ada transaksi. Klik tombol + untuk menambah.</div>`;
      return;
    }
    list.innerHTML = recent.map((t) => `
      <a href="#/transactions" class="recent-item">
        <div class="recent-icon ${t.type}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${t.type === 'income'
              ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'
              : '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'}
          </svg>
        </div>
        <div class="recent-info">
          <div class="recent-title">${Utils.escapeHtml(t.categoryName || 'Tanpa kategori')}</div>
          <div class="recent-sub">${Utils.formatDate(t.date, Settings.get('dateFormat'))} · ${Utils.escapeHtml(t.source || t.note || '')}</div>
        </div>
        <div class="recent-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${Utils.formatCurrency(t.amount, Settings.get('currency'))}</div>
      </a>
    `).join('');
  }

  function renderBudgetStatus(container, budgets, monthTx) {
    const wrap = container.querySelector('[data-budget-status]');
    if (!wrap) return;
    const monthKey = Utils.monthKey();
    const monthBudgets = budgets.filter((b) => b.month === monthKey);
    if (!monthBudgets.length) { wrap.innerHTML = '<p class="muted">Belum ada anggaran untuk bulan ini.</p>'; return; }
    wrap.innerHTML = monthBudgets.map((b) => {
      const spent = Utils.sumBy(monthTx.filter((t) => t.type === 'expense' && t.category === b.category), (t) => t.amount);
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const over = spent > b.amount;
      return `
        <div class="budget-row ${over ? 'over' : ''}">
          <div class="budget-head">
            <span class="budget-name">${b.categoryName}</span>
            <span class="budget-amount ${over ? 'text-danger' : ''}">${Utils.formatCurrency(spent, Settings.get('currency'))} / ${Utils.formatCurrency(b.amount, Settings.get('currency'))}</span>
          </div>
          <div class="budget-bar" data-progress="${pct}" data-color="${over ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981'}"></div>
          <div class="budget-pct">${pct.toFixed(0)}% terpakai${over ? ' — melebihi anggaran!' : ''}</div>
        </div>`;
    }).join('');
    wrap.querySelectorAll('.budget-bar').forEach((bar) => {
      Charts.progress(bar, parseFloat(bar.dataset.progress), { color: bar.dataset.color });
    });
  }
})(window);
