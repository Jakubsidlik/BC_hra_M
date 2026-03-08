import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa" // <--- TADY JE NOVÝ IMPORT

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    // <--- TADY ZAČÍNÁ PWA NASTAVENÍ --->
    VitePWA({
      registerType: 'autoUpdate',
      // Říkáme aplikaci, jaké soubory si má uložit do paměti telefonu pro rychlé načítání
      includeAssets: ['tabule.svg', 'fonts/Chalkduster.ttf'], 
      manifest: {
        name: 'Teorie křídy',
        short_name: 'Teorie křídy',
        description: 'Matematická karetní duelovka z univerzitního prostředí.',
        theme_color: '#0f172a', // Barva horní lišty telefonu (odpovídá slate-900)
        background_color: '#0f172a', // Barva při zapínání appky
        display: 'standalone', // To nejdůležitější: Schová prohlížeč a tváří se jako normální appka!
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
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