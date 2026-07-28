import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://localhost",
      },
    },
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 15000,
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**", "components/**"],
      exclude: ["**/*.test.*", "**/*.d.ts", "**/index.ts", "components/server-builder/**"],
      thresholds: {
        autoUpdate: false,
        lines: 79,
        functions: 78,
        branches: 74,
        statements: 77,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});