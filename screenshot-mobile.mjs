import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT_DIR = join(ROOT, 'temporary screenshots');

const url = process.argv[2];
const label = process.argv[3];

if (!url) {
  console.error('Usage: node screenshot-mobile.mjs <url> [label]');
  process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

const existing = await readdir(OUT_DIR).catch(() => []);
let max = 0;
for (const f of existing) {
  const m = f.match(/^screenshot-(\d+)(?:-.+)?\.png$/);
  if (m) max = Math.max(max, Number(m[1]));
}
const n = max + 1;
const fileName = label
  ? `screenshot-${n}-${label}.png`
  : `screenshot-${n}.png`;
const outPath = join(OUT_DIR, fileName);

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const total = document.documentElement.scrollHeight;
    const step = 500;
    for (let y = 0; y < total; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 50));
    }
    window.scrollTo(0, total);
    await new Promise(r => setTimeout(r, 200));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 100));
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: outPath, fullPage: true });
  console.log(outPath);
} finally {
  await browser.close();
}
