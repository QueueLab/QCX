from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:3000/")

        # 1. Start a conversation
        page.get_by_placeholder("Send a message...").fill("Hello, world!")
        page.get_by_placeholder("Send a message...").press("Enter")

        # 2. Wait for messages to appear
        user_message = page.locator(".flex.items-center.w-full.space-x-1.mt-2.min-h-10", has_text="Hello, world!")
        bot_message = page.locator(".prose-sm.prose-neutral.prose-a\\:text-accent-foreground\\/50")

        expect(user_message).to_be_visible(timeout=30000)
        expect(bot_message).to_be_visible(timeout=30000)

        # 3. Take a screenshot before the swipe
        page.screenshot(path="jules-scratch/verification/before_swipe.png")

        # 4. Simulate a swipe
        user_message_box = user_message.bounding_box()
        if user_message_box:
            start_x = user_message_box['x'] + user_message_box['width'] * 0.8
            start_y = user_message_box['y'] + user_message_box['height'] / 2
            end_x = user_message_box['x'] + user_message_box['width'] * 0.2

            page.mouse.move(start_x, start_y)
            page.mouse.down()
            page.mouse.move(end_x, start_y, steps=5)
            page.mouse.up()

        # 5. Wait for the message to be removed
        expect(user_message).not_to_be_visible(timeout=10000)

        # 6. Take a screenshot after the swipe
        page.screenshot(path="jules-scratch/verification/after_swipe.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
