/* ============================================
   DompetKu — debt-form.js
   Modal form to add/edit debts.
   ============================================ */

(function (global) {
  'use strict';

  async function open(options = {}) {
    const { edit = null, onSaved } = options;
    const isEdit = !!edit;

    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isEdit ? 'Edit' : 'Tambah'} Utang</h3></div>`;

    form.appendChild(Forms.text('Nama Pemberi Utang', { id: 'creditorName', value: edit?.creditorName || '', required: true, placeholder: 'Contoh: Budi, Bank ABC' }));
    form.appendChild(Forms.text('Nomor Kontak', { id: 'contact', value: edit?.contact || '', placeholder: '08xx / @username' }));
    form.appendChild(Forms.amount('Nominal Awal Utang', { id: 'originalAmount', value: edit?.originalAmount || 0, required: true }));
    form.appendChild(Forms.amount('Sisa Utang', { id: 'remainingAmount', value: (edit?.remainingAmount ?? edit?.originalAmount) || 0, required: true }));
    form.appendChild(Forms.row(
      Forms.date('Tanggal Pinjam', { id: 'borrowedDate', value: edit?.borrowedDate || Utils.todayISO(), required: true }),
      Forms.date('Jatuh Tempo', { id: 'dueDate', value: edit?.dueDate || '' })
    ));
    form.appendChild(Forms.amount('Cicilan per Bulan', { id: 'monthlyInstallment', value: edit?.monthlyInstallment || 0 }));
    form.appendChild(Forms.textarea('Catatan', { id: 'note', value: edit?.note || '' }));

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `
      <button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const originalAmount = Forms.amountValue(form.querySelector('#originalAmount'));
      const remainingAmount = Forms.amountValue(form.querySelector('#remainingAmount'));
      if (!originalAmount) return Toast.error('Nominal awal wajib diisi');
      if (remainingAmount < 0) return Toast.error('Sisa utang tidak boleh negatif');
      const record = {
        id: edit?.id || DB.uid(),
        creditorName: form.querySelector('#creditorName').value.trim(),
        contact: form.querySelector('#contact').value.trim(),
        originalAmount,
        remainingAmount,
        borrowedDate: form.querySelector('#borrowedDate').value,
        dueDate: form.querySelector('#dueDate').value || null,
        monthlyInstallment: Forms.amountValue(form.querySelector('#monthlyInstallment')),
        note: form.querySelector('#note').value,
        status: remainingAmount === 0 ? 'paid' : 'active',
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('debts', record);
      // Create reminder for due date
      if (record.dueDate && !isEdit) {
        await DB.add('reminders', {
          id: DB.uid(),
          title: `Jatuh tempo utang ke ${record.creditorName}`,
          type: 'debt',
          relatedId: record.id,
          dueDate: record.dueDate,
          time: Settings.get('reminderTime') || '08:00',
          repeat: 'none',
          done: false,
          note: '',
          createdAt: new Date().toISOString()
        });
      }
      Toast.success(`Utang ${isEdit ? 'diperbarui' : 'ditambahkan'}`);
      if (typeof onSaved === 'function') onSaved(record);
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'md' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  /** Record a payment toward a debt. */
  async function payment(debt, onSaved) {
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>Bayar Utang — ${Utils.escapeHtml(debt.creditorName)}</h3>
      <p class="form-sub">Sisa: <strong>${Utils.formatCurrency(debt.remainingAmount, Settings.get('currency'))}</strong></p></div>`;
    form.appendChild(Forms.amount('Jumlah Pembayaran', { id: 'amount', required: true }));
    form.appendChild(Forms.date('Tanggal', { id: 'date', value: Utils.todayISO(), required: true }));
    form.appendChild(Forms.textarea('Catatan', { id: 'note' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="button" class="btn btn-success" data-act="full">Bayar Lunas</button>
      <button type="submit" class="btn btn-primary">Bayar Sebagian</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const amount = Forms.amountValue(form.querySelector('#amount'));
      if (!amount) return Toast.error('Masukkan jumlah pembayaran');
      await recordPayment(debt, amount, form.querySelector('#date').value, form.querySelector('#note').value);
      Toast.success('Pembayaran tercatat');
      if (typeof onSaved === 'function') onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };
    form.querySelector('[data-act="full"]').onclick = async () => {
      await recordPayment(debt, debt.remainingAmount, Utils.todayISO(), 'Pembayaran lunas');
      Toast.success('Utang dilunasi');
      if (typeof onSaved === 'function') onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  async function recordPayment(debt, amount, date, note) {
    await DB.add('debtPayments', {
      id: DB.uid(),
      debtId: debt.id,
      amount,
      date,
      note,
      createdAt: new Date().toISOString()
    });
    const newRemaining = Math.max(0, debt.remainingAmount - amount);
    await DB.put('debts', { ...debt, remainingAmount: newRemaining, status: newRemaining === 0 ? 'paid' : 'active' });
    // Auto-create expense transaction
    await DB.add('transactions', {
      id: DB.uid(),
      type: 'expense',
      amount,
      date,
      time: new Date().toTimeString().slice(0, 5),
      category: 'exp-other',
      categoryName: 'Pengeluaran Lain',
      source: `Bayar utang: ${debt.creditorName}`,
      method: 'transfer',
      note: note || `Pembayaran utang ke ${debt.creditorName}`,
      attachmentId: null,
      createdAt: new Date().toISOString()
    });
  }

  global.DebtForm = { open, payment };
})(window);
