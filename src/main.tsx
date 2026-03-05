import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "@/core/config/env";
import { initMonitoring } from "@/lib/monitoring";

// Initialize monitoring before anything else
initMonitoring();

// Validate environment variables at startup
validateEnv();

// Register notification service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/notification-worker.js")
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
