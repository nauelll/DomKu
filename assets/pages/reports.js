/* ============================================
   DompetKu — reports.js
   Periodic reports: daily/weekly/monthly/yearly/custom.
   Charts + statistics.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('reports', async (container) => {
    const currency = Settings.get('currency');
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const defaultTo = Utils.todayISO();

    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Laporan Keuangan</h1><p class="muted">Analisis mendalam keuangan Anda</p></div>
        </header>

        <div class="toolbar">
          <div class="seg-control">
            <button class="seg-btn active" data-period="month">Bulanan</button>
            <button class="seg-btn" data-period="week">Mingguan</button>
            <button class="seg-btn" data-period="year">Tahunan</button>
            <button class="seg-btn" data-period="custom">Custom</button>
          </div>
          <div class="date-range" style="display:none">
            <input type="date" data-from value="${defaultFrom}">
            <span>s/d</span>
            <input type="date" data-to value="${defaultTo}">
            <button class="btn btn-primary btn-sm" data-apply">Terapkan</button>
          </div>
        </div>

        <div data-summary class="stat-grid"></div>

        <div class="chart-grid">
          <div class="card chart-card">
            <div class="card-head"><h3>Cash Flow</h3></div>
            <canvas data-chart="line" height="240"></canvas>
          </div>
          <div class="card chart-card">
            <div class="card-head"><h3>Komposisi Pengeluaran</h3></div>
            <canvas data-chart="pie" height="240"></canvas>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Statistik</h3></div>
          <div data-stats class="stats-list"></div>
        </div>

        <div class="card">
          <div class="card-head"><h3>Detail per Kategori</h3></div>
          <div data-cat-list></div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Export Laporan</h3>
          </div>
          <div class="export-row">
            <button class="btn btn-outline btn-sm" data-export="csv">CSV</button>
            <button class="btn btn-outline btn-sm" data-export="xlsx">Excel (XLSX)</button>
            <button class="btn btn-outline btn-sm" data-export="pdf">PDF (Print)</button>
            <button class="btn btn-outline btn-sm" data-export="json">JSON</button>
          </div>
        </div>
      </div>`;

    let currentFrom = defaultFrom, currentTo = defaultTo;

    async function loadAndRender() {
      const allTx = (await DB.getAll('transactions')).filter((t) => t.date >= currentFrom && t.date <= currentTo);
      const income = allTx.filter((t) => t.type === 'income');
      const expense = allTx.filter((t) => t.type === 'expense');
      const totalIn = Utils.sumBy(income, (t) => t.amount);
      const totalOut = Utils.sumBy(expense, (t) => t.amount);

      container.querySelector('[data-summary]').innerHTML = `
        <div class="stat-card stat-success"><div class="stat-icon">📈</div><div class="stat-info"><div class="stat-label">Total Pemasukan</div><div class="stat-value">${Utils.formatCurrency(totalIn, currency)}</div></div></div>
        <div class="stat-card stat-danger"><div class="stat-icon">📉</div><div class="stat-info"><div class="stat-label">Total Pengeluaran</div><div class="stat-value">${Utils.formatCurrency(totalOut, currency)}</div></div></div>
        <div class="stat-card ${totalIn - totalOut >= 0 ? 'stat-success' : 'stat-danger'}"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-label">Cash Flow</div><div class="stat-value">${Utils.formatCurrency(totalIn - totalOut, currency)}</div></div></div>
        <div class="stat-card stat-info"><div class="stat-icon">📊</div><div class="stat-info"><div class="stat-label">Rata-rata Pengeluaran/Hari</div><div class="stat-value">${Utils.formatCurrency(totalOut / Math.max(1, daysBetween(currentFrom, currentTo)), currency)}</div></div></div>`;

      // Line chart: cumulative balance
      const lineCanvas = container.querySelector('[data-chart="line"]');
      const byDate = Utils.groupBy(allTx, (t) => t.date);
      const dates = Object.keys(byDate).sort();
      let cumulative = 0;
      const cumData = dates.map((d) => {
        const dayTx = byDate[d];
        cumulative += Utils.sumBy(dayTx.filter((t) => t.type === 'income'), (t) => t.amount) - Utils.sumBy(dayTx.filter((t) => t.type === 'expense'), (t) => t.amount);
        return cumulative;
      });
      Charts.line(lineCanvas, {
        labels: dates.map((d) => Utils.formatDate(d, 'DD/MM')),
        datasets: [{ label: 'Saldo', data: cumData, color: '#10B981', fill: true }]
      });

      // Pie chart
      const pieCanvas = container.querySelector('[data-chart="pie"]');
      const byCat = Utils.groupBy(expense, (t) => t.categoryName || 'Lainnya');
      const labels = Object.keys(byCat);
      const data = labels.map((k) => Utils.sumBy(byCat[k], (t) => t.amount));
      Charts.doughnut(pieCanvas, { labels, data, colors: labels.map((l) => Utils.colorFromString(l)) }, { donut: true, centerLabel: 'Total', centerSub: Utils.formatCurrency(totalOut, currency) });

      // Stats
      const topIncome = [...income].sort((a, b) => b.amount - a.amount)[0];
      const topExpense = [...expense].sort((a, b) => b.amount - a.amount)[0];
      const catSums = Object.entries(byCat).map(([k, v]) => ({ name: k, total: Utils.sumBy(v, (t) => t.amount) }));
      const mostSpent = [...catSums].sort((a, b) => b.total - a.total)[0];
      const leastSpent = [...catSums].filter((c) => c.total > 0).sort((a, b) => a.total - b.total)[0];
      const avgIncome = income.length ? totalIn / income.length : 0;
      const avgExpense = expense.length ? totalOut / expense.length : 0;

      container.querySelector('[data-stats]').innerHTML = `
        <div class="stat-row"><span>Pemasukan Terbesar</span><strong>${topIncome ? Utils.formatCurrency(topIncome.amount, currency) + ' (' + Utils.escapeHtml(topIncome.categoryName) + ')' : '-'}</strong></div>
        <div class="stat-row"><span>Pengeluaran Terbesar</span><strong>${topExpense ? Utils.formatCurrency(topExpense.amount, currency) + ' (' + Utils.escapeHtml(topExpense.categoryName) + ')' : '-'}</strong></div>
        <div class="stat-row"><span>Kategori Paling Boros</span><strong>${mostSpent ? Utils.escapeHtml(mostSpent.name) + ' (' + Utils.formatCurrency(mostSpent.total, currency) + ')' : '-'}</strong></div>
        <div class="stat-row"><span>Kategori Paling Hemat</span><strong>${leastSpent ? Utils.escapeHtml(leastSpent.name) + ' (' + Utils.formatCurrency(leastSpent.total, currency) + ')' : '-'}</strong></div>
        <div class="stat-row"><span>Rata-rata Pemasukan</span><strong>${Utils.formatCurrency(avgIncome, currency)}</strong></div>
        <div class="stat-row"><span>Rata-rata Pengeluaran</span><strong>${Utils.formatCurrency(avgExpense, currency)}</strong></div>
      `;

      // Category breakdown
      container.querySelector('[data-cat-list]').innerHTML = catSums.length ? `
        <table class="data-table">
          <thead><tr><th>Kategori</th><th>Transaksi</th><th>Total</th><th>% dari Total</th></tr></thead>
          <tbody>${catSums.sort((a, b) => b.total - a.total).map((c) => `
            <tr><td>${Utils.escapeHtml(c.name)}</td><td>${byCat[c.name].length}</td><td>${Utils.formatCurrency(c.total, currency)}</td><td>${(c.total / totalOut * 100).toFixed(1)}%</td></tr>
          `).join('')}</tbody>
        </table>` : '<p class="muted">Belum ada data.</p>';
    }

    // Period buttons
    container.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.onclick = () => {
        container.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const p = btn.dataset.period;
        const dateRange = container.querySelector('.date-range');
        dateRange.style.display = p === 'custom' ? 'flex' : 'none';
        const today = new Date();
        if (p === 'month') {
          currentFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
          currentTo = Utils.todayISO();
        } else if (p === 'week') {
          const start = new Date(today);
          start.setDate(today.getDate() - today.getDay());
          currentFrom = start.toISOString().slice(0, 10);
          currentTo = Utils.todayISO();
        } else if (p === 'year') {
          currentFrom = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10);
          currentTo = Utils.todayISO();
        }
        loadAndRender();
      };
    });
    const applyBtn = container.querySelector('[data-apply]');
    if (applyBtn) applyBtn.onclick = () => {
      currentFrom = container.querySelector('[data-from]').value;
      currentTo = container.querySelector('[data-to]').value;
      loadAndRender();
    };

    // Export buttons
    container.querySelectorAll('[data-export]').forEach((b) => b.onclick = async () => {
      const allTx = (await DB.getAll('transactions')).filter((t) => t.date >= currentFrom && t.date <= currentTo);
      await Exporter.exportTransactions(allTx, b.dataset.export, { from: currentFrom, to: currentTo });
    });

    function daysBetween(from, to) {
      return Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000));
    }

    await loadAndRender();
  });
})(window);
