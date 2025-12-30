import { test, expect } from '@playwright/test';

test.describe('Mobile UI', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone 8

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should interact with the mobile icons bar', async ({ page }) => {
    // Test a few buttons on the mobile icons bar
    await page.click('[data-testid="mobile-new-chat-button"]');
    // Add an assertion to verify the action, e.g., the chat is cleared
    const userMessage = page.locator('div.items-end');
    await expect(userMessage).not.toBeVisible();

    await page.click('[data-testid="profile-toggle"]');
    // Add an assertion to verify the profile menu opens
    const accountMenu = page.locator('[data-testid="profile-account"]');
    await expect(accountMenu).toBeVisible();
  });

  test('should have a disabled submit button', async ({ page }) => {
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeDisabled();
  });
});
