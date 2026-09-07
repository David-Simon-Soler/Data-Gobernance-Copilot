import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const webRoot = __dirname;
const apiRoot = resolve(webRoot, "../api");
const pythonExecutable =
  process.env.DGC_E2E_PYTHON ?? resolve(apiRoot, ".venv/bin/python");

if (!existsSync(pythonExecutable)) {
  throw new Error(
    "Backend Python not found at " +
      pythonExecutable +
      ". Create apps/api/.venv or set DGC_E2E_PYTHON.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        JSON.stringify(pythonExecutable) +
        " -m uvicorn app.main:app --host 127.0.0.1 --port 8000",
      cwd: apiRoot,
      env: {
        DATA_GOV_CORS_ORIGINS: "http://localhost:3000",
      },
      url: "http://127.0.0.1:8000/health",
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run build && npm run start",
      cwd: webRoot,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8000",
      },
      url: "http://localhost:3000",
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
