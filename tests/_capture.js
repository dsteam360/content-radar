// Screenshot capture helper for v-captures/iteration-1/
// Usage: node tests/_capture.js <filename> [url] [fullpage]
const { chromium } = require('@playwright/test');

(async () => {
  const [,, name, url = 'http://localhost:8080/', fullPage = 'true'] = process.argv;
  if (!name) { console.error('Usage: node tests/_capture.js <name> [url] [fullpage]'); process.exit(1); }

  const outDir = 'v-captures/iteration-1';
  const outPath = `${outDir}/${name}`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: outPath, fullPage: fullPage === 'true' });
  console.log('Saved:', outPath);
  await browser.close();
})();
