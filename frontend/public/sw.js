self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Fingle', body: event.data.text() || 'You have a new notification' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Fingle', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlPath = event.notification.data?.url ?? '/'
  const fullUrl = new URL(urlPath, self.location.origin).href

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Focus an existing window if one is available
        for (const client of windowClients) {
          if ('focus' in client) {
            return client.focus().then((c) => c.navigate(fullUrl))
          }
        }
        // No existing window — open a new one
        if (clients.openWindow) return clients.openWindow(fullUrl)
      }),
  )
})
