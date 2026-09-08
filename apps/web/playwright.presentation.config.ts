import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig(baseConfig, {
  testMatch: "**/presentation-screenshots.pw.ts",
  outputDir: "test-results/presentation-run",
  use: {
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
