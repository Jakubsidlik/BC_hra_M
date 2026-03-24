import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@fontsource/merienda/400.css"
import "@fontsource/merienda/700.css"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
