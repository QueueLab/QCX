import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Chat functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should not allow sending empty messages', async ({ page }) => {
    await expect(page.locator('[data-testid="chat-submit"]')).toBeDisabled();
  });

  test('should allow a user to send a message and see the response', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Hello, world!');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]');
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toHaveText(/Hello, world!/);

    const botMessage = page.locator('[data-testid="bot-message"]');
    await expect(botMessage.last()).toBeVisible({ timeout: 15000 });
    
    // Check for streaming response
    const initialResponse = await botMessage.last().innerText();
    await page.waitForTimeout(1000);
    const streamingResponse = await botMessage.last().innerText();
    expect(streamingResponse.length).toBeGreaterThan(initialResponse.length);
  });

  test('should persist chat history on page reload', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'A message that should persist');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]');
    await expect(userMessage).toBeVisible();

    await page.reload();
    await page.waitForSelector('[data-testid="chat-input"]');

    await expect(userMessage).toBeVisible();
    await expect(userMessage).toHaveText(/A message that should persist/);
  });

  test('should correctly render markdown and code blocks', async ({ page }) => {
    const markdownMessage = 'Here is some `code` and a **bold** statement.';
    await page.fill('[data-testid="chat-input"]', markdownMessage);
    await page.click('[data-testid="chat-submit"]');
    
    const userMessage = page.locator('[data-testid="user-message"]');
    await expect(userMessage.last()).toBeVisible();

    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 15000 });

    const codeElement = botMessage.locator('code');
    const boldElement = botMessage.locator('strong');

    await expect(codeElement).toBeVisible();
    await expect(boldElement).toBeVisible();
  });

  test('should allow a user to attach a file', async ({ page }, testInfo) => {
    const filePath = testInfo.outputPath('test-file.txt');
    await require('fs').promises.writeFile(filePath, 'This is a test file.');

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

    const userMessage = page.locator('[data-testid="user-message"]');
    await expect(userMessage).toBeVisible();

    await page.click('[data-testid="new-chat-button"]');
    await expect(userMessage).not.toBeVisible();
  });
});
