import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Chat functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should allow a user to send a message and see the response', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Hello, world!');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('div.items-end');
    await expect(userMessage).toBeVisible();

    const botMessage = page.locator('div.items-start');
    await expect(botMessage.last()).toBeVisible({ timeout: 15000 });
  });

  test('should allow a user to attach a file', async ({ page }) => {
    const filePath = path.join(__dirname, 'test-file.txt');
    // Create a dummy file for the test
    require('fs').writeFileSync(filePath, 'This is a test file.');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await expect(page.locator('text=test-file.txt')).toBeVisible();

    await page.click('[data-testid="clear-attachment-button"]');
    await expect(page.locator('text=test-file.txt')).not.toBeVisible();
  });

  test('should start a new chat', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'First message');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('div.items-end');
    await expect(userMessage).toBeVisible();

    await page.click('[data-testid="new-chat-button"]');
    await expect(userMessage).not.toBeVisible();
  });
});
