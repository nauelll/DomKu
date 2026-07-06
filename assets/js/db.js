/* ============================================
   DomKu — db.js (Data Access Layer v2)
   Abstraction layer: Firestore (cloud) + IndexedDB (offline cache).
   Existing code calls DB.getAll('transactions') etc — unchanged.
   Internally routes to Firestore when online, IndexedDB when offline.
   Real-time updates dispatched via 'dompetku:data-change' event.
   ============================================ */

(function (global) {
  'use strict';

  const DB_NAME = 'domku-cache';
  const DB_VERSION = 1;

  // Object stores — used as offline cache. Same schema as before.
  const STORES = {
    transactions: { keyPath: 'id', indexes: [['type','type',{unique:false}],['category','category',{unique:false}],['date','date',{unique:false}],['createdAt','createdAt',{unique:false}]] },
    categories: { keyPath: 'id', indexes: [['type','type',{unique:false}],['name','name',{unique:false}]] },
    debts: { keyPath: 'id', indexes: [['status','status',{unique:false}],['dueDate','dueDate',{unique:false}]] },
    debtPayments: { keyPath: 'id', indexes: [['debtId','debtId',{unique:false}],['date','date',{unique:false}]] },
    receivables: { keyPath: 'id', indexes: [['status','status',{unique:false}],['dueDate','dueDate',{unique:false}]] },
    receivablePayments: { keyPath: 'id', indexes: [['receivableId','receivableId',{unique:false}]] },
    savings: { keyPath: 'id', indexes: [['status','status',{unique:false}]] },
    savingTransactions: { keyPath: 'id', indexes: [['savingId','savingId',{unique:false}],['date','date',{unique:false}]] },
    assets: { keyPath: 'id', indexes: [['type','type',{unique:false}]] },
    budgets: { keyPath: 'id', indexes: [['category','category',{unique:false}],['month','month',{unique:false}]] },
    reminders: { keyPath: 'id', indexes: [['dueDate','dueDate',{unique:false}],['done','done',{unique:false}]] },
    settings: { keyPath: 'key' },
    attachments: { keyPath: 'id' },
    // New stores for migration:
    pendingOps: { keyPath: 'id', indexes: [['store','store',{unique:false}]] }, // queue of offline writes
    auditLogs: { keyPath: 'id', indexes: [['createdAt','createdAt',{unique:false}]] }
  };

  let dbInstance = null;
  let currentWalletId = null; // active wallet ID
  let isSyncing = false;
  const unsubListeners = new Map(); // store -> unsubscribe function

  /* ---------- IndexedDB helpers (kept from v1) ---------- */
  function open() {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        Object.entries(STORES).forEach(([name, def]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: def.keyPath, autoIncrement: false });
            (def.indexes || []).forEach(([idxName, keyPath, opts]) => store.createIndex(idxName, keyPath, opts || {}));
          }
        });
      };
      req.onsuccess = (e) => { dbInstance = e.target.result; dbInstance.onversionchange = () => dbInstance.close(); resolve(dbInstance); };
      req.onerror = () => reject(req.error);
    });
  }

  function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  function p(req) {
    return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }

  async function tx(storeNames, mode, fn) {
    const db = await open();
    storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = db.transaction(storeNames, mode);
    const stores = {};
    storeNames.forEach((n) => stores[n] = transaction.objectStore(n));
    let result;
    try { result = await fn(transaction, stores); } catch (err) { transaction.abort(); throw err; }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('aborted'));
    });
  }

  /* ---------- IndexedDB direct ops ---------- */
  async function idbAdd(store, value) {
    if (!value.id) value.id = uid();
    if (!value.createdAt) value.createdAt = new Date().toISOString();
    value.updatedAt = new Date().toISOString();
    return tx(store, 'readwrite', (_, s) => p(s[store].add(value))).then(() => value);
  }
  async function idbPut(store, value) {
    value.updatedAt = new Date().toISOString();
    return tx(store, 'readwrite', (_, s) => p(s[store].put(value))).then(() => value);
  }
  async function idbGet(store, id) {
    const db = await open();
    return p(db.transaction(store, 'readonly').objectStore(store).get(id));
  }
  async function idbGetAll(store) {
    const db = await open();
    return p(db.transaction(store, 'readonly').objectStore(store).getAll());
  }
  async function idbRemove(store, id) {
    return tx(store, 'readwrite', (_, s) => p(s[store].delete(id)));
  }
  async function idbClear(store) {
    return tx(store, 'readwrite', (_, s) => p(s[store].clear()));
  }
  async function idbGetByIndex(store, index, value) {
    const db = await open();
    return p(db.transaction(store, 'readonly').objectStore(store).index(index).getAll(value));
  }
  async function idbBulkPut(store, items) {
    if (!items || !items.length) return;
    return tx(store, 'readwrite', (_, s) => { items.forEach((item) => { if (!item.id) item.id = uid(); s[store].put(item); }); });
  }

  /* ---------- Pending ops queue (offline writes) ---------- */
  async function queuePending(store, op, data) {
    const entry = { id: uid(), store, op, data, walletId: currentWalletId, createdAt: new Date().toISOString() };
    return tx('pendingOps', 'readwrite', (_, s) => p(s['pendingOps'].add(entry)));
  }
  async function getPending() { return idbGetAll('pendingOps'); }
  async function removePending(id) { return idbRemove('pendingOps', id); }

  /* ---------- Firestore ops ---------- */
  function fsConfigured() { return global.Firebase && Firebase.isConfigured() && Firebase.db && currentWalletId; }
  function fsCol(store) { return Firebase.collection(Firebase.db, 'wallets', currentWalletId, store); }
  function fsDoc(store, id) { return Firebase.doc(Firebase.db, 'wallets', currentWalletId, store, id); }

  async function fsGetAll(store) {
    if (!fsConfigured()) return null;
    try {
      const snap = await Firebase.getDocs(fsCol(store));
      return snap.docs.map((d) => d.data());
    } catch (e) {
      console.warn('[DB] fsGetAll failed, fallback to cache:', e);
      return null;
    }
  }

  async function fsPut(store, value) {
    if (!fsConfigured()) return null;
    try {
      // Strip id from data (it's the doc id)
      const { id, ...data } = value;
      await Firebase.setDoc(fsDoc(store, id || value.id), { ...data, id: id || value.id, updatedAt: Firebase.serverTimestamp() }, { merge: true });
      return value;
    } catch (e) {
      console.warn('[DB] fsPut failed, queuing:', e);
      return null;
    }
  }

  async function fsRemove(store, id) {
    if (!fsConfigured()) return false;
    try {
      await Firebase.deleteDoc(fsDoc(store, id));
      return true;
    } catch (e) {
      console.warn('[DB] fsRemove failed, queuing:', e);
      return false;
    }
  }

  /* ---------- Real-time listeners ---------- */
  function startListener(store) {
    if (!fsConfigured()) return;
    if (unsubListeners.has(store)) return; // already listening
    try {
      const unsub = Firebase.onSnapshot(fsCol(store), (snap) => {
        const items = snap.docs.map((d) => d.data());
        // Update IndexedDB cache
        idbClear(store).then(() => idbBulkPut(store, items)).then(() => {
          // Notify app
          document.dispatchEvent(new CustomEvent('dompetku:data-change', { detail: { store, items } }));
        });
      }, (err) => {
        console.warn(`[DB] Listener error for ${store}:`, err);
      });
      unsubListeners.set(store, unsub);
    } catch (e) {
      console.warn(`[DB] Failed to start listener for ${store}:`, e);
    }
  }
  function stopListener(store) {
    const unsub = unsubListeners.get(store);
    if (unsub) { try { unsub(); } catch (e) {} unsubListeners.delete(store); }
  }
  function stopAllListeners() {
    unsubListeners.forEach((unsub) => { try { unsub(); } catch (e) {} });
    unsubListeners.clear();
  }

  /* ---------- Public API (compatible with old DB) ----------
     Same signatures: DB.add(store, value), DB.put, DB.get, DB.getAll,
     DB.remove, DB.clear, DB.getByIndex, DB.bulkPut, DB.filter,
     DB.exportAll, DB.importAll, DB.uid
  */
  const DB = {
    STORES,
    open,
    uid,
    tx,

    /** Set active wallet ID — starts real-time listeners. */
    async setWallet(walletId) {
      if (currentWalletId === walletId) return;
      stopAllListeners();
      currentWalletId = walletId;
      if (!walletId) return;
      // Start listeners for all data stores (except pendingOps, settings, auditLogs)
      const listenStores = ['transactions','categories','debts','debtPayments','receivables','receivablePayments','savings','savingTransactions','assets','budgets','reminders','attachments'];
      listenStores.forEach(startListener);
    },
    getWallet() { return currentWalletId; },

    async add(store, value) {
      if (!value.id) value.id = uid();
      if (!value.createdAt) value.createdAt = new Date().toISOString();
      value.updatedAt = new Date().toISOString();
      value.walletId = currentWalletId;
      // 1. Write to cache immediately (instant, synchronous-feeling)
      await idbPut(store, value);
      // 2. Sync to cloud in BACKGROUND (don't block UI)
      // If cloud fails, queue for retry — but don't wait for it
      if (fsConfigured()) {
        fsPut(store, value).then((ok) => {
          if (!ok) queuePending(store, 'put', value);
        }).catch(() => queuePending(store, 'put', value));
      }
      return value;
    },

    async put(store, value) {
      value.updatedAt = new Date().toISOString();
      value.walletId = currentWalletId;
      // 1. Write to cache immediately
      await idbPut(store, value);
      // 2. Sync to cloud in BACKGROUND
      if (fsConfigured()) {
        fsPut(store, value).then((ok) => {
          if (!ok) queuePending(store, 'put', value);
        }).catch(() => queuePending(store, 'put', value));
      }
      return value;
    },

    async get(store, id) {
      // Try cache first (fast)
      const cached = await idbGet(store, id);
      if (cached) return cached;
      // Fallback to cloud
      if (fsConfigured()) {
        try {
          const snap = await Firebase.getDoc(fsDoc(store, id));
          if (snap.exists()) {
            const data = snap.data();
            await idbPut(store, data); // populate cache
            return data;
          }
        } catch (e) { /* ignore */ }
      }
      return null;
    },

    async getAll(store) {
      // ALWAYS return from IndexedDB cache first (instant, zero-latency).
      // Firestore listener will update cache in background when data changes.
      // Only fetch from cloud if cache is completely empty AND no listener active.
      const cached = await idbGetAll(store);
      if (cached.length > 0 || unsubListeners.has(store)) {
        return cached; // fast path: serve from cache
      }
      // Slow path: cache empty + no listener → try cloud once
      if (fsConfigured() && Firebase.isOnline()) {
        const cloud = await fsGetAll(store);
        if (cloud) {
          await idbClear(store);
          await idbBulkPut(store, cloud);
          return cloud;
        }
      }
      return cached;
    },

    async remove(store, id) {
      // 1. Delete from cache immediately
      await idbRemove(store, id);
      // 2. Sync to cloud in BACKGROUND
      if (fsConfigured()) {
        fsRemove(store, id).then((ok) => {
          if (!ok) queuePending(store, 'delete', { id });
        }).catch(() => queuePending(store, 'delete', { id }));
      }
    },

    async clear(store) {
      await idbClear(store);
      // Cloud: delete all docs (only if configured)
      if (fsConfigured()) {
        try {
          const snap = await Firebase.getDocs(fsCol(store));
          const batch = Firebase.writeBatch(Firebase.db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        } catch (e) { console.warn('[DB] clear cloud failed:', e); }
      }
    },

    async getByIndex(store, index, value) {
      // Use cache (IndexedDB has indexes)
      return idbGetByIndex(store, index, value);
    },

    async filter(store, predicate) {
      const all = await this.getAll(store);
      return all.filter(predicate);
    },

    async bulkPut(store, items) {
      // For import/migration
      if (!items || !items.length) return;
      items.forEach((item) => {
        if (!item.id) item.id = uid();
        item.walletId = currentWalletId;
        if (!item.createdAt) item.createdAt = new Date().toISOString();
        item.updatedAt = new Date().toISOString();
      });
      await idbBulkPut(store, items);
      // Cloud: batch write
      if (fsConfigured()) {
        try {
          // Batch in chunks of 400 (Firestore limit)
          for (let i = 0; i < items.length; i += 400) {
            const chunk = items.slice(i, i + 400);
            const batch = Firebase.writeBatch(Firebase.db);
            chunk.forEach((item) => batch.set(fsDoc(store, item.id), { ...item, updatedAt: Firebase.serverTimestamp() }, { merge: true }));
            await batch.commit();
          }
        } catch (e) {
          console.warn('[DB] bulkPut cloud failed, queued individually:', e);
          // Queue each as pending
          for (const item of items) await queuePending(store, 'put', item);
        }
      }
    },

    async exportAll() {
      const result = {};
      for (const name of Object.keys(STORES)) {
        if (name === 'pendingOps') continue;
        result[name] = await idbGetAll(name);
      }
      return { version: DB_VERSION, exportedAt: new Date().toISOString(), data: result };
    },

    async importAll(data) {
      const stores = Object.keys(STORES).filter((s) => s !== 'pendingOps');
      for (const name of stores) await idbClear(name);
      for (const name of stores) {
        if (data[name] && Array.isArray(data[name])) {
          await this.bulkPut(name, data[name]);
        }
      }
    },

    /* ---------- Migration helpers ---------- */
    /** Get all data from cache (without going to cloud). For migration dialog. */
    async getLocalData() {
      const result = {};
      for (const name of Object.keys(STORES)) {
        if (name === 'pendingOps') continue;
        result[name] = await idbGetAll(name);
      }
      return result;
    },

    /** Check if local cache has any user data. */
    async hasLocalData() {
      const stores = ['transactions','debts','savings','assets','receivables'];
      for (const s of stores) {
        const items = await idbGetAll(s);
        if (items.length > 0) return true;
      }
      return false;
    },

    /** Wipe local cache (after migration or reset). */
    async wipeLocal() {
      for (const name of Object.keys(STORES)) {
        await idbClear(name);
      }
    },

    /* ---------- Sync engine ---------- */
    async syncPending() {
      if (isSyncing || !fsConfigured()) return;
      isSyncing = true;
      document.dispatchEvent(new CustomEvent('dompetku:sync', { detail: { status: 'syncing' } }));
      try {
        const pending = await getPending();
        let success = 0, failed = 0;
        for (const op of pending) {
          try {
            if (op.op === 'put') await Firebase.setDoc(fsDoc(op.store, op.data.id), { ...op.data, updatedAt: Firebase.serverTimestamp() }, { merge: true });
            else if (op.op === 'delete') await Firebase.deleteDoc(fsDoc(op.store, op.data.id));
            await removePending(op.id);
            success++;
          } catch (e) {
            console.warn('[DB] Sync op failed:', e);
            failed++;
            break; // stop on first error (likely offline)
          }
        }
        document.dispatchEvent(new CustomEvent('dompetku:sync', { detail: { status: 'done', success, failed } }));
        if (success > 0 && failed === 0) {
          Toast.success(`${success} perubahan tersinkron`, 1800);
        }
      } catch (e) {
        document.dispatchEvent(new CustomEvent('dompetku:sync', { detail: { status: 'error', error: e.message } }));
      } finally {
        isSyncing = false;
      }
    },

    isSyncing: () => isSyncing,
    hasPending: async () => (await idbGetAll('pendingOps')).length > 0,

    /* ---------- Listener control ---------- */
    startListener, stopListener, stopAllListeners,

    /* ---------- Audit log (public) ---------- */
    async log(action, entity, entityId, details = {}) {
      if (!currentWalletId) return;
      const user = global.AuthFB?.currentUser;
      const entry = {
        id: uid(),
        walletId: currentWalletId,
        userId: user?.uid || 'unknown',
        userName: user?.displayName || user?.email || 'Saya',
        userPhoto: user?.photoURL || '',
        action, // 'create', 'update', 'delete', 'login', etc.
        entity, // 'transaction', 'debt', 'saving', etc.
        entityId,
        details,
        createdAt: new Date().toISOString()
      };
      await idbPut('auditLogs', entry);
      if (fsConfigured()) {
        try {
          await Firebase.addDoc(Firebase.collection(Firebase.db, 'wallets', currentWalletId, 'auditLogs'), entry);
        } catch (e) { /* audit failure non-critical */ }
      }
    },

    async getAuditLogs(limit = 50) {
      if (fsConfigured() && Firebase.isOnline()) {
        try {
          const q = Firebase.query(Firebase.collection(Firebase.db, 'wallets', currentWalletId, 'auditLogs'), Firebase.orderBy('createdAt', 'desc'), Firebase.limit(limit));
          const snap = await Firebase.getDocs(q);
          return snap.docs.map((d) => d.data());
        } catch (e) { /* fall through to cache */ }
      }
      const all = await idbGetAll('auditLogs');
      return all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, limit);
    }
  };

  global.DB = DB;
})(window);
