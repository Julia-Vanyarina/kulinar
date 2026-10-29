'use strict';
// Фото сжимаются перед сохранением (до 1400 px по длинной стороне), чтобы не занимать много места.
const Photos = {
  cache: new Map(),

  loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось открыть фото')); };
      img.src = url;
    });
  },

  async compress(file, max = 1400, quality = 0.82) {
    const img = await this.loadImage(file);
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k);
    const h = Math.round(img.naturalHeight * k);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', quality));
  },

  async add(file) {
    const blob = await this.compress(file);
    const id = uid();
    await DB.put('photos', { id, blob });
    return id;
  },

  async url(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const rec = await DB.get('photos', id);
    if (!rec) return '';
    const u = URL.createObjectURL(rec.blob);
    this.cache.set(id, u);
    return u;
  },

  async remove(id) {
    await DB.del('photos', id);
    const u = this.cache.get(id);
    if (u) { URL.revokeObjectURL(u); this.cache.delete(id); }
  },

  async removeMany(ids = []) {
    for (const id of ids) await this.remove(id);
  },

  resetCache() {
    for (const u of this.cache.values()) URL.revokeObjectURL(u);
    this.cache.clear();
  },

  // Подставляет картинки во все <img data-photo="id"> внутри root
  async hydrate(root) {
    const imgs = root.querySelectorAll('img[data-photo]');
    for (const img of imgs) {
      const u = await this.url(img.dataset.photo);
      if (u) img.src = u;
      else img.closest('.sticker, .thumb, .gallery-item')?.classList.add('missing');
    }
  }
};
