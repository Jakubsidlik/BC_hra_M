import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa" // <--- TADY JE NOVÝ IMPORT

// https://vite.dev/config/
export default defineConfig({
  // Pro GitHub Pages: base se nastaví podle názvu repozitáře
  // Lokálně "/" , na GitHub Pages "/NAZEV-REPO/"
  base: process.env.GITHUB_ACTIONS ? "/BC_hra_M/" : "/",
  plugins: [
    react(), 
    tailwindcss(),
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
        start_url: '/',
        scope: '/',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
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
})