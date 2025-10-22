import { test, expect } from '@playwright/test';

test.describe('Header and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should toggle the theme', async ({ page }) => {
    await page.click('[data-testid="theme-toggle"]');
    await page.click('[data-testid="theme-dark"]');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('class', 'dark');

    await page.click('[data-testid="theme-toggle"]');
    await page.click('[data-testid="theme-light"]');
    await expect(html).not.toHaveAttribute('class', 'dark');
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
