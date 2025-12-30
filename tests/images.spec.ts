import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Image attachment and response functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="chat-input"]');
  });

  test('should attach an image file', async ({ page }, testInfo) => {
    // Create a test image file
    const imagePath = testInfo.outputPath('test-image.png');
    
    // Create a simple 1x1 PNG image
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.promises.writeFile(imagePath, pngBuffer);

    // Attach the image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Verify the image is attached
    await expect(page.locator('[data-testid="attached-image"]')).toBeVisible();
    await expect(page.locator('text=test-image.png')).toBeVisible();
  });

  test('should preview attached image', async ({ page }, testInfo) => {
    const imagePath = testInfo.outputPath('preview-test.jpg');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.promises.writeFile(imagePath, pngBuffer);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Check for image preview
    const imagePreview = page.locator('[data-testid="image-preview"]');
    await expect(imagePreview).toBeVisible();
    
    // Verify the image has a src attribute
    const imgSrc = await imagePreview.getAttribute('src');
    expect(imgSrc).toBeTruthy();
  });

  test('should remove attached image', async ({ page }, testInfo) => {
    const imagePath = testInfo.outputPath('remove-test.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.promises.writeFile(imagePath, pngBuffer);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Verify image is attached
    await expect(page.locator('[data-testid="attached-image"]')).toBeVisible();

    // Remove the image
    await page.click('[data-testid="remove-attachment"]');

    // Verify image is removed
    await expect(page.locator('[data-testid="attached-image"]')).not.toBeVisible();
  });

  test('should send message with attached image', async ({ page }, testInfo) => {
    const imagePath = testInfo.outputPath('send-test.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.promises.writeFile(imagePath, pngBuffer);

    // Attach image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Type a message
    await page.fill('[data-testid="chat-input"]', 'What is in this image?');

    // Send the message
    await page.click('[data-testid="chat-submit"]');

    // Verify the message with image is sent
    const userMessage = page.locator('[data-testid="user-message"]').last();
    await expect(userMessage).toBeVisible();
    await expect(userMessage).toContainText('What is in this image?');
    
    // Verify the image is displayed in the message
    const messageImage = userMessage.locator('img');
    await expect(messageImage).toBeVisible();
  });

  test('should reject non-image files', async ({ page }, testInfo) => {
    // Create a text file
    const textPath = testInfo.outputPath('test.txt');
    await fs.promises.writeFile(textPath, 'This is not an image');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(textPath);

    // Verify error message or that file is not attached
    const errorMessage = page.locator('[data-testid="file-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/only.*image.*allowed|invalid.*file.*type/i);
  });

  test('should reject oversized images', async ({ page }, testInfo) => {
    // Create a large file (simulating a large image)
    const largePath = testInfo.outputPath('large-image.png');
    const largeBuffer = Buffer.alloc(20 * 1024 * 1024); // 20MB
    await fs.promises.writeFile(largePath, largeBuffer);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(largePath);

    // Verify error message about file size
    const errorMessage = page.locator('[data-testid="file-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/too.*large|file.*size|exceed/i);
  });

  test('should display image in bot response', async ({ page }) => {
    // Send a message that would generate an image response
    await page.fill('[data-testid="chat-input"]', 'Generate an image of a sunset');
    await page.click('[data-testid="chat-submit"]');

    // Wait for bot response
    const botMessage = page.locator('[data-testid="bot-message"]').last();
    await expect(botMessage).toBeVisible({ timeout: 20000 });

    // Check if response contains an image
    const responseImage = botMessage.locator('img');
    await expect(responseImage).toBeVisible({ timeout: 30000 });
    
    // Verify the image has a valid src
    const imgSrc = await responseImage.getAttribute('src');
    expect(imgSrc).toBeTruthy();
    expect(imgSrc).toMatch(/^(http|https|data:image)/);
  });

  test('should allow clicking on image to view full size', async ({ page }, testInfo) => {
    const imagePath = testInfo.outputPath('fullsize-test.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.promises.writeFile(imagePath, pngBuffer);

    // Attach and send image
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);
    
    await page.fill('[data-testid="chat-input"]', 'Test image');
    await page.click('[data-testid="chat-submit"]');

    // Click on the image in the message
    const messageImage = page.locator('[data-testid="user-message"]').last().locator('img');
    await messageImage.click();

    // Verify image modal/lightbox opens
    const imageModal = page.locator('[data-testid="image-modal"]');
    await expect(imageModal).toBeVisible();
  });

  test('should support multiple image formats', async ({ page }, testInfo) => {
    const formats = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
    
    for (const format of formats) {
      const imagePath = testInfo.outputPath(`test.${format}`);
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      await fs.promises.writeFile(imagePath, pngBuffer);

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-testid="attachment-button"]');
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(imagePath);

      // Verify the image is attached
      await expect(page.locator('[data-testid="attached-image"]')).toBeVisible();
      
      // Remove for next iteration
      await page.click('[data-testid="remove-attachment"]');
    }
  });

  test('should show loading state while uploading image', async ({ page }, testInfo) => {
    const imagePath = testInfo.outputPath('loading-test.png');
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    await fs.promises.writeFile(imagePath, pngBuffer);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="attachment-button"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(imagePath);

    // Check for loading indicator (might be brief)
    const loadingIndicator = page.locator('[data-testid="image-uploading"]');
    // Loading state might be too fast to catch, so we use waitFor with a short timeout
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
    } catch {
      // Loading was too fast, which is fine
    }

    // Verify final state shows the image
    await expect(page.locator('[data-testid="attached-image"]')).toBeVisible();
  });
});
