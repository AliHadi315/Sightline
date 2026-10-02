import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Dev: `npm run dev` proxies API calls to `python server.py` on :7860.
// Build: `npm run build` writes web/dist, which server.py serves.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:7860",
      "/samples": "http://127.0.0.1:7860",
      "/gradio": "http://127.0.0.1:7860",
    },
  },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
