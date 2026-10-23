// Se suma al service worker de la app: muestra las notificaciones y abre la pantalla correcta al tocarlas.
self.addEventListener('push', (evento) => {
  const datos = evento.data ? evento.data.json() : {}
  evento.waitUntil(
    self.registration.showNotification(datos.titulo || 'Santa María', {
      body: datos.texto || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: datos.etiqueta,
      lang: 'es',
      data: { url: datos.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const url = new URL(evento.notification.data?.url || '/', self.location.origin).href
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (ventana.url.startsWith(self.location.origin) && 'focus' in ventana) {
          return ventana.navigate(url).then((v) => (v || ventana).focus())
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
