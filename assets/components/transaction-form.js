/* ============================================
   DompetKu — transaction-form.js
   Modal form to add/edit income or expense transactions.
   Used by dashboard quick-add and transactions page.
   ============================================ */

(function (global) {
  'use strict';

  /**
   * Open the transaction form modal.
   * @param {object} options { type: 'income'|'expense', edit?: transactionObject, onSaved?: fn }
   */
  async function open(options = {}) {
    const { type = 'expense', edit = null, onSaved } = options;
    const categories = (await DB.getAll('categories')).filter((c) => c.type === type);
    const isEdit = !!edit;

    const form = document.createElement('form');
    form.className = 'form transaction-form';
    form.innerHTML = `
      <div class="form-head">
        <h3>${isEdit ? 'Edit' : 'Tambah'} ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</h3>
        <div class="type-toggle">
          <button type="button" class="btn btn-sm ${type === 'income' ? 'btn-success' : 'btn-ghost'}" data-set-type="income">Pemasukan</button>
          <button type="button" class="btn btn-sm ${type === 'expense' ? 'btn-danger' : 'btn-ghost'}" data-set-type="expense">Pengeluaran</button>
        </div>
      </div>`;

    // Build fields
    const amountGroup = Forms.amount('Nominal', { id: 'amount', value: edit?.amount || 0, required: true });
    const categoryGroup = Forms.select('Kategori', {
      id: 'category',
      value: edit?.category || '',
      required: true,
      options: [{ value: '', label: '— Pilih kategori —' }, ...categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))]
    });
    const dateGroup = Forms.date('Tanggal', { id: 'date', value: edit?.date || Utils.todayISO(), required: true });
    const timeGroup = Forms.time('Jam', { id: 'time', value: edit?.time || new Date().toTimeString().slice(0, 5) });
    const sourceLabel = type === 'income' ? 'Sumber' : 'Metode Pembayaran';
    const sourceGroup = Forms.text(sourceLabel, {
      id: 'source',
      value: edit?.source || '',
      placeholder: type === 'income' ? 'Contoh: Perusahaan, Klien, Toko' : 'Contoh: Tunai, Transfer, GoPay, OVO'
    });
    const noteGroup = Forms.textarea('Catatan', { id: 'note', value: edit?.note || '', placeholder: 'Catatan tambahan (opsional)' });
    const attachGroup = Forms.imageUpload('Lampiran Bukti', { id: 'attachment', existing: edit?.attachmentData || null });

    form.appendChild(Forms.row(amountGroup, categoryGroup));
    form.appendChild(Forms.row(dateGroup, timeGroup));
    form.appendChild(sourceGroup);
    form.appendChild(noteGroup);
    form.appendChild(attachGroup);

    // Submit button
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `
      <button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="submit" class="btn ${type === 'income' ? 'btn-success' : 'btn-danger'}">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    // Type toggle behavior
    let currentType = type;
    form.querySelectorAll('[data-set-type]').forEach((btn) => {
      btn.onclick = () => {
        currentType = btn.dataset.setType;
        Modal.open(form.parentElement?.closest('.modal-overlay') || form, {}); // re-open is messy; instead, close and reopen
      };
    });

    // Handle submit
    form.onsubmit = async (e) => {
      e.preventDefault();
      const amount = Forms.amountValue(form.querySelector('#amount'));
      if (!amount || amount <= 0) { Toast.error('Nominal harus lebih dari 0'); return; }
      const category = form.querySelector('#category').value;
      if (!category) { Toast.error('Pilih kategori'); return; }
      const cat = categories.find((c) => c.id === category);

      // Save attachment if any
      let attachmentId = edit?.attachmentId || null;
      const attachHidden = form.querySelector('input[type="hidden"][name="attachment"]');
      const attachData = attachHidden?.getAttribute('data-value');
      if (attachData) {
        attachmentId = await DB.add('attachments', {
          id: DB.uid(),
          data: attachData,
          name: 'receipt.jpg',
          mime: 'image/jpeg',
          createdAt: new Date().toISOString()
        }).then((r) => r.id);
      }

      const record = {
        id: edit?.id || DB.uid(),
        type: currentType,
        amount,
        date: form.querySelector('#date').value,
        time: form.querySelector('#time').value,
        category,
        categoryName: cat?.name || '',
        source: form.querySelector('#source').value,
        note: form.querySelector('#note').value,
        attachmentId,
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('transactions', record);
      Toast.success(`${currentType === 'income' ? 'Pemasukan' : 'Pengeluaran'} ${isEdit ? 'diperbarui' : 'ditambahkan'}`);
      if (typeof onSaved === 'function') onSaved(record);
      // Close modal
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    // Open modal
    const { close } = Modal.open(form, { size: 'md' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  global.TransactionForm = { open };
})(window);
