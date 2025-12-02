/**
 * Notion Raw Export Engine
 * Per AOSS Section 3.1 — Import Engine: Row Schema
 * 
 * This performs RAW EXPORT ONLY. No normalization or validation.
 * TODO (AOSS): See Section 3.2 — normalization rules not implemented yet.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { NotionClientWrapper } from './notionClient';
import type { NotionRawExport, NotionPagesConfig } from './types';

const OUTPUT_DIR = 'data/notion_export';

/**
 * Get page IDs from env var or config file
 */
function getPageIds(): string[] {
  // Try NOTION_PAGE_IDS env var first
  const envPageIds = process.env.NOTION_PAGE_IDS;
  if (envPageIds) {
    return envPageIds.split(',').map((id) => id.trim()).filter(Boolean);
  }

  // Fallback to config/notion_pages.json
  const configPath = resolve(process.cwd(), 'config/notion_pages.json');
  if (existsSync(configPath)) {
    const configContent = readFileSync(configPath, 'utf-8');
    const config: NotionPagesConfig = JSON.parse(configContent);
    return config.pages;
  }

  throw new Error(
    'No page IDs found. Set NOTION_PAGE_IDS env var or create config/notion_pages.json'
  );
}

/**
 * Export a single Notion page to raw JSON
 */
async function exportPage(
  client: NotionClientWrapper,
  pageId: string
): Promise<void> {
  console.log(`\n📄 Fetching page: ${pageId}`);

  try {
    // Fetch page metadata
    console.log('  → Retrieving page metadata...');
    const page = await client.getPage(pageId);

    // Fetch all blocks (with pagination)
    console.log('  → Fetching blocks (paginated)...');
    const blocks = await client.getAllBlocks(pageId);
    console.log(`  ✓ Retrieved ${blocks.length} blocks`);

    // Build raw export object per AOSS Section 3.1
    const rawExport: NotionRawExport = {
      page_id: pageId,
      fetched_at: new Date().toISOString(),
      page,
      blocks,
    };

    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write to timestamped file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${pageId}_${timestamp}.json`;
    const filepath = resolve(OUTPUT_DIR, filename);

    writeFileSync(filepath, JSON.stringify(rawExport, null, 2), 'utf-8');
    console.log(`  ✓ Exported to: ${filepath}`);
  } catch (error: any) {
    console.error(`  ✗ Failed to export page ${pageId}:`, error.message);
    throw error;
  }
}

/**
 * Main export function
 */
export async function runNotionExport(): Promise<void> {
  console.log('🚀 Notion Raw Export Engine (AOSS v0.2.0)');
  console.log('Per AOSS Section 3.1 — Raw export only, no normalization\n');

  // Check for NOTION_TOKEN
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_TOKEN environment variable is required');
  }

  // Get page IDs
  const pageIds = getPageIds();
  console.log(`📋 Found ${pageIds.length} page(s) to export:\n   ${pageIds.join('\n   ')}`);

  // Initialize client
  const client = new NotionClientWrapper(token);

  // Export each page
  let successCount = 0;
  let errorCount = 0;

  for (const pageId of pageIds) {
    try {
      await exportPage(client, pageId);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to export ${pageId}, continuing...`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully exported: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('='.repeat(50));

  if (errorCount > 0) {
    process.exit(1);
  }
}
