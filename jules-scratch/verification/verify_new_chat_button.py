from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application.
        page.goto("http://localhost:3000")

        # 2. Send a message to make the "New" button appear.
        page.get_by_placeholder("Explore").fill("Hello")
        page.get_by_role("button", name="ArrowRight").click()

        # Wait for the "New" button to appear
        new_button = page.locator('button:has-text("New")')
        expect(new_button).to_be_visible()

        # 3. Click the "New" button.
        new_button.click()

        # 4. Verify that the page has reloaded and the chat is empty.
        # After clicking "New", the page should reload and the input should be empty.
        expect(page.get_by_placeholder("Explore")).to_have_value("")

        # Also, the messages should be gone. We can check that the empty screen is visible.
        expect(page.get_by_text("No search history")).to_be_visible()

        # 5. Take a screenshot.
        page.screenshot(path="jules-scratch/verification/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
