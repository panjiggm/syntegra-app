import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],

  // Build optimization for Cloudflare Pages
  build: {
    // Enable minification in production
    minify: mode === "production" ? "esbuild" : false,

    // Optimize chunk splitting

    // Enable source maps for debugging
    sourcemap: mode !== "production",

    // Target modern browsers for better performance
    target: "es2020",
  },

  // Server configuration for development
  server: {
    port: 5173,
    host: true,
  },

  // Preview configuration
  preview: {
    port: 5173,
    host: true,
  },

  // Define global constants
  define: {
    __DEVELOPMENT__: mode === "development",
    __PRODUCTION__: mode === "production",
  },

  // Environment variables prefix
  envPrefix: "VITE_",
}));
