import { test as base, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const test = base.extend<{
  authenticatedPage: Page;
  testImage: string;
}>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/');
    // Increased timeout for CI environments
    await page.waitForSelector('[data-testid="chat-input"]', { timeout: 30000 });
    await use(page);

    // Cleanup after test to ensure isolation
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  },

  testImage: async ({}, use) => {
    const fixturesDir = path.join(process.cwd(), 'test-fixtures');
    const imagePath = path.join(fixturesDir, 'test-image.png');

    // Ensure the directory exists
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a simple 1x1 PNG image if it doesn't exist
    if (!fs.existsSync(imagePath)) {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      fs.writeFileSync(imagePath, pngBuffer);
    }

    await use(imagePath);
  }
});

export { expect } from '@playwright/test';
