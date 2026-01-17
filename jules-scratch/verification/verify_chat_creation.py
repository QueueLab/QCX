from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:3000/", timeout=60000)

    # Wait for the main loading overlay to disappear
    page.wait_for_selector('div[class*="z-[9999]"]', state='hidden', timeout=60000)

    # Fill the chat input and submit
    chat_input = page.locator('textarea[placeholder="Explore"]')
    chat_input.wait_for(state='visible', timeout=30000)
    chat_input.fill("Hello, this is a test message.")
    page.locator('button[aria-label="Send message"]').click()

    # Verify that the user's message appears in the chat
    user_message = page.locator('div.user-message:has-text("Hello, this is a test message.")')
    expect(user_message).to_be_visible(timeout=30000)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
