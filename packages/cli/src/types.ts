/**
 * Type definitions for Notion Raw Export Engine
 * Per AOSS Section 3.1 — Import Engine: Row Schema
 */

import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

/**
 * Raw Notion export structure per AOSS Section 3.1
 * This is the raw export format before normalization (Section 3.2)
 */
export interface NotionRawExport {
  page_id: string;
  fetched_at: string; // ISO timestamp
  page: PageObjectResponse | PartialPageObjectResponse;
  blocks: Array<BlockObjectResponse | PartialBlockObjectResponse>;
}

/**
 * Configuration for Notion page IDs
 */
export interface NotionPagesConfig {
  pages: string[];
}
