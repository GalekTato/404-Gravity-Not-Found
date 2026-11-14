
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
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
