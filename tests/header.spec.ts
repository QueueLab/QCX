import { test, expect } from '@playwright/test';

test.describe('Header and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    try {
      await page.locator('text=Later').click({ timeout: 3000 });
    } catch (e) {}
  });

  test('should toggle the theme in settings', async ({ page }) => {
    // Theme selector is now placed above the settings tabs
    await page.click('[data-testid="profile-toggle"]');
    await page.click('[data-testid="profile-settings"]');

    await page.click('[data-testid="theme-select-dark"]');
    const html = page.locator('html');
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);

    await page.click('[data-testid="theme-select-light"]');
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
  });

  test('should open the profile menu', async ({ page }) => {
    await page.click('[data-testid="profile-toggle"]');
    const accountMenu = page.locator('[data-testid="profile-account"]');
    await expect(accountMenu).toBeVisible();
  });

  test('should open the calendar', async ({ page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    const calendar = page.locator('[data-testid="calendar-notepad"]');
    await expect(calendar).toBeVisible();
  });
});
