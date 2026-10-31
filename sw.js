// Service worker: хранит файлы приложения в телефоне, чтобы оно работало без интернета.
// Версия берётся из адреса регистрации: sw.js?v=1.0.0 (её подставляет js/app.js).
const VERSION = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'kn-app-' + VERSION;
const FONTS = 'kn-fonts';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'css/fonts.css',
  'fonts/caveat.woff',
  'fonts/cormorant.woff',
  'fonts/cormorant-italic.woff',
  'fonts/nunito.woff',
  'fonts/unbounded.woff',
  'fonts/marck.woff',
  'fonts/playfair.woff',
  'fonts/playfair-italic.woff',
  'fonts/lobster.woff',
  'fonts/comfortaa.woff',
  'fonts/amatic-bold.woff',
  'js/version.js',
  'js/db.js',
  'js/photos.js',
  'js/ingredients.js',
  'js/doodles.js',
  'js/backup.js',
  'js/places.js',
  'js/menucard.js',
  'js/holidays.js',
  'js/mouse.js',
  'js/starter.js',
  'js/cook.js',
  'js/pantry.js',
  'js/cost.js',
  'js/session.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  // cache: 'reload' — берём свежие файлы с GitHub, минуя кэш браузера
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kn-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // version.json всегда идёт в сеть — по нему проверяем обновления
    if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/sw.js')) return;
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req, { cache: 'no-cache' })
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()));
      })
    );
    return;
  }

  // Шрифты Google: показываем из кэша, в фоне обновляем
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((res) => { c.put(req, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
