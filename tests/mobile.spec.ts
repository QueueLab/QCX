import { test, expect } from '@playwright/test';

test.describe('Mobile UI', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone 8

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the mobile icons bar', async ({ page }) => {
    const mobileIconsBar = page.locator('.mobile-icons-bar');
    await expect(mobileIconsBar).toBeVisible();
  });

  test('should interact with the mobile icons bar', async ({ page }) => {
    // Test a few buttons on the mobile icons bar
    await page.click('[data-testid="mobile-new-chat-button"]');
    // Add an assertion to verify the action, e.g., the chat is cleared
    const userMessage = page.locator('div.items-end');
    await expect(userMessage).not.toBeVisible();

    await page.click('[data-testid="mobile-profile-button"]');
    // Add an assertion to verify the profile menu opens
    const accountMenu = page.locator('[data-testid="profile-account"]');
    await expect(accountMenu).toBeVisible();
  });
});
