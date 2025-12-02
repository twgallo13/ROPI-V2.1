/**
 * Notion Client with retry logic
 * Per AOSS Section 3.1 — Import Engine requirements
 */

import { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  BlockObjectResponse,
  PartialBlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for Notion API calls
 * Handles 429 (rate limit) and 5xx (server errors)
 * Backoff: 1s → 2s → 4s
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempt = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable =
      error.status === 429 || (error.status >= 500 && error.status < 600);

    if (isRetryable && attempt < MAX_RETRIES) {
      const backoffTime = INITIAL_BACKOFF * Math.pow(2, attempt);
      console.warn(
        `Notion API error ${error.status}, retrying in ${backoffTime}ms... (attempt ${attempt + 1}/${MAX_RETRIES})`
      );
      await sleep(backoffTime);
      return retryWithBackoff(fn, attempt + 1);
    }

    throw error;
  }
}

export class NotionClientWrapper {
  private client: Client;

  constructor(token: string) {
    this.client = new Client({ auth: token });
  }

  /**
   * Fetch page metadata
   */
  async getPage(
    pageId: string
  ): Promise<PageObjectResponse | PartialPageObjectResponse> {
    return retryWithBackoff(() => this.client.pages.retrieve({ page_id: pageId }));
  }

  /**
   * Fetch all blocks for a page with full pagination
   */
  async getAllBlocks(
    blockId: string
  ): Promise<Array<BlockObjectResponse | PartialBlockObjectResponse>> {
    const blocks: Array<BlockObjectResponse | PartialBlockObjectResponse> = [];
    let cursor: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await retryWithBackoff(() =>
        this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: cursor,
        })
      );

      blocks.push(...response.results);
      hasMore = response.has_more;
      cursor = response.next_cursor || undefined;
    }

    return blocks;
  }
}
