import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "@/core/config/env";
import { initMonitoring } from "@/lib/monitoring";

initMonitoring();
validateEnv();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/notification-worker.js")
    .catch((err) => console.warn("[SW] Notification worker registration failed:", err));
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("[main] Could not find #root element. Check your index.html.");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
