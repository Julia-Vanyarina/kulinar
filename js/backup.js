'use strict';
// Резервная копия: один файл .json со всеми рецептами, заметками, меню и фотографиями.
const BACKUP_STORES = ['recipes', 'finds', 'notes', 'menu', 'places', 'holidays', 'prices', 'shopstate', 'sessions'];

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL) {
  const res = await fetch(dataURL);
  return res.blob();
}

const Backup = {
  async build() {
    const data = {};
    for (const s of BACKUP_STORES) data[s] = await DB.all(s);
    const photos = [];
    for (const p of await DB.all('photos')) {
      photos.push({ id: p.id, data: await blobToDataURL(p.blob) });
    }
    const obj = {
      app: 'kitchen-notebook',
      appVersion: self.APP_VERSION,
      exportedAt: new Date().toISOString(),
      counts: Object.fromEntries(BACKUP_STORES.map((s) => [s, data[s].length]).concat([['photos', photos.length]])),
      data,
      photos
    };
    const name = `kulinar-backup-${todayISO()}.json`;
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    return { name, blob, counts: obj.counts };
  },

  canShareFile(name, blob) {
    try {
      const f = new File([blob], name, { type: 'application/json' });
      return !!(navigator.canShare && navigator.canShare({ files: [f] }));
    } catch (e) { return false; }
  },

  async share(name, blob) {
    const f = new File([blob], name, { type: 'application/json' });
    await navigator.share({ files: [f], title: name });
    await DB.setMeta('lastBackup', Date.now());
  },

  async download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
    await DB.setMeta('lastBackup', Date.now());
  },

  async read(file) {
    let obj;
    try { obj = JSON.parse(await file.text()); }
    catch (e) { throw new Error('Файл не читается — это точно копия тетради?'); }
    if (!obj || obj.app !== 'kitchen-notebook' || !obj.data) throw new Error('Это не резервная копия кулинарной тетради');
    return obj;
  },

  async restore(obj) {
    for (const s of BACKUP_STORES) await DB.clear(s);
    await DB.clear('photos');
    Photos.resetCache();
    for (const s of BACKUP_STORES) await DB.putMany(s, obj.data[s] || []);
    const photos = [];
    for (const p of obj.photos || []) photos.push({ id: p.id, blob: await dataURLToBlob(p.data) });
    await DB.putMany('photos', photos);
  }
};
