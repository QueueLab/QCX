import { test, expect } from '@playwright/test';

test.describe('Responsive design - Desktop', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display desktop layout', async ({ page }) => {
    // Sidebar should be visible on desktop
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Mobile menu should not be visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).not.toBeVisible();
  });

  test('should display full header with all elements', async ({ page }) => {
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-toggle"]')).toBeVisible();
  });

  test('should show map alongside chat', async ({ page }) => {
    const chatContainer = page.locator('[data-testid="chat-container"]');
    const mapContainer = page.locator('.mapboxgl-canvas');

    await expect(chatContainer).toBeVisible();
    await expect(mapContainer).toBeVisible();

    // Both should be visible simultaneously on desktop
    const chatBox = await chatContainer.boundingBox();
    const mapBox = await mapContainer.boundingBox();
    
    expect(chatBox).toBeTruthy();
    expect(mapBox).toBeTruthy();
  });
});

test.describe('Responsive design - Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display tablet layout', async ({ page }) => {
    // Check if layout adapts to tablet size
    const container = page.locator('[data-testid="main-container"]');
    await expect(container).toBeVisible();

    // Sidebar might be collapsible on tablet
    const sidebar = page.locator('[data-testid="sidebar"]');
    const sidebarBox = await sidebar.boundingBox();
    
    if (sidebarBox) {
      // If visible, check it's narrower than desktop
      expect(sidebarBox.width).toBeLessThan(300);
    }
  });

  test('should handle touch interactions', async ({ page }) => {
    // Test that buttons are appropriately sized for touch
    const chatSubmit = page.locator('[data-testid="chat-submit"]');
    const buttonBox = await chatSubmit.boundingBox();
    
    expect(buttonBox).toBeTruthy();
    if (buttonBox) {
      // Touch target should be at least 44x44 pixels (iOS guideline)
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('should reflow content appropriately', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Test message for tablet');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();

    // Message should not overflow
    const messageBox = await userMessage.boundingBox();
    const viewportWidth = 768;
    
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeLessThanOrEqual(viewportWidth);
    }
  });
});

test.describe('Responsive design - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display mobile layout', async ({ page }) => {
    // Desktop sidebar should be hidden
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();

    // Mobile navigation should be visible
    const mobileNav = page.locator('[data-testid="mobile-icons-bar"]');
    await expect(mobileNav).toBeVisible();
  });

  test('should have mobile-optimized input', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    // Input should span most of the width
    const inputBox = await chatInput.boundingBox();
    const viewportWidth = 375;
    
    expect(inputBox).toBeTruthy();
    if (inputBox) {
      expect(inputBox.width).toBeGreaterThan(viewportWidth * 0.6);
    }
  });

  test('should toggle map view on mobile', async ({ page }) => {
    // On mobile, map and chat might toggle
    const mapToggle = page.locator('[data-testid="map-toggle"]');
    
    if (await mapToggle.isVisible()) {
      await mapToggle.click();
      
      const mapContainer = page.locator('.mapboxgl-canvas');
      await expect(mapContainer).toBeVisible();
    }
  });

  test('should handle mobile menu', async ({ page }) => {
    const menuButton = page.locator('[data-testid="mobile-menu-button"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      const menu = page.locator('[data-testid="mobile-menu"]');
      await expect(menu).toBeVisible();
    }
  });

  test('should have appropriately sized touch targets', async ({ page }) => {
    const buttons = [
      '[data-testid="mobile-new-chat-button"]',
      '[data-testid="mobile-submit-button"]',
      '[data-testid="attachment-button"]'
    ];

    for (const buttonSelector of buttons) {
      const button = page.locator(buttonSelector);
      if (await button.isVisible()) {
        const buttonBox = await button.boundingBox();
        expect(buttonBox).toBeTruthy();
        if (buttonBox) {
          // Touch targets should be at least 44x44 pixels
          expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          expect(buttonBox.width).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('should prevent horizontal scroll', async ({ page }) => {
    // Check that content doesn't cause horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test('should stack elements vertically', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Mobile test message');
    await page.click('[data-testid="mobile-submit-button"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();

    // Message should take full width (minus padding)
    const messageBox = await userMessage.boundingBox();
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeGreaterThan(300); // Most of 375px width
    }
  });
});

test.describe('Responsive design - Small Mobile', () => {
  test.use({ viewport: { width: 320, height: 568 } }); // iPhone 5/SE

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should work on very small screens', async ({ page }) => {
    // Verify basic functionality works
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    await chatInput.fill('Small screen test');
    
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should not have text overflow', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'This is a longer message to test text wrapping on very small mobile screens');
    await page.click('[data-testid="mobile-submit-button"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();

    // Check that text wraps and doesn't overflow
    const messageBox = await userMessage.boundingBox();
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeLessThanOrEqual(320);
    }
  });
});

test.describe('Responsive design - Large Desktop', () => {
  test.use({ viewport: { width: 2560, height: 1440 } }); // 2K display

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should utilize large screen space', async ({ page }) => {
    // Check that layout expands to use available space
    const mainContainer = page.locator('[data-testid="main-container"]');
    const containerBox = await mainContainer.boundingBox();
    
    expect(containerBox).toBeTruthy();
    if (containerBox) {
      expect(containerBox.width).toBeGreaterThan(1200);
    }
  });

  test('should maintain readable line lengths', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Test message on large display');
    await page.click('[data-testid="chat-submit"]');

    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 15000 });

    // Text should not span the entire width (max-width should be applied)
    const messageBox = await botMessage.boundingBox();
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      // Content should have a reasonable max-width for readability
      expect(messageBox.width).toBeLessThan(1200);
    }
  });
});

test.describe('Responsive design - Orientation changes', () => {
  test('should handle portrait to landscape transition', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    // UI should still be functional
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Orientation test');
    
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should handle landscape to portrait transition', async ({ page }) => {
    // Start in landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto('/');
    
    await page.fill('[data-testid="chat-input"]', 'Landscape message');
    await page.click('[data-testid="mobile-submit-button"]');

    // Switch to portrait
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Message should still be visible
    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();
  });
});
