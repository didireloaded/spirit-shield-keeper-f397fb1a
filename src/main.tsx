import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { validateEnv } from "@/core/config/env";

// Validate environment variables at startup
validateEnv();

createRoot(document.getElementById("root")!).render(<App />);
