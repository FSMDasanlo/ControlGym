const CACHE_NAME = 'controlgym-cache-v1';
const urlsToCache = [
  'index.html',
  'rutinas.html',
  'ejercicios.html',
  'ejercicio.html',
  'manifest.json',
  'img/icon-192.png',
  'img/icon-512.png',
  // Añade aquí otros archivos como CSS, JS, imágenes
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
