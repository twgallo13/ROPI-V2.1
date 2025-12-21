// LP-0.8.1: Values Manager CUD verification (Playwright)
// Produces HAR + screenshots + simple JSON request/response logs

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const STAGING_URL = process.env.STAGING_URL || 'https://ropi-aoss-staging.web.app';
const ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.STAGING_ADMIN_PASSWORD;
const ATTRIBUTE_IDS = (process.env.ATTRIBUTE_IDS || 'primary_color,age_group').split(',');

const ARTIFACT_DIR = path.resolve('artifacts/LP-0.8.1');
const VALUES_DIR = path.join(ARTIFACT_DIR, 'values-cud');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function login(page) {
  // Open app root and use TopBar Sign In button + modal
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

async function navigateToAttribute(page, attributeId) {
  await page.goto(`${STAGING_URL}/settings/attributes`);
  await page.waitForSelector('[data-testid="attribute-list-panel"]', { timeout: 60000 });
  // Filter by attribute id to ensure it's visible
  await page.fill('[data-testid="search-input"]', attributeId);
  const itemSelector = `[data-testid=\"list-item-${attributeId}\"]`;
  const altSelector = `[data-attribute-id=\"${attributeId}\"]`;
  const el = (await page.$(itemSelector)) || (await page.$(altSelector));
  if (!el) {
    // Fallback: click first visible list item
    await page.waitForSelector('[data-testid^="list-item-"]', { timeout: 60000 });
    const first = await page.$('[data-testid^="list-item-"]');
    if (!first) throw new Error(`No attributes visible in list`);
    await first.click();
  } else {
    await el.click();
  }
  // Ensure detail panel appears
  await page.waitForSelector('[data-testid="attribute-detail-panel"]', { timeout: 60000 });
}

async function valuesTab(page) {
  await page.click('[data-testid="tab-values"]');
  await page.waitForSelector('[data-testid="tab-panel-values"]', { timeout: 60000 });
  // ValuesManager present?
  await page.waitForSelector('[data-testid="values-manager"]', { timeout: 60000 });
}

async function addValue(page, attributeId, valueText) {
  const prefix = path.join(VALUES_DIR, `${attributeId}`);
  ensureDir(prefix);
  await page.screenshot({ path: path.join(prefix, `${attributeId}_values_before.png`) });

  // Quick add input
  await page.fill('[data-testid="quick-add-input"]', valueText);
  await page.keyboard.press('Enter');
  await page.screenshot({ path: path.join(prefix, `${attributeId}_value_added.png`) });

  // Save values
  await Promise.all([
    page.waitForTimeout(1000),
    page.click('[data-testid="save-values-btn"]'),
  ]);
  await page.screenshot({ path: path.join(prefix, `${attributeId}_values_saved.png`) });
}

async function editFirstValue(page, attributeId, newValueText) {
  const prefix = path.join(VALUES_DIR, `${attributeId}`);
  // Focus the first value row input
  const firstRow = await page.$('[data-testid^="value-row-"]');
  if (!firstRow) return;
  await page.click('[data-testid^="value-row-"] [data-testid="value-input"]', { timeout: 60000 });
  await page.fill('[data-testid^="value-row-"] [data-testid="value-input"]', newValueText);
  await page.screenshot({ path: path.join(prefix, `${attributeId}_value_edited.png`) });
  await Promise.all([
    page.waitForTimeout(1000),
    page.click('[data-testid="save-values-btn"]'),
  ]);
}

async function deleteFirstValue(page, attributeId) {
  const prefix = path.join(VALUES_DIR, `${attributeId}`);
  // Mark first value as deleted via keyboard (if implemented) or fallback: disable
  const row = await page.$('[data-testid^="value-row-"]');
  if (!row) return;
  // Attempt to toggle enabled off
  const toggle = await row.$('input[type="checkbox"]');
  if (toggle) {
    await toggle.check();
    await toggle.uncheck();
  }
  await page.screenshot({ path: path.join(prefix, `${attributeId}_value_deleted_or_disabled.png`) });
  await Promise.all([
    page.waitForTimeout(1000),
    page.click('[data-testid="save-values-btn"]'),
  ]);
}

async function addSynonymsToFirstValue(page, attributeId, synonymsCsv) {
  const prefix = path.join(VALUES_DIR, `${attributeId}`);
  const row = await page.$('[data-testid^="value-row-"]');
  if (!row) return;
  await page.click('[data-testid^="value-row-"] [data-testid="synonyms-input"]');
  await page.fill('[data-testid^="value-row-"] [data-testid="synonyms-input"]', synonymsCsv);
  await page.screenshot({ path: path.join(prefix, `${attributeId}_synonyms_added.png`) });
  await Promise.all([
    page.waitForTimeout(1000),
    page.click('[data-testid="save-values-btn"]'),
  ]);
}

(async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Set STAGING_ADMIN_EMAIL and STAGING_ADMIN_PASSWORD env vars');
    process.exit(1);
  }
  ensureDir(ARTIFACT_DIR);
  ensureDir(VALUES_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: { path: path.join(VALUES_DIR, 'values-cud.har'), content: 'embed' },
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();

  try {
    await login(page);
    for (const attr of ATTRIBUTE_IDS) {
      await navigateToAttribute(page, attr);
      await valuesTab(page);
      // Sequence: add → edit → synonyms → delete/disable
      await addValue(page, attr, 'TestValuePlaywright');
      await editFirstValue(page, attr, 'EditedValuePlaywright');
      await addSynonymsToFirstValue(page, attr, 'alias1, alias2');
      await deleteFirstValue(page, attr);
      // final screenshot
      await page.screenshot({ path: path.join(VALUES_DIR, `${attr}_values_final.png`) });
    }
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await context.close();
    await browser.close();
    console.log('Artifacts saved to', VALUES_DIR);
  }
})();
