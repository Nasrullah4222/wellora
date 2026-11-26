import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
export default defineConfig(({ mode }) => {
  const { VITE_API_URL } = loadEnv(mode, process.cwd(), "");
  if (mode === "production") {
    let apiUrl;
    try {
      apiUrl = new URL(VITE_API_URL);
    } catch {
      throw new Error("Set VITE_API_URL to the deployed HTTPS API base URL ending in /api/v1 before building for production.");
    }
    const host = apiUrl.hostname.toLowerCase();
    const isPlaceholderHost =
      host === "example.com" || host.endsWith(".example.com") || host.endsWith(".invalid") || host.endsWith(".test");
    if (
      apiUrl.protocol !== "https:" ||
      apiUrl.hostname === "localhost" ||
      apiUrl.hostname === "127.0.0.1" ||
      isPlaceholderHost ||
      !apiUrl.pathname.replace(/\/+$/, "").endsWith("/api/v1")
    ) {
      throw new Error("VITE_API_URL must be a real deployed HTTPS API base URL ending in /api/v1 for production.");
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    server: { port: 5173 },
  };
});
