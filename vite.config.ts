import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // GitHub Pages project site. Capacitor: `vite build --mode capacitor`
  const isCapacitor = mode === 'capacitor'
  const base = isCapacitor ? './' : '/online-translator/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          id: '/online-translator/',
          name: 'Онлайн Переводчик',
          short_name: 'Переводчик',
          description:
            'Быстрый перевод текста и речи между русским, английским, немецким, французским и испанским',
          theme_color: '#2563eb',
          background_color: '#0f172a',
          display: 'standalone',
          display_override: ['standalone', 'browser'],
          orientation: 'any',
          // Absolute path required for iOS Home Screen — "/" opens github.io root and breaks the app
          start_url: isCapacitor ? './' : '/online-translator/',
          scope: isCapacitor ? './' : '/online-translator/',
          lang: 'ru',
          dir: 'ltr',
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          navigateFallback: 'index.html',
          navigateFallbackAllowlist: [/^(?!\/__).*/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/translate\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'translate-google-cache',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                networkTimeoutSeconds: 8,
              },
            },
            {
              urlPattern: /^https:\/\/api\.mymemory\.translated\.net\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'translate-api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                networkTimeoutSeconds: 8,
              },
            },
          ],
        },
      }),
    ],
  }
})
