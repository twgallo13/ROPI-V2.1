/**
 * capture-console.js
 * Loads a page in headless browser and captures console output
 * 
 * Usage:
 *   node scripts/capture-console.js <url> [--out=<path>]
 * 
 * Example:
 *   node scripts/capture-console.js https://ropi-aoss-staging.web.app/products/TP12224-LALBLCK --out=reports/console-capture.txt
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--'));
const outArg = args.find(a => a.startsWith('--out='));
const outPath = outArg ? outArg.split('=')[1] : null;

async function main() {
  if (!url) {
    console.error('Usage: node scripts/capture-console.js <url> [--out=<path>]');
    process.exit(1);
  }

  console.log(`Loading: ${url}`);
  console.log('Capturing console output...\n');

  const consoleMessages = [];
  const errors = [];
  const networkErrors = [];

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Capture console messages
  page.on('console', msg => {
    const entry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    };
    consoleMessages.push(entry);
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const entry = {
      type: 'error',
      message: error.message,
      stack: error.stack,
    };
    errors.push(entry);
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Capture network failures
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()?.errorText,
    });
  });

  try {
    // Navigate and wait for network to settle
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait additional time for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n--- Console capture complete ---\n');

    // Build report
    const report = {
      url,
      capturedAt: new Date().toISOString(),
      summary: {
        totalMessages: consoleMessages.length,
        errors: consoleMessages.filter(m => m.type === 'error').length,
        warnings: consoleMessages.filter(m => m.type === 'warning').length,
        pageErrors: errors.length,
        networkErrors: networkErrors.length,
        hasTypeError: consoleMessages.some(m => m.text.includes('TypeError')) || errors.some(e => e.message.includes('TypeError')),
      },
      consoleMessages: consoleMessages.slice(0, 100), // First 100 messages
      pageErrors: errors,
      networkErrors: networkErrors.slice(0, 20), // First 20 network errors
    };

    const output = `
================================================================================
CONSOLE CAPTURE REPORT
================================================================================
URL: ${url}
Captured: ${report.capturedAt}

SUMMARY
-------
Total console messages: ${report.summary.totalMessages}
Errors: ${report.summary.errors}
Warnings: ${report.summary.warnings}
Page errors: ${report.summary.pageErrors}
Network errors: ${report.summary.networkErrors}
Contains TypeError: ${report.summary.hasTypeError ? 'YES ❌' : 'NO ✅'}

================================================================================
CONSOLE MESSAGES (first 100)
================================================================================
${consoleMessages.slice(0, 100).map((m, i) => `[${i + 1}] [${m.type.toUpperCase()}] ${m.text}`).join('\n')}

================================================================================
PAGE ERRORS
================================================================================
${errors.length === 0 ? 'None ✅' : errors.map(e => `${e.message}\n${e.stack}`).join('\n\n')}

================================================================================
NETWORK ERRORS (first 20)
================================================================================
${networkErrors.length === 0 ? 'None ✅' : networkErrors.slice(0, 20).map(e => `${e.url}: ${e.failure}`).join('\n')}

================================================================================
VERIFICATION RESULT
================================================================================
${report.summary.hasTypeError ? '❌ FAIL - TypeErrors detected' : '✅ PASS - No TypeErrors detected'}
`;

    if (outPath) {
      // Ensure directory exists
      const dir = path.dirname(outPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outPath, output);
      // Also save JSON version
      const jsonPath = outPath.replace(/\.txt$/, '.json');
      fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
      console.log(`Saved text report to: ${outPath}`);
      console.log(`Saved JSON report to: ${jsonPath}`);
    } else {
      console.log(output);
    }

  } catch (error) {
    console.error('Error loading page:', error.message);
  } finally {
    await browser.close();
  }
}

main();
