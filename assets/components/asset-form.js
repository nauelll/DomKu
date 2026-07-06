/* ============================================
   DompetKu — asset-form.js + budget-form.js
   Combined file for two short forms.
   ============================================ */

(function (global) {
  'use strict';

  /* ---------- ASSET FORM ---------- */
  async function openAsset(options = {}) {
    const { edit = null, onSaved } = options;
    const isEdit = !!edit;
    const cats = Seed.DEFAULT_ASSET_CATEGORIES;

    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isEdit ? 'Edit' : 'Tambah'} Aset</h3></div>`;
    form.appendChild(Forms.select('Jenis Aset', {
      id: 'type', value: edit?.type || cats[0].id, required: true,
      options: cats.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))
    }));
    form.appendChild(Forms.text('Nama / Keterangan', { id: 'name', value: edit?.name || '', required: true, placeholder: 'Contoh: Rekening BCA, Emas 5gr' }));
    form.appendChild(Forms.amount('Nilai / Saldo', { id: 'value', value: edit?.value || 0, required: true }));
    form.appendChild(Forms.textarea('Catatan', { id: 'note', value: edit?.note || '' }));

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const value = Forms.amountValue(form.querySelector('#value'));
      if (!value) return Toast.error('Nilai wajib diisi');
      const record = {
        id: edit?.id || DB.uid(),
        type: form.querySelector('#type').value,
        name: form.querySelector('#name').value.trim(),
        value,
        note: form.querySelector('#note').value,
        icon: cats.find((c) => c.id === form.querySelector('#type').value)?.icon || '💰',
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('assets', record);
      Toast.success(`Aset ${isEdit ? 'diperbarui' : 'ditambahkan'}`);
      if (typeof onSaved === 'function') onSaved(record);
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'md' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  /* ---------- BUDGET FORM ---------- */
  async function openBudget(options = {}) {
    const { edit = null, onSaved, month = Utils.monthKey() } = options;
    const isEdit = !!edit;
    const cats = (await DB.getAll('categories')).filter((c) => c.type === 'expense');

    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isEdit ? 'Edit' : 'Tambah'} Anggaran</h3></div>`;
    form.appendChild(Forms.select('Kategori', {
      id: 'category', value: edit?.category || '', required: true,
      options: [{ value: '', label: '— Pilih kategori —' }, ...cats.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))]
    }));
    form.appendChild(Forms.amount('Anggaran Bulanan', { id: 'amount', value: edit?.amount || 0, required: true }));
    form.appendChild(Forms.text('Bulan', { id: 'month', value: edit?.month || month, required: true, placeholder: 'YYYY-MM' }));

    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const category = form.querySelector('#category').value;
      const amount = Forms.amountValue(form.querySelector('#amount'));
      if (!category) return Toast.error('Pilih kategori');
      if (!amount) return Toast.error('Masukkan nominal anggaran');
      const cat = cats.find((c) => c.id === category);
      const record = {
        id: edit?.id || DB.uid(),
        category,
        categoryName: cat?.name || '',
        month: form.querySelector('#month').value,
        amount,
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('budgets', record);
      Toast.success(`Anggaran ${isEdit ? 'diperbarui' : 'ditambahkan'}`);
      if (typeof onSaved === 'function') onSaved(record);
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  global.AssetForm = { open: openAsset };
  global.BudgetForm = { open: openBudget };
})(window);
