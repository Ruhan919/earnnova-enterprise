const CACHE = 'earnnova-v2';
const FILES = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/supabase-config.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/admin.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => new Response('Offline', {status:503})))
  );
});

// Push notifications
self.addEventListener('push', e => {
  const data = e.data.json();
  self.registration.showNotification(data.title || 'EARNNOVA', {
    body: data.message || 'New update!',
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-72.png',
    vibrate: [200, 100, 200]
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  clients.openWindow('/');
});
