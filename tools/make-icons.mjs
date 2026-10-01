// Rasterises icons/*.svg into the PNGs referenced by manifest.json.
// PNGs are committed so the app stays a zero-build static site; re-run this
// (node tools/make-icons.mjs) after editing an SVG source.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const TARGETS = [
  { svg: 'icons/icon.svg', png: 'icons/icon-192.png', size: 192 },
  { svg: 'icons/icon.svg', png: 'icons/icon-512.png', size: 512 },
  { svg: 'icons/icon-maskable.svg', png: 'icons/icon-maskable-192.png', size: 192 },
  { svg: 'icons/icon-maskable.svg', png: 'icons/icon-maskable-512.png', size: 512 },
];

// CHROMIUM_PATH lets a sandbox with a pre-installed browser skip the
// Playwright download; normal machines use Playwright's own chromium.
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage();

for (const { svg, png, size } of TARGETS) {
  const markup = await readFile(join(root, svg), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">
       <img src="data:image/svg+xml;base64,${Buffer.from(markup).toString('base64')}"
            style="display:block;width:${size}px;height:${size}px">
     </body>`,
    { waitUntil: 'load' }
  );
  await writeFile(join(root, png), await page.screenshot({ omitBackground: true }));
  console.log(`${png}  ${size}x${size}`);
}

await browser.close();
