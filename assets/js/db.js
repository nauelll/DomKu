/* ============================================
   DompetKu — db.js
   IndexedDB wrapper. Promise-based, modular, transactional.
   All financial data lives here — fully offline.
   ============================================ */

(function (global) {
  'use strict';

  const DB_NAME = 'dompetku-db';
  const DB_VERSION = 1;

  // Object stores schema — defined here so other modules can introspect.
  const STORES = {
    transactions: { keyPath: 'id', indexes: [
      ['type', 'type', { unique: false }],
      ['category', 'category', { unique: false }],
      ['date', 'date', { unique: false }],
      ['createdAt', 'createdAt', { unique: false }]
    ]},
    categories: { keyPath: 'id', indexes: [
      ['type', 'type', { unique: false }],
      ['name', 'name', { unique: false }]
    ]},
    debts: { keyPath: 'id', indexes: [
      ['status', 'status', { unique: false }],
      ['dueDate', 'dueDate', { unique: false }]
    ]},
    debtPayments: { keyPath: 'id', indexes: [
      ['debtId', 'debtId', { unique: false }],
      ['date', 'date', { unique: false }]
    ]},
    receivables: { keyPath: 'id', indexes: [
      ['status', 'status', { unique: false }],
      ['dueDate', 'dueDate', { unique: false }]
    ]},
    receivablePayments: { keyPath: 'id', indexes: [
      ['receivableId', 'receivableId', { unique: false }]
    ]},
    savings: { keyPath: 'id', indexes: [
      ['status', 'status', { unique: false }]
    ]},
    savingTransactions: { keyPath: 'id', indexes: [
      ['savingId', 'savingId', { unique: false }],
      ['date', 'date', { unique: false }]
    ]},
    assets: { keyPath: 'id', indexes: [
      ['type', 'type', { unique: false }]
    ]},
    budgets: { keyPath: 'id', indexes: [
      ['category', 'category', { unique: false }],
      ['month', 'month', { unique: false }]
    ]},
    reminders: { keyPath: 'id', indexes: [
      ['dueDate', 'dueDate', { unique: false }],
      ['done', 'done', { unique: false }]
    ]},
    settings: { keyPath: 'key' }, // key-value store for app settings
    attachments: { keyPath: 'id' } // blob storage for receipt photos
  };

  let dbInstance = null;

  /** Open (or upgrade) the database. Cached after first call. */
  function open() {
    if (dbInstance) return Promise.resolve(dbInstance);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Create each store + indexes
        Object.entries(STORES).forEach(([name, def]) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, {
              keyPath: def.keyPath,
              autoIncrement: false
            });
            (def.indexes || []).forEach(([idxName, keyPath, opts]) => {
              store.createIndex(idxName, keyPath, opts || {});
            });
          }
        });
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        // Handle connection drops
        dbInstance.onversionchange = () => dbInstance.close();
        resolve(dbInstance);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /** Generate a unique ID (timestamp + random suffix). */
  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /** Promisify a single IDB request. */
  function p(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Run a transaction across one or more stores.
   * @param {string[]} storeNames
   * @param {'readonly'|'readwrite'} mode
   * @param {function(IDBTransaction, Object<string,IDBObjectStore>):Promise|void} fn
   */
  async function tx(storeNames, mode, fn) {
    const db = await open();
    storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = db.transaction(storeNames, mode);
    const stores = {};
    storeNames.forEach((name) => stores[name] = transaction.objectStore(name));
    let result;
    try {
      result = await fn(transaction, stores);
    } catch (err) {
      transaction.abort();
      throw err;
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    });
  }

  /* ================= CRUD helpers ================= */

  async function add(storeName, value) {
    if (!value.id) value.id = uid();
    value.createdAt = value.createdAt || new Date().toISOString();
    value.updatedAt = new Date().toISOString();
    return tx(storeName, 'readwrite', (_, stores) => p(stores[storeName].add(value))).then(() => value);
  }

  async function put(storeName, value) {
    value.updatedAt = new Date().toISOString();
    return tx(storeName, 'readwrite', (_, stores) => p(stores[storeName].put(value))).then(() => value);
  }

  async function get(storeName, id) {
    const db = await open();
    return p(db.transaction(storeName, 'readonly').objectStore(storeName).get(id));
  }

  async function getAll(storeName) {
    const db = await open();
    return p(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
  }

  async function remove(storeName, id) {
    return tx(storeName, 'readwrite', (_, stores) => p(stores[storeName].delete(id)));
  }

  async function clear(storeName) {
    return tx(storeName, 'readwrite', (_, stores) => p(stores[storeName].clear()));
  }

  /** Query by index equality. */
  async function getByIndex(storeName, indexName, value) {
    const db = await open();
    const idx = db.transaction(storeName, 'readonly').objectStore(storeName).index(indexName);
    return p(idx.getAll(value));
  }

  /** Generic filter via callback on all records. */
  async function filter(storeName, predicate) {
    const all = await getAll(storeName);
    return all.filter(predicate);
  }

  /** Bulk insert (used by import). Skips duplicate IDs. */
  async function bulkPut(storeName, items) {
    if (!items || !items.length) return;
    return tx(storeName, 'readwrite', (_, stores) => {
      const store = stores[storeName];
      items.forEach((item) => {
        if (!item.id) item.id = uid();
        store.put(item);
      });
    });
  }

  /** Export entire database as a plain object. */
  async function exportAll() {
    const result = {};
    for (const name of Object.keys(STORES)) {
      result[name] = await getAll(name);
    }
    return { version: DB_VERSION, exportedAt: new Date().toISOString(), data: result };
  }

  /** Wipe all stores and import fresh data. */
  async function importAll(data) {
    const stores = Object.keys(STORES);
    // Clear all then bulk-insert
    for (const name of stores) await clear(name);
    for (const name of stores) {
      if (data[name] && Array.isArray(data[name])) {
        await bulkPut(name, data[name]);
      }
    }
  }

  global.DB = {
    STORES,
    open,
    uid,
    tx,
    add, put, get, getAll, remove, clear,
    getByIndex, filter, bulkPut,
    exportAll, importAll
  };
})(window);
