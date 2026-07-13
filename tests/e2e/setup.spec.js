const { test, expect } = require('@playwright/test');
const { loadSampleWorkouts, SAMPLE_CSV_URL } = require('./helpers');

test.describe('Setup', () => {
  test('shows the connect-your-sheet screen with instructions', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.display')).toContainText('Workout Player');
    await expect(page.locator('#sheetUrl')).toBeVisible();
    await expect(page.locator('.help li')).toHaveCount(3);
  });

  test('shows an error when the pasted url returns a web page instead of CSV', async ({ page }) => {
    await page.goto('/');
    await page.fill('#sheetUrl', '/index.html');
    await page.locator('.btn-start').click();
    await expect(page.locator('.err')).toContainText("Couldn't load the sheet");
    await expect(page.locator('.err')).toContainText('web page instead of CSV');
  });

  test('loads the sample program and lists one card per workout', async ({ page }) => {
    await loadSampleWorkouts(page);
    await expect(page.locator('.card')).toHaveCount(3);
    await expect(page.locator('.card-title')).toHaveText([
      'Test · Quick run',
      'Test · Edge cases',
      'Test · Long session',
    ]);
    await expect(page.locator('.card', { hasText: 'Test · Quick run' }).locator('.card-sub'))
      .toContainText('3 exercises');
    await expect(page.locator('.card', { hasText: 'Test · Edge cases' }).locator('.card-sub'))
      .toContainText('4 exercises');
    await expect(page.locator('.card', { hasText: 'Test · Long session' }).locator('.card-sub'))
      .toContainText('2 exercises');
  });

  test('loads the sheet straight from a ?csv= query parameter', async ({ page }) => {
    await page.goto('/?csv=' + encodeURIComponent(SAMPLE_CSV_URL));
    await expect(page.locator('.card')).toHaveCount(3);
    await expect(page.locator('#sheetUrl')).not.toBeVisible();
  });

  test('a manually pasted edit link shows up as an Edit sheet link on the home screen', async ({ page }) => {
    await page.goto('/');
    await page.fill('#sheetUrl', SAMPLE_CSV_URL);
    await page.fill('#editUrl', 'https://docs.google.com/spreadsheets/d/myRealSheetId/edit');
    await page.locator('.btn-start').click();
    await expect(page.locator('.card')).toHaveCount(3);
    const editLink = page.locator('a', { hasText: 'Edit sheet' });
    await expect(editLink).toBeVisible();
    await expect(editLink).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/myRealSheetId/edit');
  });

  test('with no manual edit link and no derivable sheet id, no Edit sheet link shows', async ({ page }) => {
    await loadSampleWorkouts(page);
    await expect(page.locator('a', { hasText: 'Edit sheet' })).toHaveCount(0);
  });
});
