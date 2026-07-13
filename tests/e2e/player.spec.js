const { test, expect } = require('@playwright/test');
const { loadSampleWorkouts, startWorkoutByName, advanceSteps, clickThroughToEnd, SAMPLE_CSV_URL } = require('./helpers');

test('an edit link, when configured, also shows as an icon on the player screen', async ({ page }) => {
  await page.goto('/');
  await page.fill('#sheetUrl', SAMPLE_CSV_URL);
  await page.fill('#editUrl', 'https://docs.google.com/spreadsheets/d/myRealSheetId/edit');
  await page.locator('.btn-start').click();
  await startWorkoutByName(page, 'Test · Quick run');
  const editLink = page.locator('a[title="Edit sheet"]');
  await expect(editLink).toBeVisible();
  await expect(editLink).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/myRealSheetId/edit');
});

test.describe('Player · Test · Quick run', () => {
  test.beforeEach(async ({ page }) => {
    await loadSampleWorkouts(page);
    await startWorkoutByName(page, 'Test · Quick run');
  });

  test('starts on the first exercise with set, reps, and weight shown', async ({ page }) => {
    await expect(page.locator('.exname')).toHaveText('Rep Based Exercise');
    await expect(page.locator('.note')).toHaveText('Tap Done to advance');
    const stats = page.locator('.stat b');
    await expect(stats.nth(0)).toHaveText('1/2');
    await expect(stats.nth(1)).toHaveText('5');
    await expect(stats.nth(2)).toHaveText('10 kg');
  });

  test('marking a set done enters the rest phase, and skipping rest moves to the next set', async ({ page }) => {
    await page.locator('.donebtn').click();
    await expect(page.locator('.band.rest')).toBeVisible();
    await expect(page.locator('.exname')).toHaveText('Rep Based Exercise');

    await page.locator('.skiprest').click();
    await expect(page.locator('.band.work')).toBeVisible();
    await expect(page.locator('.stat b').first()).toHaveText('2/2');
  });

  test('going back from a rest phase returns to the work phase of the same set', async ({ page }) => {
    await page.locator('.donebtn').click();
    await expect(page.locator('.band.rest')).toBeVisible();

    await page.getByRole('button', { name: '← Back' }).click();
    await expect(page.locator('.band.work')).toBeVisible();
    await expect(page.locator('.stat b').first()).toHaveText('1/2');
  });

  test('workout overview lists every exercise and highlights the current one', async ({ page }) => {
    const rows = page.locator('.ov-row');
    await expect(rows).toHaveCount(3);
    await expect(page.locator('.ov-row.current .ov-name')).toHaveText('Rep Based Exercise');
    await expect(page.locator('.ov-row.current .ov-meta')).toHaveText('Set 1/2');
    await expect(page.locator('.ov-row.done')).toHaveCount(0);

    // Finish Rep Based Exercise entirely (2 sets) and land on Timed Exercise.
    await advanceSteps(page, 4);
    await expect(page.locator('.ov-row.done')).toHaveCount(1);
    await expect(page.locator('.ov-row.done .ov-name')).toHaveText('Rep Based Exercise');
    await expect(page.locator('.ov-row.current .ov-name')).toHaveText('Timed Exercise');
    await expect(page.locator('.ov-row.current .ov-meta')).toHaveText('Set 1/2');
  });

  test('rest between sets previews the upcoming set\'s reps, not the one just finished', async ({ page }) => {
    // Reach Pyramid Reps (8,6,4 across 3 sets) and finish its first set.
    await advanceSteps(page, 9);
    await expect(page.locator('.band.rest')).toBeVisible();
    await expect(page.locator('.exname')).toHaveText('Pyramid Reps');
    const stats = page.locator('.stat b');
    await expect(stats.nth(0)).toHaveText('2/3');
    await expect(stats.nth(1)).toHaveText('6');
  });

  test('beeps and voice have independent volume sliders defaulting to 100%', async ({ page }) => {
    const beepsSlider = page.locator('#beepsVolIcon + .vol-label + .vol-slider');
    const voiceSlider = page.locator('#voiceVolIcon + .vol-label + .vol-slider');
    await expect(beepsSlider).toHaveValue('100');
    await expect(voiceSlider).toHaveValue('100');
    await expect(page.locator('#beepsVolPct')).toHaveText('100%');
    await expect(page.locator('#voiceVolPct')).toHaveText('100%');

    await beepsSlider.fill('40');
    await expect(page.locator('#beepsVolPct')).toHaveText('40%');
    await expect(page.locator('#beepsVolIcon')).not.toHaveClass(/vol-muted/);
    // Voice is untouched — the two controls are independent.
    await expect(voiceSlider).toHaveValue('100');

    await voiceSlider.fill('0');
    await expect(page.locator('#voiceVolPct')).toHaveText('0%');
    await expect(page.locator('#voiceVolIcon')).toHaveClass(/vol-muted/);
    await expect(beepsSlider).toHaveValue('40');
  });

  test('completing every exercise shows the workout-complete screen', async ({ page }) => {
    await clickThroughToEnd(page);
    await expect(page.locator('.band.done')).toBeVisible();
    await expect(page.locator('.exname')).toContainText('Well done');
    // 2 + 2 + 3 sets across the three exercises in this workout.
    await expect(page.locator('.band.done')).toContainText('7 sets finished');
  });
});

test.describe('Player · Test · Edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await loadSampleWorkouts(page);
    await startWorkoutByName(page, 'Test · Edge cases');
  });

  test('shows "max" reps and a dash for weight when weight is blank', async ({ page }) => {
    await expect(page.locator('.exname')).toHaveText('Max Reps No Weight');
    const stats = page.locator('.stat b');
    await expect(stats.nth(1)).toHaveText('max');
    await expect(stats.nth(2)).toHaveText('—');
  });

  test('a single-set exercise finishes after one Done tap', async ({ page }) => {
    // Max Reps No Weight has 2 sets; finishing both lands on Single Set.
    await advanceSteps(page, 4);
    await expect(page.locator('.exname')).toHaveText('Single Set');
    await expect(page.locator('.stat b').first()).toHaveText('1/1');
    await expect(page.locator('.plate')).toHaveCount(1);

    // Once its only set is done, rest shows the next exercise coming up
    // rather than the one that just finished.
    await page.locator('.donebtn').click();
    await expect(page.locator('.band.rest')).toBeVisible();
    await expect(page.locator('.exname')).toHaveText('Zero Rest Between Sets');
    await expect(page.locator('.stat b').first()).toHaveText('1/3');
  });

  test('zero rest between sets jumps straight into the next set', async ({ page }) => {
    // Finish Max Reps No Weight (2 sets) and Single Set (1 set) to reach it.
    await advanceSteps(page, 6);
    await expect(page.locator('.exname')).toHaveText('Zero Rest Between Sets');
    await expect(page.locator('.stat b').first()).toHaveText('1/3');

    await page.locator('.donebtn').click();
    // RestSet is 0, so it should land directly on the next set's work phase,
    // never showing a rest band.
    await expect(page.locator('.band.work')).toBeVisible();
    await expect(page.locator('.stat b').first()).toHaveText('2/3');
  });

  test('a note with a comma and embedded quotes renders as plain text', async ({ page }) => {
    // Advance through the first three exercises to reach the last one.
    await advanceSteps(page, 10);
    await expect(page.locator('.exname')).toHaveText('Very Long Exercise Name For Layout Checking');
    await expect(page.locator('.note')).toHaveText('Note with, a comma and "quotes"');
  });
});

test.describe('Player · Test · Long session', () => {
  test.beforeEach(async ({ page }) => {
    await loadSampleWorkouts(page);
    await startWorkoutByName(page, 'Test · Long session');
  });

  test('Many Sets shows six plates in the progress row', async ({ page }) => {
    await expect(page.locator('.exname')).toHaveText('Many Sets');
    await expect(page.locator('.plate')).toHaveCount(6);
  });

  test('the workout ends right after the final exercise with no trailing rest', async ({ page }) => {
    await clickThroughToEnd(page);
    await expect(page.locator('.band.done')).toBeVisible();
    // 6 + 2 sets across the two exercises in this workout.
    await expect(page.locator('.band.done')).toContainText('8 sets finished');
  });
});
