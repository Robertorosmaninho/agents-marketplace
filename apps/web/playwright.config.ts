import { existsSync } from "node:fs";

import { defineConfig } from "@playwright/test";

const apiPort = 4100;
const webPort = 3100;
const systemChromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const useSystemChrome = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME === "1";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    headless: true,
    launchOptions: useSystemChrome && existsSync(systemChromePath)
      ? {
          executablePath: systemChromePath
        }
      : undefined
  },
  webServer: [
    {
      command: `PORT=${apiPort} node tests/fixtures/mock-catalog-server.mjs`,
      url: `http://127.0.0.1:${apiPort}/catalog/services`,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `PORT=${webPort} HOSTNAME=127.0.0.1 MARKETPLACE_API_BASE_URL=http://127.0.0.1:${apiPort} MARKETPLACE_ADMIN_TOKEN=test-admin-token node .next/standalone/apps/web/server.js`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI
    }
  ]
});
