import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa" // <--- TADY JE NOVÝ IMPORT
import yaml from "@rollup/plugin-yaml"
import compression from "vite-plugin-compression"

// https://vite.dev/config/
const base = process.env.GITHUB_ACTIONS ? "/BC_hra_M/" : "/";

export default defineConfig({
  // Pro GitHub Pages: base se nastaví podle názvu repozitáře
  // Lokálně "/" , na GitHub Pages "/NAZEV-REPO/"
  base,
  plugins: [
    react(), 
    tailwindcss(),
    yaml(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Komprimuj soubory větší než 10KB
      deleteOriginFile: false,
    }),
    // <--- TADY ZAČÍNÁ PWA NASTAVENÍ --->
    VitePWA({
      registerType: 'autoUpdate',
      // Aktivovat PWA i v dev módu (jinak prohlížeč nevidí manifest → zobrazuje Vite ikonu)
      devOptions: { enabled: true },
      includeAssets: [
        'fonts/Chalkduster.ttf',
        'icons/*.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2,ttf,json,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\/svg\/.*\.svg$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-svg-cache-v1',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 256,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/(?:tabule\.svg|sumace_kridou\.png)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'board-visuals-cache-v1',
              cacheableResponse: {
                statuses: [0, 200],
              },
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Math4fun',
        short_name: 'Math4fun',
        description: 'Matematická karetní duelovka z univerzitního prostředí.',
        start_url: base,
        scope: base,
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: `${base}icons/icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}icons/icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    assetsInlineLimit: 0, // Nebaluj base64 assets - ref se zbavíme komprese
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'dnd': ['@dnd-kit/core', '@dnd-kit/utilities'],
        },
      },
    },
  },
})