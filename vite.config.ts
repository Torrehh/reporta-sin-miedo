import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Reporta Sin Miedo',
        short_name: 'Reporta',
        description: 'Reporta casi-accidentes de forma rápida y confidencial.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        theme_color: '#123b68',
        background_color: '#eef3f8',
        icons: [
          { src: './pwa-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: './pwa-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          {
            src: './pwa-maskable.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
})
