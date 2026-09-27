import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Keep only leaf-heavy libraries in dedicated chunks. React, charts,
        // Radix, and shared dependencies must stay together so the browser
        // never evaluates a circular shared-chunk import on first paint.
        manualChunks(id) {
          // Shared CJS interop helpers must never land inside a lazy vendor
          // chunk, or that chunk becomes a static dependency of the entry.
          if (id.includes("commonjsHelpers")) return "cjs-helpers";
          if (!id.includes("node_modules")) return;
          // React must live in its own chunk, otherwise Rollup folds it into
          // whichever vendor chunk claims it first (e.g. the Quill editor),
          // dragging that chunk into the entry graph on every page load.
          if (
            /node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//.test(id) ||
            id.includes("react/jsx-runtime")
          )
            return "react";
          if (/node_modules\/lodash/.test(id)) return "lodash";
          if (id.includes("quill")) return "editor";
          if (id.includes("xlsx")) return "xlsx";
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("lottie")) return "lottie";
          if (id.includes("libphonenumber-js")) return "phone";
        },
      },
    },
  },
}));
