from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    # Increase timeout to 60s
    page.goto("http://localhost:3000/", timeout=60000)

    # Wait for the main loading overlay to disappear
    page.wait_for_selector('div[class*="z-[9999]"]', state='hidden', timeout=60000)

    # Click the button to reveal the chat panel
    open_chat_button = page.locator('button[aria-label="Open chat"]')
    open_chat_button.wait_for(state='visible', timeout=30000)
    open_chat_button.click()

    # Wait for the Share button to be visible and click it
    share_button = page.locator('button:has-text("Share")')
    share_button.wait_for(state='visible', timeout=30000)
    share_button.click()

    # Wait for the dialog to appear before taking a screenshot
    page.wait_for_selector('div[role="dialog"]', state='visible', timeout=10000)

    # Take a screenshot of the share dialog
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
