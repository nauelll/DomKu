/* ============================================
   DomKu — wallet.js
   Wallet manager: personal + couple wallets.
   - Create wallet
   - Invite partner (email / code / share link)
   - Accept/reject invitation
   - Switch active wallet
   - Member management
   ============================================ */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'domku-current-wallet';
  let currentWallet = null;
  let unsubWallets = null;
  let unsubInvites = null;

  const Wallet = {
    init() {
      // Restore last used wallet from localStorage (fast init)
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          currentWallet = parsed;
          DB.setWallet(parsed.id);
        }
      } catch (e) {}
    },

    getCurrent() { return currentWallet; },

    async setCurrent(walletId) {
      if (!walletId) return;
      // Fetch wallet doc
      try {
        const snap = await Firebase.getDoc(Firebase.doc(Firebase.db, 'wallets', walletId));
        if (snap.exists()) {
          currentWallet = snap.data();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWallet));
          await DB.setWallet(walletId);
          document.dispatchEvent(new CustomEvent('dompetku:wallet-change', { detail: { wallet: currentWallet } }));
          return currentWallet;
        }
      } catch (e) {
        console.warn('[Wallet] Failed to set current:', e);
      }
      return null;
    },

    clearCurrent() {
      currentWallet = null;
      localStorage.removeItem(STORAGE_KEY);
      DB.setWallet(null);
      document.dispatchEvent(new CustomEvent('dompetku:wallet-change', { detail: { wallet: null } }));
    },

    /** List all wallets the current user is a member of. */
    async list() {
      if (!Firebase.isConfigured() || !AuthFB.isLoggedIn) return [];
      try {
        // Query wallets where members has uid=true
        const q = Firebase.query(
          Firebase.collection(Firebase.db, 'wallets'),
          Firebase.where(`members.${AuthFB.currentUser.uid}`, '==', true)
        );
        const snap = await Firebase.getDocs(q);
        return snap.docs.map((d) => d.data());
      } catch (e) {
        console.warn('[Wallet] list failed:', e);
        return [];
      }
    },

    /** Start real-time listener for user's wallets. */
    subscribeWallets(cb) {
      if (unsubWallets) unsubWallets();
      if (!Firebase.isConfigured() || !AuthFB.isLoggedIn) {
        cb([]);
        return () => {};
      }
      try {
        const q = Firebase.query(
          Firebase.collection(Firebase.db, 'wallets'),
          Firebase.where(`members.${AuthFB.currentUser.uid}`, '==', true)
        );
        unsubWallets = Firebase.onSnapshot(q, (snap) => {
          const wallets = snap.docs.map((d) => d.data());
          cb(wallets);
        }, (err) => console.warn('[Wallet] subscribe error:', err));
        return unsubWallets;
      } catch (e) {
        cb([]);
        return () => {};
      }
    },

    /** Create a new wallet. Type: 'personal' | 'couple'. */
    async create(name, type = 'personal', emoji = '💰') {
      if (!AuthFB.isLoggedIn) throw new Error('Belum login');
      const user = AuthFB.currentUser;
      const walletId = DB.uid();
      const wallet = {
        id: walletId,
        name,
        type,
        emoji,
        ownerId: user.uid,
        members: { [user.uid]: true },
        memberInfo: {
          [user.uid]: {
            uid: user.uid,
            displayName: user.displayName || user.email || 'Saya',
            photoURL: user.photoURL || '',
            role: 'owner',
            joinedAt: new Date().toISOString()
          }
        },
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      };
      await Firebase.setDoc(Firebase.doc(Firebase.db, 'wallets', walletId), wallet);
      // Update user's wallets list
      const userRef = Firebase.doc(Firebase.db, 'users', user.uid);
      const userSnap = await Firebase.getDoc(userRef);
      if (userSnap.exists()) {
        const wallets = userSnap.data().wallets || [];
        if (!wallets.includes(walletId)) wallets.push(walletId);
        const defaultWalletId = userSnap.data().defaultWalletId || walletId;
        await Firebase.updateDoc(userRef, { wallets, defaultWalletId });
      }
      // Auto-set as current
      await this.setCurrent(walletId);
      await DB.log('create', 'wallet', walletId, { name, type });
      return wallet;
    },

    /** Generate invitation. */
    async createInvitation(walletId, inviteeEmail = null) {
      if (!AuthFB.isLoggedIn) throw new Error('Belum login');
      const user = AuthFB.currentUser;
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const inviteId = DB.uid();
      const invite = {
        id: inviteId,
        walletId,
        walletName: currentWallet?.name || 'Wallet',
        inviterId: user.uid,
        inviterName: user.displayName || user.email || 'Seseorang',
        inviterPhoto: user.photoURL || '',
        inviteeEmail,
        code,
        status: 'pending', // 'pending' | 'accepted' | 'rejected' | 'expired'
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };
      await Firebase.setDoc(Firebase.doc(Firebase.db, 'invitations', inviteId), invite);
      return invite;
    },

    /** Generate share link (deep link to accept invitation). */
    getShareLink(invite) {
      const base = window.location.origin + window.location.pathname;
      return `${base}#/wallet?accept=${invite.id}&code=${invite.code}`;
    },

    /** List pending invitations for current user (by email). */
    async listMyInvitations() {
      if (!AuthFB.isLoggedIn) return [];
      try {
        const q = Firebase.query(
          Firebase.collection(Firebase.db, 'invitations'),
          Firebase.where('inviteeEmail', '==', AuthFB.currentUser.email || '')
        );
        const snap = await Firebase.getDocs(q);
        return snap.docs.map((d) => d.data()).filter((i) => i.status === 'pending');
      } catch (e) {
        return [];
      }
    },

    /** Accept invitation by ID + code. */
    async acceptInvitation(inviteId, code) {
      if (!AuthFB.isLoggedIn) throw new Error('Belum login');
      const inviteRef = Firebase.doc(Firebase.db, 'invitations', inviteId);
      const snap = await Firebase.getDoc(inviteRef);
      if (!snap.exists()) throw new Error('Undangan tidak ditemukan');
      const invite = snap.data();
      if (invite.code !== code.toUpperCase()) throw new Error('Kode undangan salah');
      if (invite.status !== 'pending') throw new Error('Undangan sudah tidak berlaku');
      if (new Date(invite.expiresAt) < new Date()) throw new Error('Undangan sudah kedaluwarsa');
      // Add user to wallet members
      const walletRef = Firebase.doc(Firebase.db, 'wallets', invite.walletId);
      const walletSnap = await Firebase.getDoc(walletRef);
      if (!walletSnap.exists()) throw new Error('Wallet tidak ditemukan');
      const wallet = walletSnap.data();
      const user = AuthFB.currentUser;
      wallet.members = { ...wallet.members, [user.uid]: true };
      wallet.memberInfo = {
        ...wallet.memberInfo,
        [user.uid]: {
          uid: user.uid,
          displayName: user.displayName || user.email || 'Anggota',
          photoURL: user.photoURL || '',
          role: 'member',
          joinedAt: new Date().toISOString()
        }
      };
      await Firebase.updateDoc(walletRef, { members: wallet.members, memberInfo: wallet.memberInfo });
      // Update invitation status
      await Firebase.updateDoc(inviteRef, { status: 'accepted', acceptedAt: new Date().toISOString(), acceptedBy: user.uid });
      // Update user's wallets list
      const userRef = Firebase.doc(Firebase.db, 'users', user.uid);
      const userSnap = await Firebase.getDoc(userRef);
      if (userSnap.exists()) {
        const wallets = userSnap.data().wallets || [];
        if (!wallets.includes(invite.walletId)) wallets.push(invite.walletId);
        await Firebase.updateDoc(userRef, { wallets });
      }
      Toast.success(`Anda bergabung ke wallet "${wallet.name}"`);
      return wallet;
    },

    /** Leave a wallet (member only, not owner). */
    async leave(walletId) {
      if (!AuthFB.isLoggedIn) return;
      const user = AuthFB.currentUser;
      const walletRef = Firebase.doc(Firebase.db, 'wallets', walletId);
      const snap = await Firebase.getDoc(walletRef);
      if (!snap.exists()) return;
      const wallet = snap.data();
      if (wallet.ownerId === user.uid) throw new Error('Owner tidak bisa keluar. Hapus wallet saja.');
      delete wallet.members[user.uid];
      delete wallet.memberInfo[user.uid];
      await Firebase.updateDoc(walletRef, { members: wallet.members, memberInfo: wallet.memberInfo });
      // Update user's wallets list
      const userRef = Firebase.doc(Firebase.db, 'users', user.uid);
      const userSnap = await Firebase.getDoc(userRef);
      if (userSnap.exists()) {
        const wallets = (userSnap.data().wallets || []).filter((w) => w !== walletId);
        await Firebase.updateDoc(userRef, { wallets });
      }
      // If current wallet is the one we left, switch to first available
      if (currentWallet?.id === walletId) {
        this.clearCurrent();
        const remaining = await this.list();
        if (remaining.length > 0) await this.setCurrent(remaining[0].id);
        else location.hash = '#/wallet';
      }
      Toast.success('Anda keluar dari wallet');
    },

    /** Delete wallet (owner only). */
    async delete(walletId) {
      if (!AuthFB.isLoggedIn) return;
      const user = AuthFB.currentUser;
      const walletRef = Firebase.doc(Firebase.db, 'wallets', walletId);
      const snap = await Firebase.getDoc(walletRef);
      if (!snap.exists()) return;
      const wallet = snap.data();
      if (wallet.ownerId !== user.uid) throw new Error('Hanya owner yang bisa menghapus wallet');
      // Delete all sub-collections (best-effort)
      const subStores = ['transactions','categories','debts','debtPayments','receivables','receivablePayments','savings','savingTransactions','assets','budgets','reminders','attachments','auditLogs','settings'];
      for (const store of subStores) {
        try {
          const snap2 = await Firebase.getDocs(Firebase.collection(Firebase.db, 'wallets', walletId, store));
          const batch = Firebase.writeBatch(Firebase.db);
          snap2.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        } catch (e) {}
      }
      await Firebase.deleteDoc(walletRef);
      // Update user's wallets list
      const userRef = Firebase.doc(Firebase.db, 'users', user.uid);
      const userSnap = await Firebase.getDoc(userRef);
      if (userSnap.exists()) {
        const wallets = (userSnap.data().wallets || []).filter((w) => w !== walletId);
        await Firebase.updateDoc(userRef, { wallets });
      }
      if (currentWallet?.id === walletId) {
        this.clearCurrent();
        const remaining = await this.list();
        if (remaining.length > 0) await this.setCurrent(remaining[0].id);
        else location.hash = '#/wallet';
      }
      Toast.success('Wallet dihapus');
    },

    /** Rename wallet. */
    async rename(walletId, name, emoji) {
      const updates = {};
      if (name) updates.name = name;
      if (emoji) updates.emoji = emoji;
      await Firebase.updateDoc(Firebase.doc(Firebase.db, 'wallets', walletId), updates);
      if (currentWallet?.id === walletId) {
        currentWallet = { ...currentWallet, ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentWallet));
        document.dispatchEvent(new CustomEvent('dompetku:wallet-change', { detail: { wallet: currentWallet } }));
      }
    }
  };

  global.Wallet = Wallet;
})(window);
