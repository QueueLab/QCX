from playwright.sync_api import sync_playwright

def run_verify():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000", timeout=30000)
            print("Page loaded successfully.")
            page.screenshot(path="verify_load.png")
            print("Screenshot saved.")
        except Exception as e:
            print(f"Failed to load page: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verify()
