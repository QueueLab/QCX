import { test, expect } from '@playwright/test';

test.describe('Sidebar and Chat History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should open the history panel', async ({ page }) => {
    await page.click('[data-testid="logo-history-toggle"]');
    const historyPanel = page.locator('[data-testid="history-panel"]');
    await expect(historyPanel).toBeVisible();
  });

  test('should clear the chat history', async ({ page }) => {
    // First, send a message to create a history item
    await page.fill('[data-testid="chat-input"]', 'Create history');
    await page.click('[data-testid="chat-submit"]');
    await page.waitForSelector('[data-testid^="history-item-"]');

    // Now, open the history panel and clear the history
    await page.click('[data-testid="logo-history-toggle"]');
    await page.click('[data-testid="clear-history-button"]');
    await page.click('[data-testid="clear-history-confirm"]');

    // Verify that the history is empty
    const historyItem = page.locator('[data-testid^="history-item-"]');
    await expect(historyItem).not.toBeVisible();
  });
});
