
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  define: { CESIUM_BASE_URL: JSON.stringify('/cesium/') },
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: ['Workers', 'ThirdParty', 'Assets', 'Widgets'].map(directory => ({
        src: `node_modules/cesium/Build/Cesium/${directory}`,
        dest: 'cesium',
        rename: { stripBase: 4 },
      })),
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globIgnores: ['**/cesium/**'],
        runtimeCaching: [{
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/cesium/'),
          handler: 'CacheFirst',
          options: {
            cacheName: 'cesium-static-v1',
            expiration: { maxEntries: 250, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
      manifest: {
        name: 'Earth Symphony',
        short_name: 'EarthSymphony',
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
