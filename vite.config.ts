// Replit-compatible Vite config.
// Replaces @lovable.dev/vite-tanstack-config with standard equivalents while
// preserving identical behaviour. The original used these plugins internally:
//   tailwindcss, vite-tsconfig-paths, tanstackStart, mcpPlugin (lovable-mcp-js)
// Production builds targeting Cloudflare Workers still need nitro, but for
// local Replit development we skip the Lovable/Nitro build step.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  plugins: [
    // tanstackStart must come BEFORE react() (router-plugin requires it)
    tanstackStart({
      // Use src/server.ts as the SSR server entry (same as original)
      server: { entry: "server" },
    }),
    // react() provides React Refresh runtime required by TanStack Start in dev
    react(),
    tailwindcss(),
    mcpPlugin(),
  ],

  resolve: {
    // Native tsconfig paths resolution (replaces vite-tsconfig-paths plugin)
    tsconfigPaths: true,
    // Deduplicate shared packages to avoid duplicate React context issues
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
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

  server: {
    // 0.0.0.0 + allowedHosts lets Replit's proxied iframe reach the dev server
    host: "0.0.0.0",
    port: 5000,
    strictPort: false,
    allowedHosts: true,
    // Disable the Vite error overlay; the app has its own error boundaries
    hmr: { overlay: false },
    watch: {
      // Exclude bun's package cache and node_modules from file-watcher to
      // avoid ENOSPC (inotify limit) on Replit's shared container.
      ignored: [
        "**/.cache/**",
        "**/node_modules/**",
        "**/.git/**",
        "**/.agents/**",
        "**/.lovable/**",
        "**/.tanstack/tmp/**",
      ],
    },
  },
});
