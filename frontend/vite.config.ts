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
      includeAssets: ['tabule.svg', 'fonts/Chalkduster.ttf'],
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