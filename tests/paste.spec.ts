import { test, expect } from '@playwright/test';

test.describe('Paste to File Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('converts large pasted text to file', async ({ page }) => {
    const chatInput = page.getByTestId('chat-input');

    // Create a large text string (> 500 chars)
    const largeText = 'A'.repeat(501);

    // Simulate paste
    await chatInput.focus();
    await page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const event = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      });
      document.activeElement?.dispatchEvent(event);
    }, largeText);

    // Check if attachment exists
    const attachment = page.getByText('pasted-text.txt');
    await expect(attachment).toBeVisible();

    // Check if input is empty
    await expect(chatInput).toHaveValue('');
  });

  test('does not convert small pasted text', async ({ page }) => {
    const chatInput = page.getByTestId('chat-input');

    const smallText = 'Small snippet';

    // Simulate paste
    await chatInput.focus();
    await page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const event = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      });
      document.activeElement?.dispatchEvent(event);
    }, smallText);

    // Check that attachment does NOT exist
    const attachment = page.getByText('pasted-text.txt');
    await expect(attachment).not.toBeVisible();
  });

  test('shows error when pasting while file already attached', async ({ page }) => {
    const chatInput = page.getByTestId('chat-input');

    const largeText1 = 'A'.repeat(501);
    await chatInput.focus();
    await page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      document.activeElement?.dispatchEvent(event);
    }, largeText1);

    await expect(page.getByText('pasted-text.txt')).toBeVisible();

    const largeText2 = 'B'.repeat(501);
    await page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
      document.activeElement?.dispatchEvent(event);
    }, largeText2);

    await expect(page.getByText('Please remove the current attachment')).toBeVisible();
  });
});
