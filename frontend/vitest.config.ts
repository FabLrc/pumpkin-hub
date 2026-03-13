import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["lib/**", "components/**", "app/**"],
      exclude: ["**/*.test.*", "**/*.d.ts"],
      thresholds: {
        autoUpdate: false,
        lines: 29.19,
        functions: 33.56,
        branches: 23.53,
        statements: 29.63,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});