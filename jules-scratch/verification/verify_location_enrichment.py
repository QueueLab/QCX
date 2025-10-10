import re
from playwright.sync_api import Page, expect

def test_location_enrichment(page: Page):
    """
    This test verifies that submitting a location query correctly
    triggers the geojsonEnrichment tool and renders the
    LocationResponseHandler component with a map and text.
    """
    # 1. Arrange: Go to the application's homepage.
    page.goto("http://localhost:3000")

    # Wait for any initial loading overlays to disappear.
    loading_overlay = page.locator('div[class*="z-[9999]"]')
    expect(loading_overlay).to_be_hidden(timeout=30000)

    # Take a screenshot for debugging before interacting with the page.
    page.screenshot(path="jules-scratch/verification/debug_screenshot.png")

    # 2. Act: Find the input field, enter a query, and submit.
    input_field = page.get_by_placeholder("Ask a question...")
    expect(input_field).to_be_visible()
    input_field.fill("where is the Eiffel Tower?")

    # Click the submit button
    submit_button = page.locator('button[type="submit"]')
    expect(submit_button).to_be_enabled()
    submit_button.click()

    # 3. Assert: Wait for the location response to be handled and rendered.
    # We expect a section with the title "Location Information" to appear,
    # which is rendered by the LocationResponseHandler.
    # We also check for the map container to be present.
    location_section = page.locator("section:has-text('Location Information')")
    expect(location_section).to_be_visible(timeout=60000)

    map_container = page.locator(".mapboxgl-map")
    expect(map_container).to_be_visible()

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/verification.png")