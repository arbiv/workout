const { test, expect } = require('@playwright/test');
const { loadSampleWorkouts } = require('./helpers');

test.describe('Installable app', () => {
  test('links a manifest that describes a standalone app with installable icons', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBe('manifest.json');

    const manifest = await (await page.request.get('/manifest.json')).json();
    expect(manifest.name).toBe('Workout Player');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');

    // Android needs a 192px and a 512px icon, plus a maskable one so the
    // launcher can apply its own shape without cropping the artwork.
    const sizes = manifest.icons.map(i => `${i.sizes} ${i.purpose}`);
    expect(sizes).toContain('192x192 any');
    expect(sizes).toContain('512x512 any');
    expect(sizes).toContain('512x512 maskable');

    for (const icon of manifest.icons) {
      const res = await page.request.get('/' + icon.src);
      expect(res.status(), `${icon.src} should be served`).toBe(200);
    }
  });

  test('registers a service worker that precaches the app shell', async ({ page }) => {
    await page.goto('/');
    const scriptURL = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return (reg.active || reg.installing).scriptURL;
    });
    expect(scriptURL).toContain('/sw.js');
  });

  test('opens offline and replays the last loaded program', async ({ page, context }) => {
    await loadSampleWorkouts(page);
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);
    await page.reload();

    // Shell came from the cache; the sheet fetch failed, so the app falls
    // back to its stored copy of the program.
    await expect(page.locator('.card-title').first()).toHaveText('Test · Quick run');
    await expect(page.locator('.err')).toContainText('Showing last cached version');

    await context.setOffline(false);
  });
});
