import { test, expect } from './fixtures';

test.describe('Calendar functionality @smoke @calendar', () => {
  test('should open and close the calendar', async ({ authenticatedPage: page }) => {
    // Open calendar
    await page.click('[data-testid="calendar-toggle"]');
    const calendar = page.locator('[data-testid="calendar-notepad"]');
    await expect(calendar).toBeVisible();

    // Close calendar
    await page.click('[data-testid="calendar-toggle"]');
    await expect(calendar).not.toBeVisible();
  });

  test('should display current month and year', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    const calendarHeader = page.locator('[data-testid="calendar-header"]');
    await expect(calendarHeader).toContainText(monthYear);
  });

  test('should navigate to previous month', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    const initialMonth = await page.locator('[data-testid="calendar-header"]').innerText();
    
    await page.click('[data-testid="calendar-prev-month"]');
    
    const newMonth = await page.locator('[data-testid="calendar-header"]').innerText();
    expect(newMonth).not.toBe(initialMonth);
  });

  test('should navigate to next month', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    const initialMonth = await page.locator('[data-testid="calendar-header"]').innerText();
    
    await page.click('[data-testid="calendar-next-month"]');
    
    const newMonth = await page.locator('[data-testid="calendar-header"]').innerText();
    expect(newMonth).not.toBe(initialMonth);
  });

  test('should select a date', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    // Click on a specific date (e.g., the 15th of the current month)
    const dateButton = page.locator('[data-testid="calendar-day-15"]').first();
    await dateButton.click();
    
    // Verify the date is selected (should have a selected state/class)
    await expect(dateButton).toHaveClass(/selected|active/);
  });

  test('should add a note to a selected date', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    // Select a date
    await page.click('[data-testid="calendar-day-15"]');
    
    // Add a unique note to avoid conflicts during parallel execution
    const uniqueNote = `Important meeting ${Date.now()}`;
    const noteInput = page.locator('[data-testid="calendar-note-input"]');
    await noteInput.fill(uniqueNote);
    
    await page.click('[data-testid="calendar-save-note"]');
    
    // Verify the note is saved
    const savedNote = page.locator('[data-testid="calendar-note-content"]');
    await expect(savedNote).toContainText(uniqueNote);
  });

  test('should edit an existing note', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    // Select a date and add a note
    await page.click('[data-testid="calendar-day-15"]');
    const originalNote = `Original note ${Date.now()}`;
    await page.fill('[data-testid="calendar-note-input"]', originalNote);
    await page.click('[data-testid="calendar-save-note"]');
    
    // Edit the note
    await page.click('[data-testid="calendar-edit-note"]');
    const updatedNote = `Updated note ${Date.now()}`;
    await page.fill('[data-testid="calendar-note-input"]', updatedNote);
    await page.click('[data-testid="calendar-save-note"]');
    
    // Verify the note is updated
    const updatedNoteElement = page.locator('[data-testid="calendar-note-content"]');
    await expect(updatedNoteElement).toContainText(updatedNote);
    await expect(updatedNoteElement).not.toContainText(originalNote);
  });

  test('should delete a note', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    // Select a date and add a note
    await page.click('[data-testid="calendar-day-15"]');
    await page.fill('[data-testid="calendar-note-input"]', 'Note to delete');
    await page.click('[data-testid="calendar-save-note"]');
    
    // Delete the note
    await page.click('[data-testid="calendar-delete-note"]');
    await page.click('[data-testid="calendar-confirm-delete"]');
    
    // Verify the note is deleted
    const noteContent = page.locator('[data-testid="calendar-note-content"]');
    await expect(noteContent).not.toBeVisible();
  });

  test('should persist notes after closing and reopening calendar', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    // Add a unique note
    await page.click('[data-testid="calendar-day-15"]');
    const persistentNoteText = `Persistent note ${Date.now()}`;
    await page.fill('[data-testid="calendar-note-input"]', persistentNoteText);
    await page.click('[data-testid="calendar-save-note"]');
    
    // Close calendar
    await page.click('[data-testid="calendar-toggle"]');
    
    // Reopen calendar
    await page.click('[data-testid="calendar-toggle"]');
    await page.click('[data-testid="calendar-day-15"]');
    
    // Verify the note is still there
    const persistedNote = page.locator('[data-testid="calendar-note-content"]');
    await expect(persistedNote).toContainText(persistentNoteText);
  });

  test('should highlight dates with notes', async ({ authenticatedPage: page }) => {
    await page.click('[data-testid="calendar-toggle"]');
    
    // Add a note to a date
    await page.click('[data-testid="calendar-day-15"]');
    await page.fill('[data-testid="calendar-note-input"]', 'Highlight test note');
    await page.click('[data-testid="calendar-save-note"]');
    
    // Close the note panel
    await page.click('[data-testid="calendar-close-note"]');
    
    // Verify the date has a visual indicator
    const dateWithNote = page.locator('[data-testid="calendar-day-15"]');
    await expect(dateWithNote).toHaveClass(/has-note|noted/);
  });

});
