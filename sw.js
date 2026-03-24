const CACHE = 'livroo-v5';
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

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never cache: API calls, Supabase, external resources
  if(
    url.includes('supabase.co') ||
    url.includes('googleapis.com') ||
    url.includes('openlibrary.org') ||
    url.includes('unpkg.com') ||
    url.includes('fonts.g') ||
    e.request.method !== 'GET'
  ) {
    // Pass through directly, no caching
    return;
  }

  // For app assets (index.html, sw.js, manifest): network-first
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Only cache valid same-origin responses
        if(response && response.status === 200 && response.type === 'basic') {
          var r = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, r));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// Push notifications
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

// Notification click
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
