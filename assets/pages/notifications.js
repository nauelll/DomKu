/* ============================================
   DomKu — notifications.js
   In-app notification center.
   ============================================ */

(function (global) {
  'use strict';

  Router.register('notifications', async (container) => {
    if (Firebase.isConfigured() && !AuthFB.isLoggedIn) { Router.go('login'); return; }

    container.innerHTML = `
      <div class="page">
        <header class="page-head">
          <div>
            <h1>Notifikasi</h1>
            <p class="muted">Aktivitas terbaru dari wallet bersama Anda</p>
          </div>
          <button class="btn btn-outline btn-sm" data-act="mark-all">Tandai Semua Dibaca</button>
        </header>
        <div data-list></div>
      </div>`;

    const listEl = container.querySelector('[data-list]');

    async function load() {
      const items = await Notify.listNotifications();
      if (!items.length) {
        listEl.innerHTML = `<div class="empty-state">
          <div class="empty-illustration"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
          <h3>Tidak ada notifikasi</h3>
          <p>Notifikasi dari aktivitas pasangan akan muncul di sini.</p>
        </div>`;
        return;
      }
      listEl.innerHTML = items.map((n) => `
        <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
          <div class="notif-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/></svg>
          </div>
          <div class="notif-body">
            <div class="notif-title">${Utils.escapeHtml(n.title)}</div>
            <div class="notif-text">${Utils.escapeHtml(n.text)}</div>
            <div class="notif-time">${Utils.formatDateTime(n.createdAt)}</div>
          </div>
          ${!n.read ? '<button class="icon-btn sm" data-read="' + n.id + '" title="Tandai dibaca"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></button>' : ''}
        </div>`).join('');

      listEl.querySelectorAll('[data-read]').forEach((b) => {
        b.onclick = async () => {
          await Notify.markAsRead(b.dataset.read);
          load();
        };
      });
    }

    container.querySelector('[data-act="mark-all"]').onclick = async () => {
      await Notify.markAllRead();
      load();
    };

    await load();
  });
})(window);
