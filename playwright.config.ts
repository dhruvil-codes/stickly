import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
  testDir: './tests', fullyParallel: true, reporter: 'list',
  use: { baseURL: 'http://localhost:1420', viewport: { width: 320, height: 320 }, launchOptions: existsSync(edge) ? { executablePath: edge } : {}, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:1420', reuseExistingServer: !process.env.CI },
});
