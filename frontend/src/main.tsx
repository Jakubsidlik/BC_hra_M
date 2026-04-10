import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { preloadCardImages } from "@/lib/preloadCardImages"

const warmCardAssetsForOffline = async () => {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.ready
    } catch {
      // Pokud SW není dostupný, fallback je běžný preload bez SW cache.
    }
  }

  await preloadCardImages()
}

void warmCardAssetsForOffline()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
