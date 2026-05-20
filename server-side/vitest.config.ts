import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/env.setup.ts"],
    include: ["tests/**/*.{test,spec}.ts"],
    hookTimeout: 30000, // Increase timeout for MongoMemoryServer setup
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/index.ts", "src/assets/**", "src/templates/**"],
    },
  },
});
