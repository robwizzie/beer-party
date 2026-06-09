import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Beer Party — Vite + React. Single-page app, no router needed.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
});
