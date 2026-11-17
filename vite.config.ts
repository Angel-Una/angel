import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// base 使用相对路径，兼容 GitHub Pages 的 /仓库名/ 子路径部署
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
});
