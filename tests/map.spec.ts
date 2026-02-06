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
<<<<<<< HEAD
=======
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

>>>>>>> origin/main
    const hasMap = await page.evaluate(() => Boolean((window as any).map));
    if (!hasMap) test.skip(true, 'Map instance not available on window for E2E');

    const getZoom = () => page.evaluate(() => (window as any).map.getZoom());

    const initialZoom = await getZoom();
    await page.click('.mapboxgl-ctrl-zoom-in');
    await page.waitForFunction(() => (window as any).map.getZoom() > initialZoom);
    const zoomedInZoom = await getZoom();
    expect(zoomedInZoom).toBeGreaterThan(initialZoom);

    await page.click('.mapboxgl-ctrl-zoom-out');
    await page.waitForFunction(() => (window as any).map.getZoom() < zoomedInZoom);
    const zoomedOutZoom = await getZoom();
    expect(zoomedOutZoom).toBeLessThan(zoomedInZoom);
  });
});
