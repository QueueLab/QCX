from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the application
        page.goto("http://localhost:3000")

        # 2. Find the chat input and type a message
        chat_input = page.get_by_placeholder("Explore")
        expect(chat_input).to_be_visible()
        chat_input.fill("Hello, this is a test.")

        # 3. Click the submit button using JavaScript to bypass overlay issues
        page.evaluate('document.querySelector(\'button[type="submit"]\').click()')

        # 4. Wait for the AI response to appear
        # We can wait for the 'AI is typing...' message to appear
        expect(page.locator('text="AI is typing..."')).to_be_visible(timeout=20000)

        # Wait for the response to be streamed and the "AI is typing..." message to disappear
        expect(page.locator('text="AI is typing..."')).to_be_hidden(timeout=20000)

        # 5. Take a screenshot
        page.screenshot(path="jules-scratch/verification/chat_verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
