/* ============================================
   DompetKu — settings.js
   User preferences stored in IndexedDB (settings store).
   Defaults + getter/setter with in-memory cache.
   ============================================ */

(function (global) {
  'use strict';

  const DEFAULTS = {
    // Security
    pin: null,              // { hash, salt } or null
    password: null,         // { hash, salt } or null
    autoLockMinutes: 5,     // 0 = never
    useBiometric: false,

    // Display
    theme: 'system',        // 'light' | 'dark' | 'system'
    accentColor: '#10B981', // primary brand color
    currency: 'IDR',
    locale: 'id-ID',
    dateFormat: 'DD/MM/YYYY',
    firstDayOfWeek: 1,      // 0 = Sunday, 1 = Monday

    // Notifications
    enableReminders: true,
    reminderTime: '08:00',

    // Backup
    autoBackup: true,
    lastBackupAt: null,

    // Onboarding
    onboarded: false
  };

  const cache = { ...DEFAULTS };

  const Settings = {
    async load() {
      const all = await DB.getAll('settings');
      all.forEach((row) => { cache[row.key] = row.value; });
      return cache;
    },
    get(key) {
      return cache[key] !== undefined ? cache[key] : DEFAULTS[key];
    },
    getAll() {
      return { ...cache };
    },
    async set(key, value) {
      cache[key] = value;
      await DB.put('settings', { key, value });
      return value;
    },
    async setMany(obj) {
      const entries = Object.entries(obj);
      await Promise.all(entries.map(([k, v]) => DB.put('settings', { key: k, value: v })));
      Object.assign(cache, obj);
    },
    async reset() {
      await DB.clear('settings');
      Object.keys(cache).forEach((k) => delete cache[k]);
      Object.assign(cache, DEFAULTS);
    },
    DEFAULTS
  };

  global.Settings = Settings;
})(window);
