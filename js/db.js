'use strict';
// Локальная база в телефоне (IndexedDB). Данные никуда не отправляются.
const DB_NAME = 'kitchen-notebook';
const DB_VERSION = 2;
const STORES = {
  recipes: 'id',
  finds: 'id',
  notes: 'id',
  menu: 'date',
  places: 'id',
  holidays: 'id',
  photos: 'id',
  meta: 'key'
};

let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath });
      }
    };
    req.onsuccess = () => { const db = req.result; db.onversionchange = () => db.close(); resolve(db); };
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

async function _tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    const r = fn(s);
    if (r) r.onsuccess = () => { out = r.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const DB = {
  all: (store) => _tx(store, 'readonly', (s) => s.getAll()),
  get: (store, key) => _tx(store, 'readonly', (s) => s.get(key)),
  put: (store, value) => _tx(store, 'readwrite', (s) => s.put(value)),
  del: (store, key) => _tx(store, 'readwrite', (s) => s.delete(key)),
  clear: (store) => _tx(store, 'readwrite', (s) => s.clear()),
  async putMany(store, values) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readwrite');
      const s = t.objectStore(store);
      for (const v of values) s.put(v);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  },
  async getMeta(key, fallback = null) {
    const r = await DB.get('meta', key);
    return r ? r.value : fallback;
  },
  setMeta: (key, value) => DB.put('meta', { key, value })
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
