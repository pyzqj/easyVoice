import { defineConfig } from 'vite';
import vue from "@vitejs/plugin-vue";
import path from "path";
export default defineConfig({

  plugins: [vue()],
  base: '/', // 确保基础路径正确
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "./dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  }
});