
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// En desarrollo el frontend llama a /api y Vite lo reenvía al backend Django.
const proxyApi = {
  '/api': {
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
  },
}

export default defineConfig({
  server: { proxy: proxyApi },
  preview: { proxy: proxyApi },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/espacio/tierra-blue-marble.jpg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globIgnores: ['**/geojson/**'],
        runtimeCaching: [{
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/geojson/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'geografia-inegi-v1',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
      manifest: {
        name: 'Explora México',
        short_name: 'México',
        description:
          'Explora y comprende el territorio mexicano. Plataforma en preparación para NISAR.',
        theme_color: '#080d13',
        background_color: '#080d13',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-MX',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})
