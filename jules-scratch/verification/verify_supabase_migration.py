import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000/")

        # Wait for the main chat panel to be ready by waiting for the input field
        explore_input = page.get_by_placeholder("Explore")
        expect(explore_input).to_be_visible(timeout=60000)

        # 1. Send a message by filling the input and pressing Enter
        explore_input.fill("Hello, Supabase!")
        explore_input.press("Enter")
        expect(page.get_by_text("Hello, Supabase!")).to_be_visible()

        # 2. Set and verify a system prompt
        page.get_by_role("button", name="Settings").click()
        page.get_by_label("System Prompt").click()
        page.get_by_label("System Prompt").fill("You are a helpful assistant.")
        page.get_by_role("button", name="Save").click()
        expect(page.get_by_text("System prompt saved successfully")).to_be_visible()

        # 3. Draw on the map
        page.get_by_label("Map").press("Control+l") # Long press to activate drawing

        # Click multiple points to draw a polygon
        page.mouse.click(400, 300)
        page.mouse.click(500, 300)
        page.mouse.click(500, 400)
        page.mouse.click(400, 400)
        page.mouse.click(400, 300) # Close the polygon

        # Wait for a moment to ensure the action is processed
        page.wait_for_timeout(5000)

        # 4. Take a screenshot
        page.screenshot(path="jules-scratch/verification/supabase_migration_verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)