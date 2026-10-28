import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Santa María',
        short_name: 'Santa María',
        description: 'La app de los grupos de la parroquia.',
        lang: 'es',
        theme_color: '#1d3466',
        background_color: '#faf8f3',
        display: 'standalone',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Notificaciones: public/sw-push.js agrega los eventos «push» y «notificationclick».
        importScripts: ['sw-push.js'],
        // .mjs: el trabajador de PDF.js, para abrir sin internet los libros guardados en el teléfono.
        globPatterns: ['**/*.{js,mjs,css,html}'],
        // Las fuentes traen muchos alfabetos; se guardan sólo las que el navegador llega a pedir.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 30 } },
          },
          // Fuentes y decodificadores que PDF.js pide a medida que dibuja (ver src/lib/pdf.ts). Llevan la
          // versión en la dirección, así que nunca cambian: los que se usaron con internet sirven sin él.
          {
            urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net' && url.pathname.startsWith('/npm/pdfjs-dist@'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs',
              expiration: { maxEntries: 60 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Portadas de los libros, para verlas sin internet. Cada portada nueva tiene otro nombre, así
          // que la guardada nunca queda vieja. Las imágenes se piden con crossOrigin para que el
          // teléfono sepa cuánto pesan (si no, cada una ocuparía varios megas de su espacio).
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/v1/object/public/portadas/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'portadas',
              expiration: { maxEntries: 100 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
