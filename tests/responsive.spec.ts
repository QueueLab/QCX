import { test, expect } from './fixtures';

test.describe.configure({ mode: 'parallel' });

test.describe('Responsive design - Desktop @smoke', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('should display desktop layout', async ({ authenticatedPage: page }) => {
    // Sidebar should be visible on desktop
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();

    // Mobile menu should not be visible
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    await expect(mobileMenu).not.toBeVisible();
  });

  test('should display full header with all elements', async ({ authenticatedPage: page }) => {
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="calendar-toggle"]')).toBeVisible();
  });

  test('should show map alongside chat', async ({ authenticatedPage: page }) => {
    const chatContainer = page.locator('[data-testid="chat-container"]');
    const mapContainer = page.locator('.mapboxgl-canvas');

    await expect(chatContainer).toBeVisible();
    await expect(mapContainer).toBeVisible();

    const chatBox = await chatContainer.boundingBox();
    const mapBox = await mapContainer.boundingBox();
    
    expect(chatBox).toBeTruthy();
    expect(mapBox).toBeTruthy();
  });
});

test.describe('Responsive design - Tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('should display tablet layout', async ({ authenticatedPage: page }) => {
    const container = page.locator('[data-testid="main-container"]');
    await expect(container).toBeVisible();

    const sidebar = page.locator('[data-testid="sidebar"]');
    const sidebarBox = await sidebar.boundingBox();
    
    if (sidebarBox) {
      expect(sidebarBox.width).toBeLessThan(300);
    }
  });

  test('should handle touch interactions', async ({ authenticatedPage: page }) => {
    const chatSubmit = page.locator('[data-testid="chat-submit"]');
    const buttonBox = await chatSubmit.boundingBox();
    
    expect(buttonBox).toBeTruthy();
    if (buttonBox) {
      expect(buttonBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('should reflow content appropriately', async ({ authenticatedPage: page }) => {
    await page.fill('[data-testid="chat-input"]', 'Test message for tablet');
    await page.click('[data-testid="chat-submit"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();

    const messageBox = await userMessage.boundingBox();
    const viewportWidth = 768;
    
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeLessThanOrEqual(viewportWidth);
    }
  });
});

test.describe('Responsive design - Mobile @smoke', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile layout', async ({ authenticatedPage: page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();

    const mobileNav = page.locator('[data-testid="mobile-icons-bar"]');
    await expect(mobileNav).toBeVisible();
  });

  test('should have mobile-optimized input', async ({ authenticatedPage: page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    const inputBox = await chatInput.boundingBox();
    const viewportWidth = 375;
    
    expect(inputBox).toBeTruthy();
    if (inputBox) {
      expect(inputBox.width).toBeGreaterThan(viewportWidth * 0.6);
    }
  });

  test('should toggle map view on mobile', async ({ authenticatedPage: page }) => {
    const mapToggle = page.locator('[data-testid="map-toggle"]');
    
    if (await mapToggle.isVisible()) {
      await mapToggle.click();
      
      const mapContainer = page.locator('.mapboxgl-canvas');
      await expect(mapContainer).toBeVisible();
    }
  });

  test('should handle mobile menu', async ({ authenticatedPage: page }) => {
    const menuButton = page.locator('[data-testid="mobile-menu-button"]');
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      const menu = page.locator('[data-testid="mobile-menu"]');
      await expect(menu).toBeVisible();
    }
  });

  test('should have appropriately sized touch targets', async ({ authenticatedPage: page }) => {
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
          expect(buttonBox.height).toBeGreaterThanOrEqual(40);
          expect(buttonBox.width).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('should prevent horizontal scroll', async ({ authenticatedPage: page }) => {
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('should stack elements vertically', async ({ authenticatedPage: page }) => {
    await page.fill('[data-testid="chat-input"]', 'Mobile test message');
    await page.click('[data-testid="mobile-submit-button"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();

    const messageBox = await userMessage.boundingBox();
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeGreaterThan(300);
    }
  });
});

test.describe('Responsive design - Small Mobile', () => {
  test.use({ viewport: { width: 320, height: 568 } }); // iPhone 5/SE

  test('should work on very small screens', async ({ authenticatedPage: page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    await chatInput.fill('Small screen test');
    
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should not have text overflow', async ({ authenticatedPage: page }) => {
    await page.fill('[data-testid="chat-input"]', 'This is a longer message to test text wrapping on very small mobile screens');
    await page.click('[data-testid="mobile-submit-button"]');

    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();

    const messageBox = await userMessage.boundingBox();
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeLessThanOrEqual(320);
    }
  });
});

test.describe('Responsive design - Large Desktop', () => {
  test.use({ viewport: { width: 2560, height: 1440 } }); // 2K display

  test('should utilize large screen space', async ({ authenticatedPage: page }) => {
    const mainContainer = page.locator('[data-testid="main-container"]');
    const containerBox = await mainContainer.boundingBox();
    
    expect(containerBox).toBeTruthy();
    if (containerBox) {
      expect(containerBox.width).toBeGreaterThan(1200);
    }
  });

  test('should maintain readable line lengths', async ({ authenticatedPage: page }) => {
    await page.fill('[data-testid="chat-input"]', 'Test message on large display');
    await page.click('[data-testid="chat-submit"]');

    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 15000 });

    const messageBox = await botMessage.boundingBox();
    expect(messageBox).toBeTruthy();
    if (messageBox) {
      expect(messageBox.width).toBeLessThan(1200);
    }
  });
});

test.describe('Responsive design - Orientation changes', () => {
  test('should handle portrait to landscape transition', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();

    await page.setViewportSize({ width: 667, height: 375 });
    
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Orientation test');
    
    const submitButton = page.locator('[data-testid="mobile-submit-button"]');
    await expect(submitButton).toBeEnabled();
  });

  test('should handle landscape to portrait transition', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    
    await page.fill('[data-testid="chat-input"]', 'Landscape message');
    await page.click('[data-testid="mobile-submit-button"]');

    await page.setViewportSize({ width: 375, height: 667 });
    
    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();
  });
});
