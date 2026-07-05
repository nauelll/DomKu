/* ============================================
   DompetKu — settings-page.js
   All settings: security, appearance, categories, data management.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('settings-page', async (container) => {
    const s = Settings.getAll();
    const currency = Settings.get('currency');
    container.innerHTML = `
      <div class="page page-settings">
        <header class="page-head"><div><h1>Pengaturan</h1><p class="muted">Kelola preferensi aplikasi</p></div></header>

        <!-- Security -->
        <section class="card">
          <div class="card-head"><h3>🔐 Keamanan</h3></div>
          <div class="settings-list">
            <div class="setting-row">
              <div><div class="setting-label">PIN Aplikasi</div><div class="muted small">PIN 4-6 digit untuk membuka aplikasi</div></div>
              <button class="btn btn-outline btn-sm" data-act="set-pin">${s.pin ? 'Ganti PIN' : 'Aktifkan PIN'}</button>
            </div>
            ${s.pin ? `<div class="setting-row"><div><div class="setting-label">Nonaktifkan PIN</div></div><button class="btn btn-ghost btn-sm" data-act="clear-pin">Nonaktifkan</button></div>` : ''}
            <div class="setting-row">
              <div><div class="setting-label">Auto Lock</div><div class="muted small">Kunci otomatis saat idle</div></div>
              <select data-set="autoLockMinutes" class="select-sm">
                <option value="0">Jangan</option>
                <option value="1" ${s.autoLockMinutes == 1 ? 'selected' : ''}>1 menit</option>
                <option value="5" ${s.autoLockMinutes == 5 ? 'selected' : ''}>5 menit</option>
                <option value="15" ${s.autoLockMinutes == 15 ? 'selected' : ''}>15 menit</option>
                <option value="30" ${s.autoLockMinutes == 30 ? 'selected' : ''}>30 menit</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Appearance -->
        <section class="card">
          <div class="card-head"><h3>🎨 Tampilan</h3></div>
          <div class="settings-list">
            <div class="setting-row">
              <div><div class="setting-label">Tema</div></div>
              <select data-set="theme" class="select-sm">
                <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Terang</option>
                <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Gelap</option>
                <option value="system" ${s.theme === 'system' ? 'selected' : ''}>Ikuti Sistem</option>
              </select>
            </div>
            <div class="setting-row">
              <div><div class="setting-label">Warna Aksen</div></div>
              <div class="color-palette">
                ${Object.entries(Theme.PALETTES).map(([key, p]) => `
                  <button class="color-swatch ${s.accentColor.toLowerCase() === p.primary.toLowerCase() ? 'active' : ''}" data-accent="${p.primary}" style="background:${p.primary}" title="${p.name}"></button>
                `).join('')}
              </div>
            </div>
          </div>
        </section>

        <!-- Localization -->
        <section class="card">
          <div class="card-head"><h3>🌍 Lokalisasi</h3></div>
          <div class="settings-list">
            <div class="setting-row"><div><div class="setting-label">Mata Uang</div></div>
              <select data-set="currency" class="select-sm">
                <option value="IDR" ${s.currency === 'IDR' ? 'selected' : ''}>IDR (Rp)</option>
                <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                <option value="EUR" ${s.currency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                <option value="SGD" ${s.currency === 'SGD' ? 'selected' : ''}>SGD (S$)</option>
                <option value="MYR" ${s.currency === 'MYR' ? 'selected' : ''}>MYR (RM)</option>
                <option value="JPY" ${s.currency === 'JPY' ? 'selected' : ''}>JPY (¥)</option>
              </select>
            </div>
            <div class="setting-row"><div><div class="setting-label">Format Tanggal</div></div>
              <select data-set="dateFormat" class="select-sm">
                <option value="DD/MM/YYYY" ${s.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
                <option value="MM/DD/YYYY" ${s.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
                <option value="YYYY-MM-DD" ${s.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
                <option value="DD MMM YYYY" ${s.dateFormat === 'DD MMM YYYY' ? 'selected' : ''}>DD MMM YYYY</option>
                <option value="DD MMMM YYYY" ${s.dateFormat === 'DD MMMM YYYY' ? 'selected' : ''}>DD MMMM YYYY</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Categories -->
        <section class="card">
          <div class="card-head"><h3>📁 Kategori</h3><button class="btn btn-primary btn-sm" data-act="add-cat">+ Kategori</button></div>
          <div data-cats></div>
        </section>

        <!-- Data management -->
        <section class="card">
          <div class="card-head"><h3>💾 Data & Backup</h3></div>
          <div class="settings-list">
            <div class="setting-row"><div><div class="setting-label">Backup Manual</div><div class="muted small">Export seluruh data ke file JSON</div></div>
              <button class="btn btn-outline btn-sm" data-act="backup">Backup</button>
            </div>
            <div class="setting-row"><div><div class="setting-label">Backup Terenkripsi</div><div class="muted small">Backup dengan password (AES-GCM)</div></div>
              <button class="btn btn-outline btn-sm" data-act="backup-enc">Backup Enkripsi</button>
            </div>
            <div class="setting-row"><div><div class="setting-label">Restore Data</div><div class="muted small">Import dari file backup (akan menimpa data saat ini)</div></div>
              <button class="btn btn-outline btn-sm" data-act="restore">Restore</button>
            </div>
            <div class="setting-row"><div><div class="setting-label">Export ke CSV</div></div>
              <button class="btn btn-outline btn-sm" data-act="exp-csv">Export</button>
            </div>
            <div class="setting-row"><div><div class="setting-label">Export ke Excel (XLSX)</div></div>
              <button class="btn btn-outline btn-sm" data-act="exp-xlsx">Export</button>
            </div>
            <div class="setting-row"><div><div class="setting-label">Import dari CSV/JSON</div></div>
              <button class="btn btn-outline btn-sm" data-act="import">Import</button>
            </div>
            <div class="setting-row"><div><div class="setting-label text-danger">Reset Semua Data</div><div class="muted small">Hapus seluruh data & mulai dari awal</div></div>
              <button class="btn btn-danger btn-sm" data-act="reset">Reset</button>
            </div>
          </div>
        </section>

        <!-- About -->
        <section class="card">
          <div class="card-head"><h3>Tentang</h3></div>
          <div class="about-info">
            <div class="setting-row"><div>DompetKu v1.0</div><div class="muted small">PWA Catatan Keuangan</div></div>
            <div class="setting-row"><div>Storage</div><div class="muted small">IndexedDB (offline-first)</div></div>
            <div class="setting-row"><div>Lisensi</div><div class="muted small">Free for personal use</div></div>
          </div>
        </section>
      </div>`;

    // Bind settings changes
    container.querySelectorAll('[data-set]').forEach((sel) => {
      sel.onchange = async () => {
        const key = sel.dataset.set;
        const value = sel.value;
        if (key === 'theme') Theme.setMode(value);
        else if (key === 'currency') await Settings.set('currency', value);
        else await Settings.set(key, isNaN(value) ? value : Number(value));
        Toast.success('Pengaturan disimpan');
      };
    });

    // Accent color
    container.querySelectorAll('[data-accent]').forEach((sw) => {
      sw.onclick = () => {
        Theme.setAccent(sw.dataset.accent);
        container.querySelectorAll('.color-swatch').forEach((x) => x.classList.remove('active'));
        sw.classList.add('active');
        Toast.success('Warna aksen diperbarui');
      };
    });

    // Security actions
    container.querySelector('[data-act="set-pin"]').onclick = async () => {
      const pin = prompt('Masukkan PIN baru (4-6 digit):');
      if (!pin) return;
      if (!/^\d{4,6}$/.test(pin)) return Toast.error('PIN harus 4-6 digit angka');
      const confirm = prompt('Konfirmasi PIN:');
      if (pin !== confirm) return Toast.error('PIN tidak cocok');
      await Auth.setPin(pin);
      Toast.success('PIN aktif');
    };
    const clearPinBtn = container.querySelector('[data-act="clear-pin"]');
    if (clearPinBtn) clearPinBtn.onclick = async () => {
      if (await Modal.confirm('Nonaktifkan PIN? Aplikasi bisa dibuka tanpa keamanan.', { danger: true })) {
        await Auth.clearPin();
        Toast.success('PIN dinonaktifkan');
        Router.refresh();
      }
    };

    // Categories
    await renderCats(container);

    // Data actions
    container.querySelector('[data-act="backup"]').onclick = () => Backup.backup(false);
    container.querySelector('[data-act="backup-enc"]').onclick = () => Backup.backup(true);
    container.querySelector('[data-act="restore"]').onclick = () => Backup.restore();
    container.querySelector('[data-act="exp-csv"]').onclick = async () => {
      const txs = await DB.getAll('transactions');
      Exporter.exportTransactions(txs, 'csv');
    };
    container.querySelector('[data-act="exp-xlsx"]').onclick = async () => {
      const txs = await DB.getAll('transactions');
      Exporter.exportTransactions(txs, 'xlsx');
    };
    container.querySelector('[data-act="import"]').onclick = () => Importer.import();
    container.querySelector('[data-act="reset"]').onclick = async () => {
      if (await Modal.confirm('Yakin reset SEMUA data? Tindakan ini tidak dapat dibatalkan.', { danger: true, okText: 'Reset Sekarang' })) {
        for (const store of Object.keys(DB.STORES)) {
          if (store !== 'settings') await DB.clear(store);
        }
        await Seed.seedAll(true);
        Toast.success('Data direset');
        Router.go('dashboard');
      }
    };

    container.querySelector('[data-act="add-cat"]').onclick = () => openCatForm(() => renderCats(container));
  });

  async function renderCats(container) {
    const cats = await DB.getAll('categories');
    const grouped = Utils.groupBy(cats, (c) => c.type);
    const wrap = container.querySelector('[data-cats]');
    wrap.innerHTML = ['income', 'expense'].map((type) => {
      const items = grouped[type] || [];
      const label = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      return `
        <div class="cat-group">
          <h4>${label} (${items.length})</h4>
          <div class="cat-list">
            ${items.map((c) => `
              <div class="cat-item">
                <span class="cat-icon" style="background:${c.color}22;color:${c.color}">${c.icon}</span>
                <span class="cat-name">${Utils.escapeHtml(c.name)}</span>
                ${c.isDefault ? '<span class="badge">Bawaan</span>' : ''}
                <button class="icon-btn sm" data-edit-cat="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                ${!c.isDefault ? `<button class="icon-btn sm" data-del-cat="${c.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>` : ''}
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('[data-edit-cat]').forEach((b) => b.onclick = async () => {
      const c = await DB.get('categories', b.dataset.editCat);
      openCatForm(() => renderCats(container), c);
    });
    wrap.querySelectorAll('[data-del-cat]').forEach((b) => b.onclick = async () => {
      if (await Modal.confirm('Hapus kategori ini?', { danger: true, okText: 'Hapus' })) {
        await DB.remove('categories', b.dataset.delCat);
        Toast.success('Kategori dihapus');
        renderCats(container);
      }
    });
  }

  function openCatForm(onSaved, edit = null) {
    const isEdit = !!edit;
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>${isEdit ? 'Edit' : 'Tambah'} Kategori</h3></div>`;
    form.appendChild(Forms.select('Jenis', { id: 'type', value: edit?.type || 'expense', required: true, options: [{ value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }] }));
    form.appendChild(Forms.text('Nama', { id: 'name', value: edit?.name || '', required: true }));
    form.appendChild(Forms.text('Ikon (emoji)', { id: 'icon', value: edit?.icon || '📁', placeholder: 'Contoh: 🍽️' }));
    form.appendChild(Forms.text('Warna (hex)', { id: 'color', value: edit?.color || '#10B981', placeholder: '#10B981' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button><button type="submit" class="btn btn-primary">${isEdit ? 'Simpan' : 'Tambah'}</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const record = {
        id: edit?.id || DB.uid(),
        type: form.querySelector('#type').value,
        name: form.querySelector('#name').value.trim(),
        icon: form.querySelector('#icon').value || '📁',
        color: form.querySelector('#color').value || '#10B981',
        isDefault: edit?.isDefault || false,
        createdAt: edit?.createdAt || new Date().toISOString()
      };
      await DB.put('categories', record);
      Toast.success('Kategori disimpan');
      onSaved();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };
    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }
})(window);
