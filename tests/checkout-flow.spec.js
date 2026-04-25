// @ts-check
/**
 * Toke Haus — Checkout Flow
 *
 * Covers the critical purchase path:
 *   Homepage → Shop → Product page → Add to Cart → Cart → Checkout
 *
 * Selector strategy (in priority order):
 *   1. getByRole / getByText / getByLabel  — semantically stable, survives CSS refactors
 *   2. WooCommerce data attributes          — e.g. [data-product_id]
 *   3. WooCommerce structural classes       — e.g. .products, .cart_item  (stable, theme-agnostic)
 *   4. Tip: add data-testid="add-to-cart"  to key elements for zero-fragility tests
 *
 * Run:  npx playwright test tests/checkout-flow.spec.js
 * Run headed: npx playwright test tests/checkout-flow.spec.js --headed
 */

const { test, expect } = require('@playwright/test');

const BASE         = 'http://tokehaus.local';
const SHOP_URL     = `${BASE}/shop/`;

// Simple product — confirmed purchasable via GET add-to-cart
// Update PRODUCT_ID if the product is removed (re-query: SELECT ID FROM w_posts WHERE post_name='1-oz-sampler')
const PRODUCT_ID   = 11066;
const PRODUCT_SLUG = '1-oz-sampler';
const PRODUCT_NAME = /1 oz sampler/i;
const PRODUCT_URL  = `${BASE}/product/${PRODUCT_SLUG}/`;

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Seed the cart with one unit of PRODUCT_ID using WooCommerce's GET endpoint.
 * Works for simple products. The add-to-cart URL is generated from the shop
 * page so WooCommerce nonces are satisfied.
 *
 * @param {import('@playwright/test').Page} page
 */
async function seedCart(page) {
  // Navigate from the shop page — WooCommerce validates the referer for add-to-cart
  await page.goto(SHOP_URL, { waitUntil: 'domcontentloaded' });
  await page.goto(`${BASE}/shop/?add-to-cart=${PRODUCT_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  // Verify cart was seeded
  const cookie = await page.context().cookies();
  const inCart = cookie.some(c => c.name === 'woocommerce_items_in_cart' && c.value === '1');
  if (!inCart) {
    // Fallback: navigate to product page and click Add to Cart
    await addToCartViaButton(page);
  }
}

/**
 * Add product to cart by clicking the Add to Cart button on the product page.
 * @param {import('@playwright/test').Page} page
 */
async function addToCartViaButton(page) {
  await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });
  const btn = page.getByRole('button', { name: 'Add to cart', exact: true });
  await btn.click();
  // Wait for WooCommerce AJAX to complete — button changes state or message appears
  await page.waitForSelector(
    'a.added_to_cart, .woocommerce-message, button.added',
    { timeout: 10000 }
  ).catch(() => {});
  await page.waitForLoadState('networkidle');
}

// ─── suite ──────────────────────────────────────────────────────────────────

test.describe('Checkout flow', () => {

  /**
   * The proxy rewrites Location headers but NOT href attributes inside HTML.
   * WooCommerce generates absolute URLs (http://tokehaus.local/...) for links
   * like "Proceed to checkout". This interceptor transparently rewrites any
   * navigation to tokehaus.local back through the proxy so tests stay on
   * localhost:8080 and cookies remain valid.
   */
  test.beforeEach(async ({ page }) => {
    await page.route('http://tokehaus.local/**', (route) => {
      const rewritten = route.request().url().replace('http://tokehaus.local', BASE);
      route.continue({ url: rewritten });
    });
  });

  // ── 1. Navigation ──────────────────────────────────────────────────────────

  test('homepage loads and Shop link is present in nav', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Toke Haus/i);

    // Role-based: finds <a> whose accessible name is "Shop" in the nav
    const shopLink = page.getByRole('navigation').getByRole('link', { name: /^shop$/i }).first();
    await expect(shopLink).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/checkout-01-homepage.png',
      clip: { x: 0, y: 0, width: 1440, height: 600 },
    });
  });

  // ── 2. Shop page ───────────────────────────────────────────────────────────

  test('navigating to Shop renders product grid', async ({ page }) => {
    await page.goto(SHOP_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/shop\//);

    // WooCommerce always renders products in <ul class="products">
    const grid = page.locator('ul.products');
    await expect(grid).toBeVisible();

    const cards = grid.locator('li.product');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    await page.screenshot({ path: 'tests/screenshots/checkout-02-shop.png', fullPage: false });
  });

  // ── 3. Product page ────────────────────────────────────────────────────────

  test('product page loads with title and Add to Cart button', async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });

    // WooCommerce structural class — stable across themes
    const title = page.locator('h1.product_title');
    await expect(title).toBeVisible();
    await expect(title).toContainText(PRODUCT_NAME);

    // Price should be visible
    await expect(page.locator('.price').first()).toBeVisible();

    // WooCommerce single-product submit button — exact match avoids picking up
    // related-product "Add to cart: ..." buttons elsewhere on the page
    const addToCart = page.getByRole('button', { name: 'Add to cart', exact: true });
    await expect(addToCart).toBeVisible();
    await expect(addToCart).toBeEnabled();

    await page.screenshot({ path: 'tests/screenshots/checkout-03-product.png', fullPage: false });
  });

  // ── 4. Add to cart ─────────────────────────────────────────────────────────

  test('Add to Cart button adds product and shows confirmation', async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: 'domcontentloaded' });

    const addToCart = page.getByRole('button', { name: 'Add to cart', exact: true });
    await addToCart.click();

    // Wait for AJAX to complete — WC shows a message or a "View cart" link
    const confirmation = page.locator('.woocommerce-message, a.added_to_cart').first();
    await expect(confirmation).toBeVisible({ timeout: 10000 });

    // Cart cookie should now be set
    const cookies = await page.context().cookies();
    const itemsInCart = cookies.find(c => c.name === 'woocommerce_items_in_cart');
    expect(itemsInCart?.value).toBe('1');

    await page.screenshot({ path: 'tests/screenshots/checkout-04-added.png', fullPage: false });
  });

  // ── 5. Cart page ───────────────────────────────────────────────────────────

  test('cart page shows the added product', async ({ page }) => {
    await seedCart(page);

    await page.goto(`${BASE}/cart/`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/cart\//);

    // WooCommerce cart form (only rendered when cart has items)
    await expect(page.locator('form.woocommerce-cart-form')).toBeVisible();

    // Product name link in the cart row (.first() avoids the screen-reader quantity label)
    await expect(page.locator('.cart_item').getByRole('link', { name: PRODUCT_NAME }).first()).toBeVisible();

    // Cart totals sidebar
    await expect(page.locator('.cart_totals')).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/checkout-05-cart.png', fullPage: false });
  });

  // ── 6. Proceed to Checkout ─────────────────────────────────────────────────

  test('Proceed to Checkout navigates to /checkout/', async ({ page }) => {
    await seedCart(page);
    await page.goto(`${BASE}/cart/`, { waitUntil: 'domcontentloaded' });

    // WooCommerce "Proceed to checkout" — role-based, survives class renaming
    const proceedBtn = page.getByRole('link', { name: /proceed to checkout/i });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    await page.waitForURL(/\/checkout\//, { timeout: 10000 });
    await expect(page).toHaveURL(/\/checkout\//);

    await page.screenshot({ path: 'tests/screenshots/checkout-06-to-checkout.png', fullPage: false });
  });

  // ── 7. Checkout page integrity ─────────────────────────────────────────────

  test('checkout page renders billing form and focus mode', async ({ page }) => {
    await seedCart(page);
    await page.goto(`${BASE}/checkout/`, { waitUntil: 'domcontentloaded' });

    // Focus mode body class (strips nav, shows lock badge)
    await expect(page.locator('body')).toHaveClass(/th-checkout-mode/);

    // Secure Checkout badge — desktop and mobile both render it;
    // use .first() to avoid strict-mode violation from the duplicate
    await expect(page.locator('.th-secure-text').first()).toContainText(/secure checkout/i);

    // WooCommerce billing form
    await expect(page.locator('#billing_first_name')).toBeVisible();

    // Order review sidebar
    await expect(
      page.locator('#order_review, .woocommerce-checkout-review-order')
    ).toBeVisible();

    // Place Order button (we stop here — no real payment submission)
    await expect(page.getByRole('button', { name: /place order/i })).toBeVisible();

    await page.screenshot({ path: 'tests/screenshots/checkout-07-checkout.png', fullPage: true });
  });

  // ── 8. Mobile checkout ─────────────────────────────────────────────────────

  test('checkout flow works at 375px mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await seedCart(page);
    await page.goto(`${BASE}/cart/`, { waitUntil: 'domcontentloaded' });

    // No horizontal scroll on cart page
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance

    const proceedBtn = page.getByRole('link', { name: /proceed to checkout/i });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    await page.waitForURL(/\/checkout\//, { timeout: 10000 });
    await expect(page.locator('body')).toHaveClass(/th-checkout-mode/);

    await page.screenshot({ path: 'tests/screenshots/checkout-08-mobile.png', fullPage: false });
  });

});
