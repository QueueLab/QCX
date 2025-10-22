import { test, expect } from '@playwright/test';

test.describe('Map functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the map to be loaded
    await page.waitForSelector('.mapboxgl-canvas');
  });

  test('should toggle the map mode', async ({ page }) => {
    await page.click('[data-testid="map-toggle"]');
    await page.click('[data-testid="map-mode-draw"]');
    // Add an assertion here to verify that the map is in drawing mode
    // For example, by checking for the presence of a drawing control
    const drawControl = page.locator('.mapboxgl-ctrl-draw-btn');
    await expect(drawControl).toBeVisible();
  });

  test('should zoom in and out using map controls', async ({ page }) => {
    // This test is a placeholder and may need to be adjusted based on
    // how the map's zoom level is exposed to the DOM.
    const getZoom = () => page.evaluate(() => (window as any).map.getZoom());

    const initialZoom = await getZoom();
    await page.click('.mapboxgl-ctrl-zoom-in');
    await page.waitForTimeout(500); // Wait for the zoom animation
    const zoomedInZoom = await getZoom();
    expect(zoomedInZoom).toBeGreaterThan(initialZoom);

    await page.click('.mapboxgl-ctrl-zoom-out');
    await page.waitForTimeout(500); // Wait for the zoom animation
    const zoomedOutZoom = await getZoom();
    expect(zoomedOutZoom).toBeLessThan(zoomedInZoom);
  });
});
