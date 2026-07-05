/* ============================================
   DompetKu — calendar.js
   Monthly calendar view with transactions on each day.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('calendar', async (container) => {
    const currency = Settings.get('currency');
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth();

    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Kalender Keuangan</h1><p class="muted">Lihat seluruh transaksi dalam kalender</p></div>
          <div class="page-head-actions">
            <button class="icon-btn" data-nav="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
            <h3 data-month-label style="margin:0;min-width:180px;text-align:center"></h3>
            <button class="icon-btn" data-nav="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></button>
            <button class="btn btn-ghost btn-sm" data-nav="today">Hari Ini</button>
          </div>
        </header>
        <div data-legend class="cal-legend">
          <span class="legend-item"><span class="dot income"></span> Pemasukan</span>
          <span class="legend-item"><span class="dot expense"></span> Pengeluaran</span>
        </div>
        <div class="cal-grid-head">
          ${['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map((d) => `<div>${d}</div>`).join('')}
        </div>
        <div data-cal class="cal-grid"></div>
        <div data-detail class="cal-detail"></div>
      </div>`;

    const calEl = container.querySelector('[data-cal]');
    const labelEl = container.querySelector('[data-month-label]');
    const detailEl = container.querySelector('[data-detail]');

    async function load() {
      const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      const allTx = (await DB.getAll('transactions')).filter((t) => Utils.isSameMonth(t.date, monthKey));
      const byDate = Utils.groupBy(allTx, (t) => t.date);
      const firstDay = new Date(viewYear, viewMonth, 1);
      const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
      const startDOW = firstDay.getDay();

      labelEl.textContent = firstDay.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      let html = '';
      // Leading blanks
      for (let i = 0; i < startDOW; i++) html += '<div class="cal-cell empty"></div>';
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const txs = byDate[dateStr] || [];
        const income = Utils.sumBy(txs.filter((t) => t.type === 'income'), (t) => t.amount);
        const expense = Utils.sumBy(txs.filter((t) => t.type === 'expense'), (t) => t.amount);
        const isToday = dateStr === Utils.todayISO();
        html += `
          <div class="cal-cell ${isToday ? 'today' : ''} ${txs.length ? 'has-tx' : ''}" data-date="${dateStr}">
            <div class="cal-day">${d}</div>
            ${income ? `<div class="cal-amount income">+${Utils.formatShort(income)}</div>` : ''}
            ${expense ? `<div class="cal-amount expense">−${Utils.formatShort(expense)}</div>` : ''}
            ${txs.length ? `<div class="cal-count">${txs.length} tx</div>` : ''}
          </div>`;
      }
      calEl.innerHTML = html;

      calEl.querySelectorAll('.cal-cell:not(.empty)').forEach((cell) => {
        cell.onclick = () => showDetail(cell.dataset.date, byDate[cell.dataset.date] || [], currency, detailEl);
      });
    }

    container.querySelector('[data-nav="prev"]').onclick = () => {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      load();
    };
    container.querySelector('[data-nav="next"]').onclick = () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      load();
    };
    container.querySelector('[data-nav="today"]').onclick = () => {
      viewYear = today.getFullYear();
      viewMonth = today.getMonth();
      load();
    };

    await load();
  });
})(window);
