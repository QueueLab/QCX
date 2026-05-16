from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            print("Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000", timeout=60000)
            time.sleep(5)
            print(f"Current URL: {page.url}")

            page.screenshot(path="initial_load.png")

            # If we are on /auth, we can't really test the history toggle easily without logging in.
            # But we can at least check if the header is there if it's visible on /auth (unlikely).

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
