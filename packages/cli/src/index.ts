#!/usr/bin/env node

/**
 * Ropi AOSS CLI Entry Point
 * Per AOSS Section 3.1 — Notion Raw Export Engine
 * 
 * This CLI performs raw Notion export only (v0.2.0).
 * TODO (AOSS): Section 3.2 normalization will be implemented in v0.3.x+
 */

import { runNotionExport } from './exportNotion';

async function main() {
  try {
    await runNotionExport();
  } catch (error: any) {
    console.error('\n❌ Export failed:', error.message);
    process.exit(1);
  }
}

main();
