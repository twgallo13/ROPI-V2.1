// LP-0.8.1: PDP verification (Playwright)
// Navigates to a product detail page, captures screenshot and product JSON if available

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STAGING_URL = process.env.STAGING_URL || 'https://ropi-aoss-staging.web.app';
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.STAGING_ADMIN_PASSWORD;
const PRODUCT_ID = process.env.PRODUCT_ID || 'example-product-id';

const ARTIFACT_DIR = path.resolve('artifacts/LP-0.8.1');
const PDP_DIR = path.join(ARTIFACT_DIR, 'pdp-verification');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function login(page) {
  await page.goto(`${STAGING_URL}/`);
  await page.waitForSelector('[data-testid="signin-trigger"]', { timeout: 60000 });
  await page.click('[data-testid="signin-trigger"]');
  await page.waitForSelector('[data-testid="signin-modal"]', { timeout: 60000 });
  await page.fill('[data-testid="email-input"]', ADMIN_EMAIL);
  await page.fill('[data-testid="password-input"]', ADMIN_PASSWORD);
  await Promise.all([
    page.click('[data-testid="signin-submit"]'),
    page.waitForSelector('[data-testid="user-menu-trigger"]', { timeout: 60000 })
  ]);
}

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Set STAGING_ADMIN_EMAIL and STAGING_ADMIN_PASSWORD env vars');
    process.exit(1);
  }
  ensureDir(ARTIFACT_DIR);
  ensureDir(PDP_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: path.join(PDP_DIR, 'pdp.har'), content: 'embed' },
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  try {
    await login(page);
    await page.goto(`${STAGING_URL}/products/${PRODUCT_ID}`);
    // Wait for product editor root (class-based selector)
    const editorSelector = '.product-editor';
    const loaded = await page.waitForSelector(editorSelector, { timeout: 60000 }).catch(() => null);
    if (!loaded) {
      // Fallback: open products list and click first product card
      await page.goto(`${STAGING_URL}/products`);
      await page.waitForSelector('.product-card', { timeout: 60000 });
      await page.click('.product-card');
      await page.waitForSelector(editorSelector, { timeout: 60000 });
    }
    await page.screenshot({ path: path.join(PDP_DIR, `${PRODUCT_ID || 'first'}_pdp.png`) });

    // Attempt to read product JSON via a debug hook or API
    const productJson = await page.evaluate(() => {
      try {
        const el = document.querySelector('[data-testid="pdp-json"]');
        return el ? el.textContent : null;
      } catch (e) {
        return null;
      }
    });
    if (productJson) {
      fs.writeFileSync(path.join(PDP_DIR, `${PRODUCT_ID}.json`), productJson, 'utf8');
    }
  } catch (err) {
    console.error('PDP verification error:', err);
  } finally {
    await context.close();
    await browser.close();
    console.log('Artifacts saved to', PDP_DIR);
  }
})();
