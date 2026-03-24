const CACHE = 'livroo-v4';
const ASSETS = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

// Network-first strategy: always try network, fallback to cache
// This ensures updates are picked up immediately
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache the fresh response
        var r = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, r));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Notifications push recues
self.addEventListener('push', e => {
  let data = { title: 'Livroo', body: 'Nouvelle notification', screen: 'social' };
  try { if(e.data) data = Object.assign(data, e.data.json()); } catch(err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'livroo-' + (data.tag || 'general'),
      renotify: true,
      data: { screen: data.screen || 'social' }
    })
  );
});

// Clic sur une notification
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const screen = (e.notification.data && e.notification.data.screen) || 'social';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for(var i = 0; i < clientList.length; i++) {
        if('focus' in clientList[i]) {
          clientList[i].focus();
          clientList[i].postMessage({ type: 'NOTIF_CLICK', screen: screen });
          return;
        }
      }
      if(clients.openWindow) return clients.openWindow('./');
    })
  );
});
