/* ============================================
   DomKu — auth-firebase.js
   Authentication manager (Google + Email/Password).
   Coordinates with existing PIN lock for hybrid security.
   ============================================ */

(function (global) {
  'use strict';

  let currentUser = null;
  let unsubAuth = null;

  const AuthFB = {
    init() {
      if (!window.Firebase || !Firebase.isConfigured()) {
        console.warn('[AuthFB] Firebase not configured — running offline-only mode');
        return;
      }
      unsubAuth = Firebase.onAuthChange(async (user) => {
        currentUser = user;
        if (user) {
          await Firebase.createUserDoc(user);
          document.dispatchEvent(new CustomEvent('dompetku:auth', { detail: { user } }));
        } else {
          document.dispatchEvent(new CustomEvent('dompetku:auth', { detail: { user: null } }));
        }
      });
    },

    get currentUser() { return currentUser; },
    get isLoggedIn() { return !!currentUser; },

    async loginWithGoogle() {
      try {
        const result = await Firebase.signInWithGoogle();
        Toast.success('Login berhasil');
        return result.user;
      } catch (e) {
        if (e.code === 'auth/popup-closed-by-user') {
          Toast.info('Login dibatalkan');
        } else if (e.code === 'auth/popup-blocked') {
          Toast.error('Popup diblokir. Izinkan popup untuk situs ini.');
        } else {
          Toast.error('Login gagal: ' + (e.message || e.code));
        }
        throw e;
      }
    },

    async loginWithEmail(email, password) {
      try {
        const result = await Firebase.signInWithEmail(email, password);
        Toast.success('Login berhasil');
        return result.user;
      } catch (e) {
        let msg = 'Login gagal';
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') msg = 'Email atau password salah';
        else if (e.code === 'auth/user-not-found') msg = 'User tidak ditemukan';
        else if (e.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan. Coba lagi nanti';
        else if (e.code === 'auth/invalid-email') msg = 'Format email tidak valid';
        else msg = e.message || msg;
        Toast.error(msg);
        throw e;
      }
    },

    async signUpWithEmail(email, password, displayName) {
      try {
        const result = await Firebase.signUpWithEmail(email, password, displayName);
        Toast.success('Akun berhasil dibuat');
        return result.user;
      } catch (e) {
        let msg = 'Pendaftaran gagal';
        if (e.code === 'auth/email-already-in-use') msg = 'Email sudah terdaftar';
        else if (e.code === 'auth/weak-password') msg = 'Password terlalu lemah (min 6 karakter)';
        else if (e.code === 'auth/invalid-email') msg = 'Format email tidak valid';
        else msg = e.message || msg;
        Toast.error(msg);
        throw e;
      }
    },

    async resetPassword(email) {
      try {
        await Firebase.resetPassword(email);
        Toast.success('Email reset password telah dikirim');
      } catch (e) {
        Toast.error('Gagal mengirim email reset: ' + (e.message || ''));
        throw e;
      }
    },

    async signOut() {
      try {
        await Firebase.signOut();
        Toast.success('Anda telah keluar');
        // Clear local cache
        if (window.Wallet) Wallet.clearCurrent();
        // Redirect to login
        location.hash = '#/login';
      } catch (e) {
        Toast.error('Logout gagal: ' + (e.message || ''));
      }
    },

    /** Require auth for page access. Returns true if allowed. */
    requireAuth() {
      if (!this.isLoggedIn) {
        location.hash = '#/login';
        return false;
      }
      return true;
    },

    onAuthChange(cb) {
      document.addEventListener('dompetku:auth', (e) => cb(e.detail.user));
    }
  };

  global.AuthFB = AuthFB;
})(window);
