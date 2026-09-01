import os
from playwright.sync_api import sync_playwright

def run_cuj(page):
    print("Navigating to home page...")
    page.goto("http://localhost:3000/")
    page.wait_for_timeout(2000)

    # Click on "Later" button if credit limit modal is blocking the view
    try:
        later_btn = page.locator('button:has-text("Later")')
        if later_btn.is_visible():
            print("Credit limit modal is visible. Clicking 'Later' to dismiss...")
            later_btn.click()
            page.wait_for_timeout(1000)
    except Exception as e:
        print("Later button not found or already dismissed:", e)

    print("Opening the profile menu...")
    # Click on the profile toggle button
    profile_toggle = page.locator('[data-testid="profile-toggle"]')
    profile_toggle.click()
    page.wait_for_timeout(1000)

    print("Clicking 'Settings' option...")
    # Click the Settings menu item
    settings_item = page.locator('[data-testid="profile-settings"]')
    settings_item.click()
    page.wait_for_timeout(1000)

    print("Clicking the Tools tab trigger...")
    # Find and click the Tools tab trigger
    tools_tab = page.locator('button[role="tab"]:has-text("Tools")')
    tools_tab.click()
    page.wait_for_timeout(1000)

    print("Selecting SkyFi planetary tool...")
    # Select SkyFi option
    skyfi_option = page.locator('label[for="SkyFi"]')
    skyfi_option.click()
    page.wait_for_timeout(3000) # wait for status loading indicator to complete check

    print("Taking screenshot...")
    os.makedirs("/app/verification/screenshots", exist_ok=True)
    page.screenshot(path="/app/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)
    print("Verification journey complete!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create context recording video
        os.makedirs("/app/verification/videos", exist_ok=True)
        context = browser.new_context(
            record_video_dir="/app/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print("Error running CUJ:", e)
        finally:
            context.close()
            browser.close()
