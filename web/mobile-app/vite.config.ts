import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { NAVIGATION_FALLBACK_DENYLIST } from './pwa-routing.js'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Without this the navigation fallback answers for /api and /admin
        // too, hiding the API and the back-office behind this app's shell.
        navigateFallbackDenylist: NAVIGATION_FALLBACK_DENYLIST,
      },
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'DigiScript',
        short_name: 'DigiScript',
        description: 'Your documents. Smarter answers.',
        theme_color: '#0066CC',
        background_color: '#F5F5F5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: {
        // Lets us verify the service worker + installability while running
        // `vite dev`, not just after a production build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
