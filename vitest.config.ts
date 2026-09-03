import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    projects: [
      {
        test: {
          name: "core",
          include: ["test/core/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "page",
          include: ["test/page/**/*.test.ts"],
          environment: "jsdom",
        },
      },
    ],
  },
});
