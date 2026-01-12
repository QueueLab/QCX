import { test, expect } from '@playwright/test';

test.describe('Mobile UI', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone 8

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the main chat input to be visible, indicating the app is ready
    await page.locator('[data-testid="chat-input"]').waitFor({ state: 'visible', timeout: 30000 });
  });

  test('profile toggle button should be disabled', async ({ page }) => {
    // Check that the profile toggle is disabled on mobile
    await expect(page.locator('.mobile-icons-bar-content [data-testid="profile-toggle"]')).toBeDisabled();
  });

  test('should have a disabled submit button', async ({ page }) => {
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeDisabled();
  });
});
