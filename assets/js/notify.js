/* ============================================
   DomKu — notify.js
   In-app notifications.
   - Listen to wallet changes (audit logs)
   - Show toast when partner adds/edits transaction
   - Persist unread notifications in Firestore + IndexedDB cache
   ============================================ */

(function (global) {
  'use strict';

  let unsubAudit = null;
  let lastAuditId = null;
  let unreadCount = 0;

  const Notify = {
    init() {
      // Listen to audit log changes for current wallet
      document.addEventListener('dompetku:wallet-change', (e) => {
        if (e.detail.wallet) this.startListening(e.detail.wallet.id);
        else this.stopListening();
      });
      // Check for pending invitations on login
      document.addEventListener('dompetku:auth', (e) => {
        if (e.detail.user) {
          setTimeout(() => this.checkInvitations(), 1500);
        }
      });
    },

    startListening(walletId) {
      this.stopListening();
      if (!Firebase.isConfigured() || !walletId) return;
      try {
        const q = Firebase.query(
          Firebase.collection(Firebase.db, 'wallets', walletId, 'auditLogs'),
          Firebase.orderBy('createdAt', 'desc'),
          Firebase.limit(1)
        );
        unsubAudit = Firebase.onSnapshot(q, (snap) => {
          if (snap.empty) return;
          const latest = snap.docs[0].data();
          // Skip if same as last seen (initial load)
          if (lastAuditId === null) {
            lastAuditId = latest.id;
            return;
          }
          if (latest.id === lastAuditId) return;
          lastAuditId = latest.id;
          // Skip own actions
          if (latest.userId === AuthFB.currentUser?.uid) return;
          // Show notification
          this.showToast(latest);
          this.saveNotification(latest);
        }, (err) => console.warn('[Notify] audit listener error:', err));
      } catch (e) {}
    },

    stopListening() {
      if (unsubAudit) { try { unsubAudit(); } catch (e) {} unsubAudit = null; }
      lastAuditId = null;
    },

    showToast(audit) {
      const user = audit.userName || 'Seseorang';
      let msg = '';
      if (audit.action === 'create' && audit.entity === 'transaction') {
        const type = audit.details.type === 'income' ? 'pemasukan' : 'pengeluaran';
        const amt = Utils.formatCurrency(audit.details.amount || 0, Settings.get('currency'));
        msg = `${user} menambah ${type} ${amt}`;
      } else if (audit.action === 'update' && audit.entity === 'transaction') {
        msg = `${user} mengubah transaksi`;
      } else if (audit.action === 'delete' && audit.entity === 'transaction') {
        msg = `${user} menghapus transaksi`;
      } else if (audit.action === 'create' && audit.entity === 'debt') {
        msg = `${user} menambah utang`;
      } else if (audit.action === 'create' && audit.entity === 'saving') {
        msg = `${user} menambah target tabungan`;
      } else {
        msg = `${user} ${audit.action} ${audit.entity}`;
      }
      Toast.info(msg, { duration: 4000 });
    },

    async saveNotification(audit) {
      const user = AuthFB.currentUser;
      if (!user) return;
      const notif = {
        id: DB.uid(),
        userId: user.uid,
        walletId: audit.walletId,
        title: audit.userName || 'Notifikasi',
        text: this.toastText(audit),
        type: 'audit',
        auditId: audit.id,
        read: false,
        createdAt: new Date().toISOString()
      };
      try {
        await Firebase.setDoc(Firebase.doc(Firebase.db, 'notifications', notif.id), notif);
      } catch (e) { /* ignore */ }
      unreadCount++;
      this.updateBadge();
    },

    toastText(audit) {
      const user = audit.userName || 'Seseorang';
      if (audit.action === 'create' && audit.entity === 'transaction') {
        const type = audit.details.type === 'income' ? 'pemasukan' : 'pengeluaran';
        const amt = Utils.formatCurrency(audit.details.amount || 0, Settings.get('currency'));
        return `${user} menambah ${type} ${amt}`;
      }
      return `${user} ${audit.action} ${audit.entity}`;
    },

    async listNotifications() {
      if (!AuthFB.isLoggedIn) return [];
      try {
        const q = Firebase.query(
          Firebase.collection(Firebase.db, 'notifications'),
          Firebase.where('userId', '==', AuthFB.currentUser.uid),
          Firebase.orderBy('createdAt', 'desc'),
          Firebase.limit(50)
        );
        const snap = await Firebase.getDocs(q);
        return snap.docs.map((d) => d.data());
      } catch (e) {
        return [];
      }
    },

    async markAsRead(notifId) {
      try {
        await Firebase.updateDoc(Firebase.doc(Firebase.db, 'notifications', notifId), { read: true });
        if (unreadCount > 0) unreadCount--;
        this.updateBadge();
      } catch (e) {}
    },

    async markAllRead() {
      const list = await this.listNotifications();
      const unread = list.filter((n) => !n.read);
      for (const n of unread) await this.markAsRead(n.id);
      unreadCount = 0;
      this.updateBadge();
    },

    async refreshUnreadCount() {
      const list = await this.listNotifications();
      unreadCount = list.filter((n) => !n.read).length;
      this.updateBadge();
    },

    updateBadge() {
      document.querySelectorAll('[data-notif-count]').forEach((badge) => {
        if (unreadCount > 0) {
          badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      });
    },

    async checkInvitations() {
      const invites = await Wallet.listMyInvitations();
      if (invites.length > 0) {
        const invite = invites[0];
        const accept = await Modal.confirm(
          `${invite.inviterName} mengundang Anda ke wallet "${invite.walletName}". Terima undangan?`,
          { title: 'Undangan Wallet Bersama', okText: 'Terima', cancelText: 'Tolak' }
        );
        if (accept) {
          try {
            await Wallet.acceptInvitation(invite.id, invite.code);
            Router.refresh();
          } catch (e) {
            Toast.error('Gagal menerima undangan: ' + e.message);
          }
        } else {
          await Firebase.updateDoc(Firebase.doc(Firebase.db, 'invitations', invite.id), { status: 'rejected' });
        }
      }
    }
  };

  global.Notify = Notify;
})(window);
