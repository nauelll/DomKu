/* ============================================
   DompetKu — auth.js
   PIN / password authentication with auto-lock.
   Lock state is in-memory; PIN hash stored in settings.
   ============================================ */

(function (global) {
  'use strict';

  const LOCK_EVENT = 'dompetku:lock-change';
  let isUnlocked = false;
  let lockTimer = null;
  let lastActivity = Date.now();

  const Auth = {
    /** True if user has set any PIN/password. */
    hasSecurity() {
      return !!(Settings.get('pin') || Settings.get('password'));
    },

    isUnlocked() { return isUnlocked; },

    /** Set a new PIN. Stores hash + salt in settings. */
    async setPin(pin) {
      if (!pin || pin.length < 4) throw new Error('PIN minimal 4 digit');
      const { hash, salt } = await Crypto.hashPin(pin);
      await Settings.set('pin', { hash, salt });
    },

    async clearPin() {
      await Settings.set('pin', null);
    },

    async verifyPin(pin) {
      const stored = Settings.get('pin');
      if (!stored) return true;
      return Crypto.verifyPin(pin, stored);
    },

    /** Same flow for password (>=6 chars). */
    async setPassword(pwd) {
      if (!pwd || pwd.length < 6) throw new Error('Password minimal 6 karakter');
      const { hash, salt } = await Crypto.hashPin(pwd);
      await Settings.set('password', { hash, salt });
    },
    async clearPassword() { await Settings.set('password', null); },
    async verifyPassword(pwd) {
      const stored = Settings.get('password');
      if (!stored) return true;
      return Crypto.verifyPin(pwd, stored);
    },

    /** Try to unlock with PIN or password. Returns true on success. */
    async unlock(code) {
      // Try PIN first, then password
      const pinOk = await this.verifyPin(code);
      const pwdOk = pinOk ? true : await this.verifyPassword(code);
      if (pinOk || pwdOk) {
        isUnlocked = true;
        lastActivity = Date.now();
        this.scheduleAutoLock();
        document.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { unlocked: true } }));
        return true;
      }
      return false;
    },

    lock() {
      isUnlocked = false;
      if (lockTimer) { clearTimeout(lockTimer); lockTimer = null; }
      document.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { unlocked: false } }));
    },

    /** Track activity (called from main click/keypress listener). */
    pingActivity() {
      lastActivity = Date.now();
      if (isUnlocked) this.scheduleAutoLock();
    },

    scheduleAutoLock() {
      if (lockTimer) clearTimeout(lockTimer);
      const minutes = Number(Settings.get('autoLockMinutes')) || 0;
      if (minutes > 0) {
        lockTimer = setTimeout(() => this.lock(), minutes * 60 * 1000);
      }
    },

    onLockChange(handler) {
      document.addEventListener(LOCK_EVENT, (e) => handler(e.detail.unlocked));
    },

    /** First-time setup: skip security if user opts out. */
    async skipSecurity() {
      await Settings.set('pin', null);
      await Settings.set('password', null);
      await Settings.set('onboarded', true);
      isUnlocked = true;
      document.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { unlocked: true } }));
    }
  };

  global.Auth = Auth;
})(window);
