
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    watch: {
      ignored: ['**/.taste-skill/**', '**/data/**', '**/pipeline/**', '**/nasa_api/**', '**/tests/**'],
    },
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
  },
  preview: { proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['assets/espacio/tierra-blue-marble.jpg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globIgnores: ['**/geojson/**', '**/index.html'],
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'terrasync-pages-v1',
            networkTimeoutSeconds: 5,
            cacheableResponse: { statuses: [200] },
          },
        }, {
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/geojson/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'geografia-inegi-v2',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 40, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
      manifest: {
        name: 'TerraSync · México',
        short_name: 'TerraSync',
        description:
          'Atlas de observaciones e indicadores de México por estado, fenómeno y mes.',
        theme_color: '#101f29',
        background_color: '#101f29',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es-MX',
        icons: [
          { src: '/logo-equipo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
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
