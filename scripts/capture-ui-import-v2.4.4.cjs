// scripts/capture-ui-import-v2.4.4.js
// Run: node scripts/capture-ui-import-v2.4.4.js
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUT_DIR = 'operations/review-artifacts/attribute-registry';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: true, // headless ok for network capture
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  try {
    const page = await browser.newPage();

    // capture console logs
    const consoleLog = [];
    page.on('console', msg => {
      consoleLog.push({type: msg.type(), text: msg.text()});
    });

    // capture network requests/responses
    const network = [];
    page.on('request', req => {
      network.push({ id: req._requestId || req.url(), type: 'request', url: req.url(), method: req.method(), headers: req.headers() });
    });
    page.on('response', async res => {
      const url = res.url();
      let body = '';
      try { body = await res.text(); } catch(e) { body = '<non-text response>'; }
      network.push({ id: res._requestId || res.url(), type: 'response', url, status: res.status(), headers: res.headers(), body: body.slice(0, 20000) }); // truncate
    });

    // go to import page
    const IMPORT_URL = 'https://ropi-bccee.web.app/import';
    await page.goto(IMPORT_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for Advanced Options or Validation Mode UI to become available
    // Try a few heuristics to find validation control
    await sleep(1000);

    // Expand Advanced Options if present
    const advancedSelectors = [
      'button[aria-label*="Advanced"]',
      'button:contains("Advanced")',
      'button:has-text("Advanced")',
      'button[title*="Advanced"]',
      '.advanced-options-toggle',
    ];
    for (const sel of advancedSelectors) {
      try {
        const el = await page.$(sel);
        if (el) { await el.click(); break; }
      } catch(e){}
    }

    // Try to set Validation Mode to Minimal.
    // Look for a select or radio group with text 'Validation'
    try {
      // Select element case
      const selectHandles = await page.$$('select');
      for (const s of selectHandles) {
        const opts = await s.$$eval('option', os => os.map(o => o.textContent || o.innerText));
        if (opts.join(' ').toLowerCase().includes('minimal') && opts.join(' ').toLowerCase().includes('full')) {
          // choose minimal
          const vals = await s.$$eval('option', os => os.map(o=>o.value));
          let chooseVal = null;
          for (let i=0;i<opts.length;i++){
            if ((opts[i]||'').toLowerCase().includes('minimal')) { chooseVal = vals[i]; break; }
          }
          if (chooseVal) await s.select(chooseVal);
          break;
        }
      }
      // If no select found, try radio buttons
      const labels = await page.$$eval('label', ls => ls.map(l => ({text: l.innerText, for: l.getAttribute('for')})));
      for (const lb of labels) {
        if (lb.text && lb.text.toLowerCase().includes('minimal')) {
          if (lb.for) {
            await page.click(`#${lb.for}`);
            break;
          } else {
            // click label directly
            const labelEls = await page.$$('label');
            for (const lel of labelEls) {
              const ltxt = await page.evaluate(el => el.textContent, lel);
              if (ltxt && ltxt.toLowerCase().includes('minimal')) {
                await lel.click();
                break;
              }
            }
            break;
          }
        }
      }
    } catch(e){/*ignore*/}

    // Wait a short time to let UI apply the selection
    await sleep(1000);

    // Upload file - try to find file input
    const inputHandles = await page.$$('input[type=file]');
    if (!inputHandles.length) {
      // Try common upload buttons that open file dialog
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.toLowerCase().includes('upload') || text.toLowerCase().includes('choose'))) {
          await btn.click();
          await sleep(500);
          break;
        }
      }
    }

    // If file input exists, set file
    if (inputHandles.length) {
      const fileToUpload = path.resolve('test-import.csv');
      await inputHandles[0].uploadFile(fileToUpload);
    } else {
      // Try a drag-drop target selector fallback
      console.log('No file input found; attempting drag-drop fallback');
      const dropTarget = await page.$('div.dropzone, .dropzone, #drop, .upload-area');
      if (dropTarget) {
        const filePath = path.resolve('test-import.csv');
        await dropTarget.uploadFile(filePath); // Puppeteer supports this on input only typically
      }
    }

    // Wait for mapping preview to appear
    await sleep(2000);

    // Click the "Import" / "Start Import" / "Preview" button
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && (text.toLowerCase().includes('import') || text.toLowerCase().includes('preview') || text.toLowerCase().includes('start'))) {
          await btn.click();
          break;
        }
      }
    } catch(e) {
      console.log('Could not find import button:', e.message);
    }

    // Wait for network activity and for the error to appear; timeout 30s
    await sleep(8000);

    // Save artifacts
    fs.writeFileSync(path.join(OUT_DIR,'ui-console-v2.4.4.json'), JSON.stringify(consoleLog, null, 2));
    fs.writeFileSync(path.join(OUT_DIR,'ui-network-v2.4.4.json'), JSON.stringify(network, null, 2));
    console.log('WROTE artifacts to', OUT_DIR);

    // Find any response that contains "MPN is required"
    const mpnResponses = network.filter(n => n.type==='response' && n.body && n.body.includes && n.body.includes('MPN is required'));
    fs.writeFileSync(path.join(OUT_DIR,'ui-import-mpn-responses-v2.4.4.json'), JSON.stringify(mpnResponses, null, 2));

    await browser.close();
    console.log('done');
  } catch(e) {
    console.error('ERROR', e);
    await browser.close();
    process.exit(1);
  }
})();
