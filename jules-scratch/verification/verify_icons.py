from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    context = browser.new_context(
        viewport={'width': 768, 'height': 1024}
    )
    page = context.new_page()
    page.goto('http://localhost:3000')
    page.wait_for_selector('.mobile-icons-bar')
    page.screenshot(path='jules-scratch/verification/verification.png')
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
