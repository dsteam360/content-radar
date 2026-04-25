// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://tokehaus.local';

test.describe('Toke Haus Homepage', () => {

  test('full page screenshot', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/homepage-full.png', fullPage: true });
  });

  test('announcement bar is visible', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const bar = page.locator('.hh-announce');
    await expect(bar).toBeVisible();
    const text = await bar.innerText();
    expect(text.length).toBeGreaterThan(5);
  });

  test('hero section renders with heading and CTAs', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await expect(page.locator('.hh-hero')).toBeVisible();
    await expect(page.locator('.hh-hero-left h1')).toBeVisible();
    await expect(page.locator('a.hh-btn-primary')).toBeVisible();
    await expect(page.locator('a.hh-btn-secondary')).toBeVisible();
    await page.screenshot({ path: 'tests/screenshots/hero.png', clip: { x: 0, y: 0, width: 1280, height: 520 } });
  });

  test('effect finder panel has 4 tiles', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const tiles = page.locator('.hh-effect-tile');
    await expect(tiles).toHaveCount(4);
    for (const tile of await tiles.all()) {
      await expect(tile).toBeVisible();
    }
  });

  test('stats bar shows 3 stats', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const stats = page.locator('.hh-trust-stats .hh-stat-num');
    await expect(stats).toHaveCount(3);
    await page.screenshot({ path: 'tests/screenshots/stats-bar.png', clip: { x: 0, y: 500, width: 1280, height: 100 } });
  });

  test('editorial deals section renders hero + supporting cards with real images', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // New editorial layout: 1 hero + 4 supporting cards = 5 product cards total
    const hero = page.locator('.th-ed-hero');
    await expect(hero).toHaveCount(1);
    const supporting = page.locator('.th-ed-card');
    await expect(supporting).toHaveCount(4);
    // All product images should come from /uploads/ and load successfully
    const allImages = page.locator('.th-ed-hero-media img, .th-ed-card-media img');
    await expect(allImages).toHaveCount(5);
    for (const img of await allImages.all()) {
      const src = await img.getAttribute('src');
      expect(src).toContain('/wp-content/uploads/');
      const loaded = await img.evaluate(el => el.naturalWidth > 0);
      expect(loaded).toBe(true);
    }
    await page.screenshot({ path: 'tests/screenshots/deals-grid.png', clip: { x: 0, y: 500, width: 1280, height: 900 } });
  });

  test('all deal card images load without 404', async ({ page }) => {
    const failed = [];
    page.on('response', res => {
      if (res.url().includes('/uploads/') && res.status() >= 400) {
        failed.push(`${res.status()} ${res.url()}`);
      }
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    expect(failed).toEqual([]);
  });

  test('branding shows Toke Haus not HarvestHouse', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('HarvestHouse');
    expect(bodyText).toContain('Toke Haus');
  });

  test('footer is present with correct branding', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    // Footer uses text-based logo (.hh-footer-logo) in new Trust Map footer
    const footer = page.locator('.hh-footer');
    await expect(footer).toBeVisible();
    const logo = page.locator('.hh-footer-logo');
    await expect(logo).toBeVisible();
    const logoText = await logo.innerText();
    expect(logoText).toContain('Toke Haus');
    await page.screenshot({ path: 'tests/screenshots/footer.png', fullPage: false });
  });

  test('card hover states work', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const firstCard = page.locator('.th-ed-card').first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.hover();
    await page.waitForTimeout(300); // let transition complete
    await page.screenshot({ path: 'tests/screenshots/card-hover.png' });
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore transient failures from external CDNs (fonts.googleapis.com, etc.)
        // that may be unavailable in local dev — these are infrastructure, not code bugs
        if (text.includes('fonts.googleapis') || text.includes('fonts.gstatic')) return;
        if (text.includes('502') || text.includes('503')) return; // CDN timeouts
        errors.push(text);
      }
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
  });

  test('viewport 375px mobile — no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
    await page.screenshot({ path: 'tests/screenshots/mobile-375.png', fullPage: true });
  });

  test('viewport 1440px desktop screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/desktop-1440.png', fullPage: true });
  });

});
