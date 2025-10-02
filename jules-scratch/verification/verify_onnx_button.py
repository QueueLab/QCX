from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Listen for and print console messages from the browser
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type}: {msg.text}"))

        try:
            # Navigate to the application
            page.goto("http://localhost:3000")

            # Wait for the loading overlay to disappear before proceeding.
            # The selector targets the div with a high z-index that was blocking clicks.
            loading_overlay = page.locator('div[class*="z-[9999]"]')
            expect(loading_overlay).to_be_hidden(timeout=60000)

            # Wait for the chat input to be visible
            chat_input = page.locator('textarea[placeholder="Explore"]')
            expect(chat_input).to_be_visible(timeout=30000)

            # Type a message into the chat input
            chat_input.fill("What is the capital of France?")

            # Locate the ONNX button and click it
            onnx_button = page.locator('button[title="Send to ONNX Model"]')
            expect(onnx_button).to_be_visible()
            onnx_button.click()

            # Wait for the ONNX response to appear
            onnx_response = page.locator("text=ONNX Model Response:")
            expect(onnx_response).to_be_visible(timeout=10000)

            # Take a screenshot of the chat with the ONNX response
            page.screenshot(path="jules-scratch/verification/verification.png")

            print("Verification script completed successfully.")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()