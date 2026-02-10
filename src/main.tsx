import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "@/core/config/env";

// Validate environment variables at startup
validateEnv();

// Register notification service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/notification-worker.js")
    .then((reg) => console.log("[SW] Notification worker registered", reg.scope))
    .catch((err) => console.warn("[SW] Registration failed:", err));
}

createRoot(document.getElementById("root")!).render(<App />);
