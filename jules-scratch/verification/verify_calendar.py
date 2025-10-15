
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:3000", timeout=60000)

        # Click the calendar icon in the header
        await page.click('button[title="Open Calendar"]')

        # Wait for the calendar to be visible
        await page.wait_for_selector('[data-testid="calendar-notepad"]')

        # Add a note
        await page.fill('textarea[placeholder*="Add note..."]', "This is a test note.")
        await page.press('textarea[placeholder*="Add note..."]', "Enter")

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
