import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_context().new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            print("Navigating to http://localhost:3000...")
            await page.goto("http://localhost:3000", wait_until="networkidle", timeout=30000)

            # Wait a bit for potential animations/mounts
            await asyncio.sleep(2)

            # Check for the logo history toggle
            logo = await page.query_selector('[data-testid="logo-history-toggle"]')
            print(f"Logo history toggle present: {logo is not None}")

            # To see the Sprout icon, we might need a message.
            # But the Sprout icon should be in the DOM if we mock the messages or if it's rendered based on an empty state (wait, I set messages.length > 0).
            # I'll try to trigger a message or just check the code again.

            # Let's take a screenshot anyway
            await page.screenshot(path="debug_dom.png")
            print("Screenshot saved to debug_dom.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            await browser.close()

asyncio.run(run())
