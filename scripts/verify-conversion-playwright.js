// LP-0.8.1: Attribute conversion flow verification (Playwright)
// Converts a textual attribute to enumerated allowed_values and captures artifacts

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STAGING_URL = process.env.STAGING_URL || 'https://ropi-aoss-staging.web.app';
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.STAGING_ADMIN_PASSWORD;
const TARGET_ATTRIBUTE = process.env.TARGET_ATTRIBUTE || 'primary_color';

const ARTIFACT_DIR = path.resolve('artifacts/LP-0.8.1');
const CONVERSION_DIR = path.join(ARTIFACT_DIR, 'conversion-flow');

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

async function openAttribute(page, attributeId) {
  await page.goto(`${STAGING_URL}/settings/attributes`);
  await page.waitForSelector('[data-testid="attribute-list-panel"]', { timeout: 60000 });
  await page.fill('[data-testid="search-input"]', attributeId);
  const itemSelector = `[data-testid=\"list-item-${attributeId}\"]`;
  const altSelector = `[data-attribute-id=\"${attributeId}\"]`;
  const el = (await page.$(itemSelector)) || (await page.$(altSelector));
  if (!el) {
    await page.waitForSelector('[data-testid^="list-item-"]', { timeout: 60000 });
    const first = await page.$('[data-testid^="list-item-"]');
    if (!first) throw new Error(`No attributes visible in list`);
    await first.click();
  } else {
    await el.click();
  }
  await page.waitForSelector('[data-testid="attribute-detail-panel"]', { timeout: 60000 });
}

async function convertToEnumerated(page, attributeId) {
  // Set data type to enum via Overview tab
  await page.click('[data-testid="tab-overview"]');
  await page.waitForSelector('[data-testid="tab-panel-overview"]', { timeout: 60000 });
  await page.selectOption('[data-testid="form-data-type"]', 'enum');

  // Switch to Values tab to populate allowed values
  await page.click('[data-testid="tab-values"]');
  await page.waitForSelector('[data-testid="values-manager"]', { timeout: 60000 });

  // Add some values
  for (const val of ['Red', 'Blue', 'Green']) {
    await page.fill('[data-testid="quick-add-input"]', val);
    await page.keyboard.press('Enter');
  }

  // Save values within ValuesManager
  await page.click('[data-testid="save-values-btn"]');
}

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Set STAGING_ADMIN_EMAIL and STAGING_ADMIN_PASSWORD env vars');
    process.exit(1);
  }
  ensureDir(ARTIFACT_DIR);
  ensureDir(CONVERSION_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: path.join(CONVERSION_DIR, 'conversion.har'), content: 'embed' },
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  try {
    await login(page);
    await openAttribute(page, TARGET_ATTRIBUTE);
    await page.screenshot({ path: path.join(CONVERSION_DIR, `${TARGET_ATTRIBUTE}_before.png`) });
    await convertToEnumerated(page, TARGET_ATTRIBUTE);
    await page.screenshot({ path: path.join(CONVERSION_DIR, `${TARGET_ATTRIBUTE}_after.png`) });
  } catch (err) {
    console.error('Conversion verification error:', err);
  } finally {
    await context.close();
    await browser.close();
    console.log('Artifacts saved to', CONVERSION_DIR);
  }
})();
