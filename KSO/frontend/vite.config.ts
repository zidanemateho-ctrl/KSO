import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1", ".ngrok-free.dev", ".ngrok.io"],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/health": {
        target: "http://localhost:4000",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true,
        changeOrigin: true
      }
    }
  }
});
