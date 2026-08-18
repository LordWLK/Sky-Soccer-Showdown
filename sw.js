// Service worker : réseau d'abord (les mises à jour arrivent dès qu'on est en
// ligne), cache en secours (le jeu reste jouable hors-ligne).
const CACHE = 'sky-soccer-v1';
const CORE = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './vendor/three.module.min.js',
  './src/main.js',
  './src/game.js',
  './src/world.js',
  './src/players.js',
  './src/ui.js',
  './src/fx.js',
  './src/audio.js',
  './src/assets.js',
  './src/nations.js',
  './src/records.js',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then((hit) => hit || (request.mode === 'navigate' ? caches.match('./index.html') : undefined))),
  );
});
