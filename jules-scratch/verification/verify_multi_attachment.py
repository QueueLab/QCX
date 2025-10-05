from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 375, 'height': 812},
            is_mobile=True,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

        page.goto("http://localhost:3000", timeout=60000)

        # Workaround for the persistent loading overlay in the test environment
        overlay_selector = 'div[class*="z-[9999]"]'
        try:
            page.wait_for_selector(overlay_selector, state='visible', timeout=15000)
            page.evaluate(f"document.querySelector('{overlay_selector}').remove()")
        except Exception as e:
            print(f"Could not find or remove overlay, perhaps it's not there: {e}")


        # Wait for the mobile layout to be visible
        mobile_container = page.locator('div.mobile-layout-container')
        expect(mobile_container).to_be_visible(timeout=10000)

        # Directly interact with the file input element to attach multiple files
        file_input = page.locator('input[type="file"]')
        file_input.set_input_files([
            "jules-scratch/verification/test_image_1.png",
            "jules-scratch/verification/test_image_2.png"
        ])

        # Verify that the UserMessage component contains two images
        user_message_container = page.locator('.flex-1.space-y-2').first
        expect(user_message_container).to_be_visible(timeout=10000)

        images_in_message = user_message_container.locator('img')
        expect(images_in_message).to_have_count(2, timeout=10000)

        # After the files are set, the form should auto-submit on mobile.
        # We should wait for the AI response to appear.
        bot_message = page.locator('div[data-message-author="bot"]')
        expect(bot_message).to_be_visible(timeout=30000)

        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()