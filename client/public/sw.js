// Leadani LFS Service Worker for Push Notifications

const CACHE_NAME = 'leadani-v1';
const urlsToCache = [
  '/',
  '/favicon.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    icon: '/pwa-192x192.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  let notificationData = { title: 'Leadani', body: 'You have a new notification' };
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      ...options,
      body: notificationData.body,
      tag: notificationData.tag || 'default',
      data: notificationData.data || {}
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open the app or focus existing window
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then((focusedClient) => {
              if (focusedClient && urlToOpen !== '/') {
                focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        // If no window is open, open a new one
        return clients.openWindow(urlToOpen);
      })
  );
});

// Background sync for offline actions (future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-leads') {
    // Handle background sync for offline lead updates
    console.log('Background sync triggered');
  }
});
