const { test, expect } = require('@playwright/test');
const { loadSampleWorkouts, startWorkoutByName, advanceSteps, clickThroughToEnd } = require('./helpers');

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

  test('toggling beeps and voice flips their on/off state', async ({ page }) => {
    const beeps = page.getByRole('button', { name: /Beeps/ });
    const voice = page.getByRole('button', { name: /Voice/ });
    await expect(beeps).toHaveText('🔔 Beeps on');
    await expect(voice).toHaveText('🗣 Voice on');

    await beeps.click();
    await expect(beeps).toHaveText('🔔 Beeps off');
    await expect(beeps).not.toHaveClass(/on/);

    await voice.click();
    await expect(voice).toHaveText('🗣 Voice off');
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

    await page.locator('.donebtn').click();
    await expect(page.locator('.band.rest')).toBeVisible();
    await expect(page.locator('.exname')).toHaveText('Single Set');
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
