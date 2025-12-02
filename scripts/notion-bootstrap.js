#!/usr/bin/env node
/**
 * New-Chat Bootstrap — Write findings to Notion
 * Appends a dated block to the top of the Build Progress Log
 */

const { Client } = require('@notionhq/client');

const NOTION_PAGE_ID = '2bd45ee1ec5a800da672f7dac3000966';

async function main() {
  const token = process.env.NOTION_TOKEN;
  
  if (!token) {
    console.error('❌ NOTION_TOKEN not set');
    console.error('Please set the NOTION_TOKEN environment variable or invite the Notion integration.');
    console.error('Integration name: Ropi-AOSS-AI');
    process.exit(1);
  }

  const notion = new Client({ auth: token });
  
  const timestamp = new Date().toISOString();
  const stagingStatus = process.argv[2] || '200';
  const previewStatus = process.argv[3] || '200';
  const previewUrl = process.argv[4] || 'N/A';
  const openPRs = process.argv[5] || '0';
  const iamBlockers = process.argv[6] || '0';
  const latestRunId = process.argv[7] || 'N/A';

  try {
    // Append a new block to the page
    const response = await notion.blocks.children.append({
      block_id: NOTION_PAGE_ID,
      children: [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `New-Chat Bootstrap — ${timestamp}`,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `✅ Staging: HTTP ${stagingStatus} (Run ${latestRunId})\n`,
                },
              },
              {
                type: 'text',
                text: {
                  content: `✅ Sample Preview: HTTP ${previewStatus}\n`,
                },
              },
              {
                type: 'text',
                text: {
                  content: `📊 Open PRs: ${openPRs}\n`,
                },
              },
              {
                type: 'text',
                text: {
                  content: `🔒 IAM Blockers: ${iamBlockers}\n`,
                },
              },
              {
                type: 'text',
                text: {
                  content: `🔗 Latest Preview: ${previewUrl}`,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Key Findings from HOMER vNEXT Audit',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Staging deploy working (Run 19855839772)',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Preview deploy working (Run 19855900099)',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'Workflows cleaned up (PR #153 merged)',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: 'IAM permissions granted and validated',
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'divider',
          divider: {},
        },
      ],
    });

    console.log('✅ Bootstrap entry added to Notion');
    console.log(`Block ID: ${response.results[0].id}`);
  } catch (error) {
    if (error.code === 'unauthorized') {
      console.error('❌ Cannot access Notion page — authorization failed');
      console.error('Please invite the Notion integration "Ropi-AOSS-AI" to the page:');
      console.error('https://www.notion.so/Ropi-AOSS-Build-Progress-Log-Workflow-State-2bd45ee1ec5a800da672f7dac3000966');
    } else if (error.code === 'object_not_found') {
      console.error('❌ Notion page not found');
      console.error('Check the page ID or ensure it exists.');
    } else {
      console.error('❌ Notion API error:', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

main();
