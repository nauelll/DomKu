/* ============================================
   DompetKu — receivables.js
   Receivables (piutang) — mirror of debts module.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('receivables', async (container) => {
    const currency = Settings.get('currency');
    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div><h1>Piutang</h1><p class="muted">Uang yang dipinjam orang lain dari Anda</p></div>
          <button class="btn btn-primary btn-sm" data-act="add">+ Tambah Piutang</button>
        </header>
        <div data-stats class="stat-grid"></div>
        <div data-list></div>
      </div>`;

    const statsEl = container.querySelector('[data-stats]');
    const listEl = container.querySelector('[data-list]');

    async function load() {
      const receivables = await DB.getAll('receivables');
      const active = receivables.filter((r) => r.status !== 'received');
      const totalRemaining = Utils.sumBy(active, (r) => r.remainingAmount);
      const totalReceived = Utils.sumBy(receivables, (r) => r.originalAmount - r.remainingAmount);

      statsEl.innerHTML = `
        <div class="stat-card stat-info"><div class="stat-icon">💵</div><div class="stat-info"><div class="stat-label">Total Piutang Aktif</div><div class="stat-value">${Utils.formatCurrency(totalRemaining, currency)}</div></div></div>
        <div class="stat-card stat-success"><div class="stat-icon">✅</div><div class="stat-info"><div class="stat-label">Sudah Diterima</div><div class="stat-value">${Utils.formatCurrency(totalReceived, currency)}</div></div></div>
        <div class="stat-card stat-warning"><div class="stat-icon">📋</div><div class="stat-info"><div class="stat-label">Total Piutang</div><div class="stat-value">${receivables.length}</div></div></div>`;

      if (!receivables.length) {
        listEl.innerHTML = `<div class="empty-state"><h3>Belum ada piutang</h3><p>Klik tombol di atas untuk menambahkan.</p></div>`;
        return;
      }

      receivables.sort((a, b) => (a.status === 'received') - (b.status === 'received') || (a.dueDate || '').localeCompare(b.dueDate || ''));
      listEl.innerHTML = receivables.map((r) => card(r, currency)).join('');

      listEl.querySelectorAll('[data-receive]').forEach((b) => b.onclick = async () => {
        const rec = await DB.get('receivables', b.dataset.receive);
        receivePayment(rec, () => load());
      });
      listEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = async () => {
        const rec = await DB.get('receivables', b.dataset.edit);
        openForm({ edit: rec, onSaved: () => load() });
      });
      listEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
        if (await Modal.confirm('Hapus piutang ini?', { danger: true, okText: 'Hapus' })) {
          const ps = await DB.getByIndex('receivablePayments', 'receivableId', b.dataset.del);
          for (const p of ps) await DB.remove('receivablePayments', p.id);
          await DB.remove('receivables', b.dataset.del);
          Toast.success('Piutang dihapus');
          load();
        }
      });
    }

    container.querySelector('[data-act="add"]').onclick = () => openForm({ onSaved: () => load() });
    await load();
  });

  function card(r, currency) {
    const pct = r.originalAmount > 0 ? ((r.originalAmount - r.remainingAmount) / r.originalAmount) * 100 : 0;
    const due = r.dueDate ? Utils.daysUntil(r.dueDate) : null;
    const overdue = due !== null && due < 0 && r.status !== 'received';
    return `
      <div class="card ${r.status === 'received' ? 'paid' : ''} ${overdue ? 'overdue' : ''}">
        <div class="debt-head">
          <div>
            <h3 class="debt-name">${Utils.escapeHtml(r.debtorName)}</h3>
            <div class="muted">Dipinjam ${Utils.formatDate(r.lentDate, 'DD MMM YYYY')}${r.dueDate ? ' · Jatuh tempo ' + Utils.formatDate(r.dueDate, 'DD MMM YYYY') : ''}</div>
            ${overdue ? `<div class="badge badge-danger">⚠️ Lewat jatuh tempo</div>` : ''}
            ${r.status === 'received' ? `<div class="badge badge-success">✅ Lunas</div>` : ''}
          </div>
          <div class="debt-amount">
            <div class="text-info">${Utils.formatCurrency(r.remainingAmount, currency)}</div>
            <div class="muted small">dari ${Utils.formatCurrency(r.originalAmount, currency)}</div>
          </div>
        </div>
        <div class="debt-progress">
          <div class="debt-progress-bar"><div style="width:${pct}%;background:${r.status === 'received' ? '#10B981' : '#3B82F6'}"></div></div>
          <span class="muted small">${pct.toFixed(1)}% diterima</span>
        </div>
        ${r.note ? `<div class="muted small">📝 ${Utils.escapeHtml(r.note)}</div>` : ''}
        <div class="debt-actions">
          ${r.status !== 'received' ? `<button class="btn btn-primary btn-sm" data-receive="${r.id}">Terima Pembayaran</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-edit="${r.id}">Edit</button>
          <button class="btn btn-ghost btn-sm" data-del="${r.id}">Hapus</button>
        </div>
      </div>`;
  }

  function openForm(options = {}) {
    const { edit = null, onSaved } = options;
    const isEdit = !!edit;
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isEdit ? 'Edit' : 'Tambah'} Piutang</h3></div>`;
    form.appendChild(Forms.text('Nama Peminjam', { id: 'debtorName', value: edit?.debtorName || '', required: true, placeholder: 'Contoh: Andi, Sari' }));
    form.appendChild(Forms.text('Nomor Kontak', { id: 'contact', value: edit?.contact || '' }));
    form.appendChild(Forms.amount('Nominal', { id: 'originalAmount', value: edit?.originalAmount || 0, required: true }));
    form.appendChild(Forms.amount('Sisa', { id: 'remainingAmount', value: (edit?.remainingAmount ?? edit?.originalAmount) || 0, required: true }));
    form.appendChild(Forms.row(
      Forms.date('Tanggal Pinjam', { id: 'lentDate', value: edit?.lentDate || Utils.todayISO(), required: true }),
      Forms.date('Jatuh Tempo', { id: 'dueDate', value: edit?.dueDate || '' })
    ));
    form.appendChild(Forms.textarea('Catatan', { id: 'note', value: edit?.note || '' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button><button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const originalAmount = Forms.amountValue(form.querySelector('#originalAmount'));
      const remainingAmount = Forms.amountValue(form.querySelector('#remainingAmount'));
      const record = {
        id: edit?.id || DB.uid(),
        debtorName: form.querySelector('#debtorName').value.trim(),
        contact: form.querySelector('#contact').value.trim(),
        originalAmount,
        remainingAmount,
        lentDate: form.querySelector('#lentDate').value,
        dueDate: form.querySelector('#dueDate').value || null,
        note: form.querySelector('#note').value,
        status: remainingAmount === 0 ? 'received' : 'active',
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('receivables', record);
      if (record.dueDate && !isEdit) {
        await DB.add('reminders', { id: DB.uid(), title: `Jatuh tempo piutang dari ${record.debtorName}`, type: 'custom', relatedId: record.id, dueDate: record.dueDate, time: '08:00', repeat: 'none', done: false, note: '', createdAt: new Date().toISOString() });
      }
      Toast.success(`Piutang ${isEdit ? 'diperbarui' : 'ditambahkan'}`);
      if (typeof onSaved === 'function') onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };
    const { close } = Modal.open(form, { size: 'md' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  function receivePayment(rec, onSaved) {
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>Terima Pembayaran — ${Utils.escapeHtml(rec.debtorName)}</h3>
      <p class="form-sub">Sisa: <strong>${Utils.formatCurrency(rec.remainingAmount, Settings.get('currency'))}</strong></p></div>`;
    form.appendChild(Forms.amount('Jumlah', { id: 'amount', required: true }));
    form.appendChild(Forms.date('Tanggal', { id: 'date', value: Utils.todayISO(), required: true }));
    form.appendChild(Forms.textarea('Catatan', { id: 'note' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="button" class="btn btn-success" data-act="full">Lunas</button>
      <button type="submit" class="btn btn-primary">Sebagian</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const amount = Forms.amountValue(form.querySelector('#amount'));
      await record(rec, amount, form.querySelector('#date').value, form.querySelector('#note').value);
      Toast.success('Pembayaran diterima');
      if (typeof onSaved === 'function') onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };
    form.querySelector('[data-act="full"]').onclick = async () => {
      await record(rec, rec.remainingAmount, Utils.todayISO(), 'Pembayaran lunas');
      Toast.success('Piutang dilunasi');
      if (typeof onSaved === 'function') onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };
    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  async function record(rec, amount, date, note) {
    await DB.add('receivablePayments', { id: DB.uid(), receivableId: rec.id, amount, date, note, createdAt: new Date().toISOString() });
    const newRemaining = Math.max(0, rec.remainingAmount - amount);
    await DB.put('receivables', { ...rec, remainingAmount: newRemaining, status: newRemaining === 0 ? 'received' : 'active' });
    await DB.add('transactions', {
      id: DB.uid(), type: 'income', amount, date, time: new Date().toTimeString().slice(0, 5),
      category: 'inc-other', categoryName: 'Pendapatan Lainnya',
      source: `Piutang dari ${rec.debtorName}`, method: 'transfer',
      note: note || `Pelunasan piutang dari ${rec.debtorName}`,
      attachmentId: null, createdAt: new Date().toISOString()
    });
  }
})(window);
