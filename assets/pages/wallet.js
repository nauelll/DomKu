/* ============================================
   DomKu — wallet.js (page)
   Wallet management: list, create, invite, switch.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('wallet', async (container, params = {}) => {
    // If arriving with invitation acceptance params
    if (params.accept && params.code) {
      await handleAcceptInvitation(container, params.accept, params.code);
      return;
    }

    // Require auth
    if (Firebase.isConfigured() && !AuthFB.isLoggedIn) {
      Router.go('login');
      return;
    }

    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div>
            <h1>Wallet</h1>
            <p class="muted">Kelola wallet pribadi & bersama dengan pasangan</p>
          </div>
          <button class="btn btn-primary btn-sm" data-act="create">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Buat Wallet
          </button>
        </header>

        <div data-wallets class="wallet-grid"></div>

        <div class="card" data-invitations style="display:none">
          <div class="card-head"><h3>Undangan Masuk</h3></div>
          <div data-invite-list></div>
        </div>
      </div>`;

    const walletsEl = container.querySelector('[data-wallets]');
    const inviteCard = container.querySelector('[data-invitations]');
    const inviteListEl = container.querySelector('[data-invite-list]');

    async function loadWallets() {
      const wallets = await Wallet.list();
      if (!wallets.length) {
        walletsEl.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-illustration"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg></div>
            <h3>Belum ada wallet</h3>
            <p>Buat wallet pribadi untuk mulai mencatat keuangan, atau wallet bersama dengan pasangan.</p>
          </div>`;
        return;
      }
      const current = Wallet.getCurrent();
      walletsEl.innerHTML = wallets.map((w) => walletCard(w, current?.id === w.id)).join('');
      // Bind clicks
      walletsEl.querySelectorAll('[data-switch]').forEach((el) => {
        el.onclick = async () => {
          await Wallet.setCurrent(el.dataset.switch);
          Toast.success(`Beralih ke ${Wallet.getCurrent().name}`);
          Router.go('dashboard');
        };
      });
      walletsEl.querySelectorAll('[data-invite]').forEach((el) => {
        el.onclick = () => showInviteModal(el.dataset.invite, el.dataset.name);
      });
      walletsEl.querySelectorAll('[data-rename]').forEach((el) => {
        el.onclick = () => showRenameModal(el.dataset.rename, el.dataset.name, el.dataset.emoji);
      });
      walletsEl.querySelectorAll('[data-leave]').forEach((el) => {
        el.onclick = async () => {
          if (await Modal.confirm('Yakin keluar dari wallet ini? Anda tidak akan bisa mengakses datanya lagi.', { danger: true, okText: 'Keluar' })) {
            try {
              await Wallet.leave(el.dataset.leave);
              loadWallets();
            } catch (e) { Toast.error(e.message); }
          }
        };
      });
      walletsEl.querySelectorAll('[data-delete]').forEach((el) => {
        el.onclick = async () => {
          if (await Modal.confirm('Yakin HAPUS wallet ini? SEMUA data (transaksi, utang, tabungan, dll) akan dihapus permanen!', { danger: true, okText: 'Hapus Permanen' })) {
            try {
              await Wallet.delete(el.dataset.delete);
              loadWallets();
            } catch (e) { Toast.error(e.message); }
          }
        };
      });
    }

    async function loadInvitations() {
      const invites = await Wallet.listMyInvitations();
      if (invites.length === 0) {
        inviteCard.style.display = 'none';
        return;
      }
      inviteCard.style.display = 'flex';
      inviteListEl.innerHTML = invites.map((i) => `
        <div class="audit-item">
          <div class="audit-avatar">${(i.inviterName || '?').charAt(0).toUpperCase()}</div>
          <div class="audit-body">
            <div class="audit-text"><strong>${Utils.escapeHtml(i.inviterName)}</strong> mengundang Anda ke wallet <strong>${Utils.escapeHtml(i.walletName)}</strong></div>
            <div class="audit-time">Kedaluwarsa: ${Utils.formatDate(i.expiresAt, 'DD MMM YYYY')}</div>
            <div class="wallet-card-actions" style="margin-top:8px">
              <button class="btn btn-success btn-sm" data-accept="${i.id}" data-code="${i.code}">Terima</button>
              <button class="btn btn-ghost btn-sm" data-reject="${i.id}">Tolak</button>
            </div>
          </div>
        </div>`).join('');
      inviteListEl.querySelectorAll('[data-accept]').forEach((b) => {
        b.onclick = async () => {
          try {
            await Wallet.acceptInvitation(b.dataset.accept, b.dataset.code);
            loadWallets();
            loadInvitations();
          } catch (e) { Toast.error(e.message); }
        };
      });
      inviteListEl.querySelectorAll('[data-reject]').forEach((b) => {
        b.onclick = async () => {
          await Firebase.updateDoc(Firebase.doc(Firebase.db, 'invitations', b.dataset.reject), { status: 'rejected' });
          loadInvitations();
        };
      });
    }

    container.querySelector('[data-act="create"]').onclick = () => showCreateModal(loadWallets);

    await loadWallets();
    await loadInvitations();
  });

  function walletCard(w, isActive) {
    const members = Object.values(w.memberInfo || {});
    return `
      <div class="wallet-card ${isActive ? 'active' : ''}" data-switch="${w.id}">
        <div class="wallet-card-head">
          <div class="wallet-card-icon" style="background:${Utils.colorFromString(w.id)}22;color:${Utils.colorFromString(w.id)}">${w.emoji || '💰'}</div>
          ${isActive ? '<span class="badge badge-success">Aktif</span>' : ''}
        </div>
        <div>
          <div class="wallet-card-name">${Utils.escapeHtml(w.name)}</div>
          <div class="wallet-card-meta">${w.type === 'couple' ? 'Wallet Bersama' : 'Wallet Pribadi'} · Dibuat ${Utils.formatDate(w.createdAt, 'DD MMM YYYY')}</div>
        </div>
        <div class="wallet-members">
          ${members.slice(0, 5).map((m) => `<div class="wallet-member-avatar" title="${Utils.escapeHtml(m.displayName)}">${(m.displayName || '?').charAt(0).toUpperCase()}</div>`).join('')}
          ${members.length > 5 ? `<span class="wallet-member-count">+${members.length - 5}</span>` : ''}
          <span class="wallet-member-count">${members.length} anggota</span>
        </div>
        <div class="wallet-card-actions">
          ${!isActive ? '<button class="btn btn-primary btn-sm" data-switch="' + w.id + '">Gunakan</button>' : ''}
          ${w.type === 'couple' ? `<button class="btn btn-outline btn-sm" data-invite="${w.id}" data-name="${Utils.escapeHtml(w.name)}">Undang</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-rename="${w.id}" data-name="${Utils.escapeHtml(w.name)}" data-emoji="${w.emoji || '💰'}">Ubah</button>
          ${w.ownerId === AuthFB.currentUser?.uid
            ? `<button class="btn btn-ghost btn-sm" data-delete="${w.id}">Hapus</button>`
            : `<button class="btn btn-ghost btn-sm" data-leave="${w.id}">Keluar</button>`}
        </div>
      </div>`;
  }

  function showCreateModal(onDone) {
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>Buat Wallet Baru</h3></div>`;
    form.appendChild(Forms.text('Nama Wallet', { id: 'name', required: true, placeholder: 'Contoh: DomKu Keluarga' }));
    form.appendChild(Forms.select('Jenis', { id: 'type', required: true, options: [
      { value: 'personal', label: '💼 Pribadi — hanya saya' },
      { value: 'couple', label: '💑 Bersama — dengan pasangan' }
    ]}));
    form.appendChild(Forms.text('Emoji / Ikon', { id: 'emoji', value: '💰', placeholder: '💰' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button><button type="submit" class="btn btn-primary">Buat</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = form.querySelector('#name').value.trim();
      const type = form.querySelector('#type').value;
      const emoji = form.querySelector('#emoji').value || '💰';
      if (!name) return Toast.error('Nama wajib diisi');
      try {
        await Wallet.create(name, type, emoji);
        Toast.success('Wallet dibuat');
        onDone();
        const overlay = form.closest('.modal-overlay');
        if (overlay) overlay.querySelector('.modal-close').click();
        Router.go('dashboard');
      } catch (e) { Toast.error(e.message); }
    };

    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  async function showInviteModal(walletId, walletName) {
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>Undang Pasangan</h3><p class="form-sub">Wallet: <strong>${Utils.escapeHtml(walletName)}</strong></p></div>`;
    form.appendChild(Forms.text('Email Pasangan (opsional)', { id: 'email', type: 'email', placeholder: 'pasangan@email.com' }));
    const inviteResult = document.createElement('div');
    inviteResult.dataset.result = '';
    form.appendChild(inviteResult);
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Tutup</button><button type="submit" class="btn btn-primary">Buat Undangan</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = form.querySelector('#email').value.trim() || null;
      try {
        const invite = await Wallet.createInvitation(walletId, email);
        const link = Wallet.getShareLink(invite);
        inviteResult.innerHTML = `
          <div class="invite-card">
            <p>Kirim kode ini ke pasangan:</p>
            <div class="invite-code">${invite.code}</div>
            <p>Atau share link ini:</p>
            <a class="invite-link" href="${link}">${link}</a>
            <div class="wallet-card-actions" style="justify-content:center;margin-top:12px">
              <button type="button" class="btn btn-outline btn-sm" data-copy-code="${invite.code}">Salin Kode</button>
              <button type="button" class="btn btn-outline btn-sm" data-copy-link="${link}">Salin Link</button>
              <button type="button" class="btn btn-outline btn-sm" data-share>Share</button>
            </div>
            <p class="muted small" style="margin-top:12px">Kedaluwarsa: ${Utils.formatDate(invite.expiresAt, 'DD MMM YYYY HH:mm')}</p>
          </div>`;
        inviteResult.querySelectorAll('[data-copy-code]').forEach((b) => {
          b.onclick = async () => {
            await Utils.copyToClipboard(b.dataset.copyCode);
            Toast.success('Kode disalin');
          };
        });
        inviteResult.querySelectorAll('[data-copy-link]').forEach((b) => {
          b.onclick = async () => {
            await Utils.copyToClipboard(b.dataset.copyLink);
            Toast.success('Link disalin');
          };
        });
        inviteResult.querySelector('[data-share]').onclick = async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title: 'Undangan DomKu', text: `Bergabung ke wallet ${walletName} di DomKu!`, url: link });
            } catch (e) {}
          } else {
            await Utils.copyToClipboard(link);
            Toast.success('Link disalin');
          }
        };
      } catch (e) { Toast.error(e.message); }
    };

    const { close } = Modal.open(form, { size: 'md' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  function showRenameModal(walletId, name, emoji) {
    const form = document.createElement('form');
    form.className = 'form';
    form.innerHTML = `<div class="form-head"><h3>Ubah Wallet</h3></div>`;
    form.appendChild(Forms.text('Nama', { id: 'name', value: name, required: true }));
    form.appendChild(Forms.text('Emoji', { id: 'emoji', value: emoji || '💰' }));
    const actions = document.createElement('div');
    actions.className = 'form-actions';
    actions.innerHTML = `<button type="button" class="btn btn-ghost" data-act="cancel">Batal</button><button type="submit" class="btn btn-primary">Simpan</button>`;
    form.appendChild(actions);

    form.onsubmit = async (e) => {
      e.preventDefault();
      await Wallet.rename(walletId, form.querySelector('#name').value.trim(), form.querySelector('#emoji').value);
      Toast.success('Wallet diperbarui');
      Router.refresh();
      const overlay = form.closest('.modal-overlay');
      if (overlay) overlay.querySelector('.modal-close').click();
    };

    const { close } = Modal.open(form, { size: 'sm' });
    form.querySelector('[data-act="cancel"]').onclick = () => close();
  }

  async function handleAcceptInvitation(container, inviteId, code) {
    container.innerHTML = `<div class="page"><div class="card"><div class="card-head"><h3>Memproses undangan...</h3></div></div></div>`;
    if (!AuthFB.isLoggedIn) {
      Toast.info('Silakan login dulu untuk menerima undangan');
      setTimeout(() => Router.go('login'), 1500);
      return;
    }
    try {
      const wallet = await Wallet.acceptInvitation(inviteId, code);
      Toast.success(`Berhasil bergabung ke ${wallet.name}`);
      Router.go('dashboard');
    } catch (e) {
      container.innerHTML = `<div class="page"><div class="empty-state"><h3>Gagal Menerima Undangan</h3><p>${Utils.escapeHtml(e.message)}</p><a href="#/dashboard" class="btn btn-primary">Kembali ke Dashboard</a></div></div>`;
    }
  }
})(window);
