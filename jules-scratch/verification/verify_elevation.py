import re
from playwright.sync_api import Playwright, sync_playwright, expect

def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.goto("http://localhost:3000/")

    # Wait for the loading overlay to disappear
    loading_overlay = page.locator('div[class*="z-[9999]"]')
    expect(loading_overlay).to_be_hidden(timeout=60000)

    # Use the correct placeholder text: "Explore"
    input_field = page.get_by_placeholder("Explore")
    expect(input_field).to_be_visible(timeout=30000)
    expect(input_field).to_be_enabled(timeout=30000)

    input_field.click()
    input_field.fill("what is the elevation of mount everest at latitude 27.9881 and longitude 86.9250?")
    page.get_by_role("button", name="Send message").click()
    expect(page.get_by_text("Elevation Information (Mapbox)")).to_be_visible(timeout=90000)
    page.screenshot(path="jules-scratch/verification/elevation-display.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
