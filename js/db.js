'use strict';
// Локальная база в телефоне (IndexedDB). Данные никуда не отправляются.
const DB_NAME = 'kitchen-notebook';
const DB_VERSION = 5;
const STORES = {
  recipes: 'id',
  finds: 'id',
  notes: 'id',
  menu: 'date',
  places: 'id',
  holidays: 'id',
  prices: 'key',
  shopstate: 'key',
  sessions: 'id',
  photos: 'id',
  tombs: 'id',
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

// Хранилища, которые синхронизируются с сервером. У записей появляется отметка времени _u,
// а удаления запоминаются в «tombs», чтобы удалить и на других устройствах.
const SYNC_STORES = ['recipes', 'finds', 'notes', 'menu', 'places', 'holidays', 'prices', 'shopstate', 'sessions', 'photos'];
const isSynced = (store) => SYNC_STORES.includes(store);
const changed = (store) => { if (isSynced(store) && DB.onChange) DB.onChange(store); };

const DB = {
  onChange: null,
  all: (store) => _tx(store, 'readonly', (s) => s.getAll()),
  keys: (store) => _tx(store, 'readonly', (s) => s.getAllKeys()),
  get: (store, key) => _tx(store, 'readonly', (s) => s.get(key)),
  async put(store, value) {
    if (isSynced(store)) value._u = Date.now();
    const r = await _tx(store, 'readwrite', (s) => s.put(value));
    changed(store);
    return r;
  },
  async del(store, key) {
    await _tx(store, 'readwrite', (s) => s.delete(key));
    if (isSynced(store)) await _tx('tombs', 'readwrite', (s) => s.put({ id: store + '|' + key, store, k: key, _u: Date.now() }));
    changed(store);
  },
  async clear(store) {
    if (isSynced(store)) {
      const keys = await DB.keys(store);
      const now = Date.now();
      await DB.rawPutMany('tombs', keys.map((k) => ({ id: store + '|' + k, store, k, _u: now })));
    }
    await _tx(store, 'readwrite', (s) => s.clear());
    changed(store);
  },
  async putMany(store, values) {
    const now = Date.now();
    if (isSynced(store)) for (const v of values) v._u = now;
    await DB.rawPutMany(store, values);
    changed(store);
  },
  // без отметок и без запуска синхронизации — для данных, пришедших с сервера
  rawPut: (store, value) => _tx(store, 'readwrite', (s) => s.put(value)),
  rawDel: (store, key) => _tx(store, 'readwrite', (s) => s.delete(key)),
  rawClear: (store) => _tx(store, 'readwrite', (s) => s.clear()),
  async rawPutMany(store, values) {
    if (!values.length) return;
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
