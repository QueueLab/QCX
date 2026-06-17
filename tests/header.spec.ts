import { test, expect } from './fixtures';

test.describe('Header and Navigation @smoke', () => {
  test('should toggle the theme', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="theme-toggle"]');
    await page.click('[data-testid="theme-dark"]');
    const html = page.locator('html');
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);

    await page.click('[data-testid="theme-toggle"]');
    await page.click('[data-testid="theme-light"]');
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
  });

  test('should open the profile menu', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="profile-toggle"]');
    const accountMenu = page.locator('[data-testid="profile-account"]');
    await expect(accountMenu).toBeVisible();
  });

  test('should open the calendar', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    const calendar = page.locator('[data-testid="calendar-notepad"]');
    await expect(calendar).toBeVisible();
  });

});
