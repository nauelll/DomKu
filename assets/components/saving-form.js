/* ============================================
   DompetKu — saving-form.js
   Modal form to add/edit savings targets + deposit/withdraw.
   ============================================ */

(function (global) {
  'use strict';

  async function open(options = {}) {
    const { edit = null, onSaved } = options;
    const isEdit = !!edit;
    const ICONS = ['🎯','🏖️','💻','🏍️','🏠','🏪','💍','📱','🎓','🚗','💎','🎁'];
    const COLORS = ['#10B981','#3B82F6','#8B5CF6','#EC4899','#F59E0B','#06B6D4','#EF4444','#84CC16'];

    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isEdit ? 'Edit' : 'Tambah'} Target Tabungan</h3></div>`;
    form.appendChild(Forms.text('Nama Target', { id: 'name', value: edit?.name || '', required: true, placeholder: 'Contoh: Dana Darurat, Liburan, Laptop' }));
    form.appendChild(Forms.amount('Target Nominal', { id: 'targetAmount', value: edit?.targetAmount || 0, required: true }));
    if (isEdit) form.appendChild(Forms.amount('Saldo Saat Ini', { id: 'currentAmount', value: edit?.currentAmount || 0 }));
    form.appendChild(Forms.date('Target Tanggal', { id: 'targetDate', value: edit?.targetDate || '' }));

    // Icon picker
    const iconGroup = document.createElement('div');
    iconGroup.className = 'form-group';
    iconGroup.innerHTML = `<label>Ikon</label><div class="icon-picker"></div>`;
    const iconPicker = iconGroup.querySelector('.icon-picker');
    ICONS.forEach((ic) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'icon-pick' + (edit?.icon === ic ? ' active' : '');
      b.textContent = ic;
      b.onclick = () => {
        iconPicker.querySelectorAll('.icon-pick').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        iconPicker.dataset.selected = ic;
      };
      if (edit?.icon === ic) iconPicker.dataset.selected = ic;
      iconPicker.appendChild(b);
    });
    if (!edit?.icon) iconPicker.dataset.selected = ICONS[0];
    form.appendChild(iconGroup);

    // Color picker
    const colorGroup = document.createElement('div');
    colorGroup.className = 'form-group';
    colorGroup.innerHTML = `<label>Warna</label><div class="color-picker"></div>`;
    const colorPicker = colorGroup.querySelector('.color-picker');
    COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'color-pick' + (edit?.color === c ? ' active' : '');
      b.style.background = c;
      b.onclick = () => {
        colorPicker.querySelectorAll('.color-pick').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        colorPicker.dataset.selected = c;
      };
      if (edit?.color === c) colorPicker.dataset.selected = c;
      colorPicker.appendChild(b);
    });
    if (!edit?.color) colorPicker.dataset.selected = COLORS[0];
    form.appendChild(colorGroup);

    form.appendChild(Forms.textarea('Catatan', { id: 'note', value: edit?.note || '' }));

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const targetAmount = Forms.amountValue(form.querySelector('#targetAmount'));
      if (!targetAmount) return Toast.error('Target nominal wajib diisi');
      const record = {
        id: edit?.id || DB.uid(),
        name: form.querySelector('#name').value.trim(),
        targetAmount,
        currentAmount: isEdit ? Forms.amountValue(form.querySelector('#currentAmount')) : 0,
        targetDate: form.querySelector('#targetDate').value || null,
        icon: iconPicker.dataset.selected,
        color: colorPicker.dataset.selected,
        status: 'active',
        note: form.querySelector('#note').value,
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('savings', record);
      Toast.success(`Tabungan ${isEdit ? 'diperbarui' : 'ditambahkan'}`);
      if (typeof onSaved === 'function') onSaved(record);
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'md' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  /** Deposit or withdraw for a saving target. */
  async function transact(saving, action = 'deposit', onSaved) {
    const isDeposit = action === 'deposit';
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isDeposit ? 'Setor' : 'Tarik'} Tabungan — ${Utils.escapeHtml(saving.name)}</h3>
      <p class="form-sub">Saldo: <strong>${Utils.formatCurrency(saving.currentAmount, Settings.get('currency'))}</strong></p></div>`;
    form.appendChild(Forms.amount(isDeposit ? 'Jumlah Setoran' : 'Jumlah Penarikan', { id: 'amount', required: true }));
    form.appendChild(Forms.date('Tanggal', { id: 'date', value: Utils.todayISO(), required: true }));
    form.appendChild(Forms.textarea('Catatan', { id: 'note' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="submit" class="btn ${isDeposit ? 'btn-success' : 'btn-danger'}">${isDeposit ? 'Setor' : 'Tarik'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const amount = Forms.amountValue(form.querySelector('#amount'));
      if (!amount) return Toast.error('Masukkan jumlah');
      if (!isDeposit && amount > saving.currentAmount) return Toast.error('Jumlah melebihi saldo');
      await DB.add('savingTransactions', {
        id: DB.uid(),
        savingId: saving.id,
        type: action,
        amount,
        date: form.querySelector('#date').value,
        note: form.querySelector('#note').value,
        createdAt: new Date().toISOString()
      });
      const newBalance = isDeposit ? saving.currentAmount + amount : saving.currentAmount - amount;
      await DB.put('savings', { ...saving, currentAmount: newBalance, status: newBalance >= saving.targetAmount ? 'completed' : 'active' });
      // Auto-create income/expense transaction
      await DB.add('transactions', {
        id: DB.uid(),
        type: isDeposit ? 'expense' : 'income',
        amount,
        date: form.querySelector('#date').value,
        time: new Date().toTimeString().slice(0, 5),
        category: isDeposit ? 'exp-other' : 'inc-other',
        categoryName: isDeposit ? 'Pengeluaran Lain' : 'Pendapatan Lainnya',
        source: `${isDeposit ? 'Setor' : 'Tarik'} tabungan: ${saving.name}`,
        method: 'transfer',
        note: `Transaksi tabungan "${saving.name}"`,
        attachmentId: null,
        createdAt: new Date().toISOString()
      });
      Toast.success(`${isDeposit ? 'Setoran' : 'Penarikan'} tercatat`);
      if (typeof onSaved === 'function') onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  global.SavingForm = { open, transact };
})(window);
