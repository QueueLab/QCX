import { test, expect } from '@playwright/test';

test.describe('Chat Persistence and Retrieval', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should save a chat and retrieve it after navigating to a new chat', async ({ page }) => {
    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Test message for persistence');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible({ timeout: 15000 });
    await expect(userMessage).toHaveText(/Test message for persistence/);

    // Wait for the response to complete and URL to update
    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Wait for URL to update to /search/[id]
    await expect(page).toHaveURL(/\/search\/[a-zA-Z0-9\-]+/, { timeout: 10000 });

    // Navigate to home (new chat)
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');

    // Verify the new chat page is empty
    const emptyScreen = page.locator('[data-testid="empty-screen"]');
    await expect(emptyScreen).toBeVisible({ timeout: 5000 });

    // Navigate back to the search page to verify retrieval
    // Get the current search URL from history
    await page.goBack();
    await page.waitForSelector('[data-testid="chat-input"]');

    // The previous chat messages should be visible
    const retrievedUserMessage = page.locator('[data-testid="user-message"]').last();
    await expect(retrievedUserMessage).toBeVisible({ timeout: 10000 });
    await expect(retrievedUserMessage).toHaveText(/Test message for persistence/);
  });

  test('should save multiple chats independently', async ({ page }) => {
    // First chat
    await page.fill('[data-testid="chat-input"]', 'First chat message');
    await page.click('[data-testid="chat-submit"]');
    const firstMessage = page.locator('[data-testid="user-message"]').last();
    await expect(firstMessage).toBeVisible({ timeout: 15000 });

    const botResponse = page.locator('[data-testid="bot-message"]').last();
    await expect(botResponse).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/search\/[a-zA-Z0-9\-]+/, { timeout: 10000 });

    // Save the first chat URL
    const firstChatUrl = page.url();

    // New chat
    await page.click('[data-testid="new-chat-button"]');
    await page.waitForSelector('[data-testid="chat-input"]');

    // Second chat
    await page.fill('[data-testid="chat-input"]', 'Second chat message');
    await page.click('[data-testid="chat-submit"]');
    const secondMessage = page.locator('[data-testid="user-message"]').last();
    await expect(secondMessage).toBeVisible({ timeout: 15000 });
    await expect(secondMessage).toHaveText(/Second chat message/);

    const secondBotResponse = page.locator('[data-testid="bot-message"]').last();
    await expect(secondBotResponse).toBeVisible({ timeout: 30000 });

    // Navigate back to first chat
    await page.goto(firstChatUrl);
    await page.waitForSelector('[data-testid="chat-input"]');

    // First chat should still have its message
    const retrievedFirstMessage = page.locator('[data-testid="user-message"]').last();
    await expect(retrievedFirstMessage).toBeVisible({ timeout: 10000 });
    await expect(retrievedFirstMessage).toHaveText(/First chat message/);
  });

  test('should persist chat after page reload', async ({ page }) => {
    // Send a message
    await page.fill('[data-testid="chat-input"]', 'Persist across reload test');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible({ timeout: 15000 });
    await expect(userMessage).toHaveText(/Persist across reload test/);

    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Wait for URL to update
    await expect(page).toHaveURL(/\/search\/[a-zA-Z0-9\-]+/, { timeout: 10000 });

    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="chat-input"]');

    // Verify messages are still visible after reload
    const persistedUserMessage = page.locator('[data-testid="user-message"]').last();
    await expect(persistedUserMessage).toBeVisible({ timeout: 10000 });
    await expect(persistedUserMessage).toHaveText(/Persist across reload test/);
  });
});

test.describe('Chat History Clearing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should clear history without crashing', async ({ page }) => {
    // Create a chat first
    await page.fill('[data-testid="chat-input"]', 'Message before clear');
    await page.click('[data-testid="chat-submit"]');
    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible({ timeout: 15000 });

    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Wait for URL to update
    await expect(page).toHaveURL(/\/search\/[a-zA-Z0-9\-]+/, { timeout: 10000 });

    // Open history panel
    await page.click('[data-testid="history-button"]');
    const historyPanel = page.locator('[data-testid="history-panel"]');
    await expect(historyPanel).toBeVisible({ timeout: 5000 });

    // Click clear history button
    await page.click('[data-testid="clear-history-button"]');

    // Confirm in the dialog
    await page.click('[data-testid="clear-history-confirm"]');

    // Wait for the redirect to home
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Verify we're on a clean page
    const emptyScreen = page.locator('[data-testid="empty-screen"]');
    await expect(emptyScreen).toBeVisible({ timeout: 5000 });
  });

  test('should clear history multiple times without error', async ({ page }) => {
    // Create first chat
    await page.fill('[data-testid="chat-input"]', 'First message');
    await page.click('[data-testid="chat-submit"]');
    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Open history and clear
    await page.click('[data-testid="history-button"]');
    await page.click('[data-testid="clear-history-button"]');
    await page.click('[data-testid="clear-history-confirm"]');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Wait a moment for the app to settle
    await page.waitForTimeout(1000);

    // Create second chat
    await page.fill('[data-testid="chat-input"]', 'Second message');
    await page.click('[data-testid="chat-submit"]');
    const secondBotMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(secondBotMessage).toBeVisible({ timeout: 30000 });

    // Open history and clear again
    await page.click('[data-testid="history-button"]');
    await page.click('[data-testid="clear-history-button"]');
    await page.click('[data-testid="clear-history-confirm"]');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Verify clean state
    const emptyScreen = page.locator('[data-testid="empty-screen"]');
    await expect(emptyScreen).toBeVisible({ timeout: 5000 });
  });

  test('should not crash when clearing history from a /search/[id] page', async ({ page }) => {
    // Create a chat and navigate to it
    await page.fill('[data-testid="chat-input"]', 'Clear from search page');
    await page.click('[data-testid="chat-submit"]');
    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/search\/[a-zA-Z0-9\-]+/, { timeout: 10000 });

    // Open history panel while on the search page
    await page.click('[data-testid="history-button"]');
    await expect(page.locator('[data-testid="history-panel"]')).toBeVisible({ timeout: 5000 });

    // Clear history
    await page.click('[data-testid="clear-history-button"]');
    await page.click('[data-testid="clear-history-confirm"]');

    // Should redirect to home without crashing
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Verify no error or crash
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({ timeout: 5000 });
  });

  test('should show empty history after clearing', async ({ page }) => {
    // Create a chat
    await page.fill('[data-testid="chat-input"]', 'History test message');
    await page.click('[data-testid="chat-submit"]');
    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Open history and verify items exist
    await page.click('[data-testid="history-button"]');
    const historyItems = page.locator('[data-testid^="history-item-"]');
    await expect(historyItems.first()).toBeVisible({ timeout: 5000 });

    // Clear history
    await page.click('[data-testid="clear-history-button"]');
    await page.click('[data-testid="clear-history-confirm"]');
    await expect(page).toHaveURL('http://localhost:3000/', { timeout: 10000 });

    // Open history and verify it's empty
    await page.click('[data-testid="history-button"]');
    const noHistoryText = page.locator('text=No search history');
    await expect(noHistoryText).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Chat Save for All Message Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should save chat even without a response message type', async ({ page }) => {
    // Send a message and wait for the chat to be saved
    await page.fill('[data-testid="chat-input"]', 'Save test without response type');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible({ timeout: 15000 });

    // Wait for the bot response
    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 30000 });

    // Verify URL updated (indicating chat was saved)
    await expect(page).toHaveURL(/\/search\/[a-zA-Z0-9\-]+/, { timeout: 10000 });

    // Navigate to home and back to verify persistence
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');

    // Go back to the search page
    await page.goBack();
    await page.waitForSelector('[data-testid="chat-input"]');

    // Messages should still be visible
    const retrievedMessage = page.locator('[data-testid="user-message"]').last();
    await expect(retrievedMessage).toBeVisible({ timeout: 10000 });
    await expect(retrievedMessage).toHaveText(/Save test without response type/);
  });
});
