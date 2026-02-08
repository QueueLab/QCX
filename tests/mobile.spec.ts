import { test, expect } from './fixtures';

test.describe('Mobile UI @smoke', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone 8

  test('profile toggle button should be disabled', async ({ authenticatedPage: page }) => {
    // Check that the profile toggle is disabled on mobile
    await expect(page.locator('.mobile-icons-bar-content [data-testid="profile-toggle"]')).toBeDisabled();
  });

  test('should have an enabled submit button', async ({ authenticatedPage: page }) => {
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeEnabled();
  });

});
