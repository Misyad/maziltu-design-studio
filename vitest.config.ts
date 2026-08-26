import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
      // Exercise the REAL axios browser build in tests (node-conditioned
      // resolution otherwise loads the node platform, which disables the
      // cookie/XSRF pipeline under test). No behavior is mocked.
      {
        find: /^axios$/,
        replacement: fileURLToPath(new URL("./src/test/axios.browser.ts", import.meta.url)),
      },
      {
        find: /^axios\/(.*)$/,
        replacement: `${fileURLToPath(new URL("./node_modules/axios/", import.meta.url))}$1`,
      },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
  },
});
