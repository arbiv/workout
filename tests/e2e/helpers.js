const { expect } = require('@playwright/test');

const SAMPLE_CSV_URL = '/testdata/workout-sample.csv';

async function loadSampleWorkouts(page) {
  await page.goto('/');
  await page.fill('#sheetUrl', SAMPLE_CSV_URL);
  await page.locator('.btn-start').click();
  await expect(page.locator('.card').first()).toBeVisible();
}

async function startWorkoutByName(page, name) {
  await page.locator('.card', { hasText: name }).locator('.btn-start').click();
  await expect(page.locator('.band')).toBeVisible();
}

// Taps whichever advance button is currently showing (Done for a work set,
// Skip rest for a rest phase), `count` times in a row.
async function advanceSteps(page, count) {
  for (let i = 0; i < count; i++) {
    const doneBtn = page.locator('.donebtn');
    const skipBtn = page.locator('.skiprest');
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
    } else if (await skipBtn.isVisible()) {
      await skipBtn.click();
    } else {
      throw new Error('Neither Done nor Skip rest button is visible.');
    }
  }
}

// Repeatedly taps whichever advance button is showing until the
// workout-complete band appears.
async function clickThroughToEnd(page, maxSteps = 60) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.locator('.band.done').isVisible()) return;
    await advanceSteps(page, 1);
  }
  throw new Error(`Workout did not complete within ${maxSteps} steps.`);
}

module.exports = { SAMPLE_CSV_URL, loadSampleWorkouts, startWorkoutByName, advanceSteps, clickThroughToEnd };
