import { test, expect } from '@playwright/test';

test.describe.skip('Map functionality', () => {
  const loadingSpinnerSelector = 'div[class*="z-[9999]"]';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the initial app loading animation to disappear
    await expect(page.locator(loadingSpinnerSelector)).toBeHidden({ timeout: 20000 });

    // Now that the app is loaded, the default map should be visible
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible();
  });

  test('should show loading animation and load Google Maps when switching providers', async ({ page }) => {
    // Open settings
    await page.getByTestId('profile-toggle').click();
    await page.getByTestId('profile-settings').click();

    // Switch to Google Maps
    await page.getByLabel('Google').click();

    // Assert that the loading animation becomes visible
    await expect(page.locator(loadingSpinnerSelector)).toBeVisible();

    // Assert that the loading animation eventually disappears
    await expect(page.locator(loadingSpinnerSelector)).toBeHidden({ timeout: 20000 });

    // Assert that the Google Map is now visible
    await expect(page.locator('gmp-map-3d')).toBeVisible();

    // Assert that the Mapbox canvas is hidden
    await expect(page.locator('.mapboxgl-canvas')).toBeHidden();
  });

  test('should toggle the map mode', async ({ page }) => {
    const isMapbox = await page.locator('.mapboxgl-canvas').isVisible();
    if (!isMapbox) {
      test.skip(true, 'Drawing mode test is only for Mapbox');
      return;
    }

    await page.click('[data-testid="map-toggle"]');
    await page.click('[data-testid="map-mode-draw"]');
    // Add an assertion here to verify that the map is in drawing mode
    // For example, by checking for the presence of a drawing control
    const drawControl = page.locator('.mapboxgl-ctrl-draw-btn');
    await expect(drawControl).toBeVisible();
  });

  test('should zoom in and out using map controls', async ({ page }) => {
    // This test should only run on desktop where the controls are visible
    if (page.viewportSize()!.width <= 768) {
      test.skip(true, 'Zoom controls are not visible on mobile');
      return;
    }

    const isMapbox = await page.locator('.mapboxgl-canvas').isVisible();
    if (!isMapbox) {
      test.skip(true, 'Zoom controls test is only for Mapbox');
      return;
    }

    // Zoom controls are now only visible in Drawing Mode on desktop
    await page.click('[data-testid="map-toggle"]');
    await page.click('[data-testid="map-mode-draw"]');
    await expect(page.locator('.mapboxgl-ctrl-zoom-in')).toBeVisible();

    const hasMap = await page.evaluate(() => Boolean((window as any).map));
    if (!hasMap) test.skip(true, 'Map instance not available on window for E2E');

    const getZoom = () => page.evaluate(() => (window as any).map.getZoom());

    const initialZoom = await getZoom();

    await page.click('.mapboxgl-ctrl-zoom-in');
    await page.evaluate(() => new Promise(res => (window as any).map.once('zoomend', res)));

    const zoomedInZoom = await getZoom();
    expect(zoomedInZoom).toBeGreaterThan(initialZoom);

    await page.click('.mapboxgl-ctrl-zoom-out');
    await page.evaluate(() => new Promise(res => (window as any).map.once('zoomend', res)));

    const zoomedOutZoom = await getZoom();
    expect(zoomedOutZoom).toBeLessThan(zoomedInZoom);
  });
});
