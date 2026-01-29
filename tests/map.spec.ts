import { test, expect } from './fixtures';

test.describe('Map functionality @smoke', () => {
  // Configure retries for map tests which can be flaky due to WebGL rendering
  test.describe.configure({ retries: 2 });

  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Wait for either the Mapbox or Google Map to be loaded
    await page.waitForSelector('.mapboxgl-canvas, gmp-map-3d', { timeout: 30000 });
  });

  test('should toggle the map mode', async ({ authenticatedPage: page }) => {
    const isMapbox = await page.locator('.mapboxgl-canvas').isVisible();
    if (!isMapbox) {
      test.skip(true, 'Drawing mode test is only for Mapbox');
      return;
    }

    await page.click('[data-testid="map-toggle"]');
    await page.click('[data-testid="map-mode-draw"]');

    const drawControl = page.locator('.mapboxgl-ctrl-draw-btn');
    await expect(drawControl).toBeVisible();
  });

  test('should zoom in and out using map controls', async ({ authenticatedPage: page }) => {
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
