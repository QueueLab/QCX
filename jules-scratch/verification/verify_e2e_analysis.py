import re
from playwright.sync_api import sync_playwright, expect, Page

def verify_resolution_search_e2e(page: Page):
    """
    Performs a full end-to-end test of the Resolution Search feature.
    - Waits for the main loading overlay to disappear.
    - Forcefully enables the analysis button.
    - Clicks the button to trigger the backend action.
    - Waits for the analysis results to be displayed.
    - Takes a screenshot to confirm success.
    """
    # Listen for all console events and print them to the terminal for debugging.
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type} - {msg.text}"))

    # 1. Navigate to the app.
    print("Navigating to http://localhost:3000...")
    page.goto("http://localhost:3000", timeout=60000)

    # 2. Wait for the main loading overlay to disappear.
    # This is a critical step to ensure the UI is interactive.
    print("Waiting for loading overlay to disappear...")
    loading_overlay = page.locator('div[class*="z-[9999]"]')
    expect(loading_overlay).to_be_hidden(timeout=60000)
    print("Loading overlay is hidden.")

    # 3. Wait for the button to be present, then forcefully enable it.
    print("Waiting for the analysis button to be present...")
    search_button_locator = page.get_by_title("Analyze current map view")
    expect(search_button_locator).to_be_visible(timeout=10000)
    print("Button is visible. Forcefully enabling it...")
    search_button_locator.evaluate("button => button.disabled = false")
    expect(search_button_locator).to_be_enabled()
    print("Button is now enabled.")

    # 4. Click the button to trigger the analysis.
    print("Clicking the analysis button...")
    search_button_locator.click()

    # 5. Wait for the analysis results to appear in the chat.
    print("Waiting for analysis results to appear...")
    analysis_title = page.get_by_role("heading", name="Map Analysis")
    expect(analysis_title).to_be_visible(timeout=120000) # Long timeout for AI
    print("Analysis results are visible.")

    # 6. Take a screenshot for visual confirmation.
    print("Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot saved to jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_resolution_search_e2e(page)
            print("\n✅ Verification successful!")
        except Exception as e:
            print(f"\n❌ An error occurred during verification: {e}")
            page.screenshot(path="jules-scratch/verification/error_screenshot.png")
            print("Error screenshot saved to jules-scratch/verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    main()