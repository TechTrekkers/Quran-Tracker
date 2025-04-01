import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { initDatabase } from "./lib/db";

// Register service worker for PWA functionality
registerServiceWorker();

// Initialize the IndexedDB database
initDatabase().catch(error => {
  console.error("Failed to initialize database:", error);
});

createRoot(document.getElementById("root")!).render(<App />);
