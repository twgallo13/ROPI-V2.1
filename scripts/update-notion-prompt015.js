#!/usr/bin/env node

/**
 * Update Notion Build Progress Log
 * Quick script to append PROMPT_015 results to the Build Progress Log
 */

const https = require('https');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const PAGE_ID = '2bd45ee1ec5a800da672f7dac3000966';

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN not set');
  process.exit(1);
}

const timestamp = new Date().toISOString();

const content = {
  parent: { page_id: PAGE_ID },
  properties: {
    title: {
      title: [
        {
          text: {
            content: `PROMPT_015: AOSS_FIRESTORE_RULES_DEPLOY_v1.0 - ${timestamp}`
          }
        }
      ]
    }
  },
  children: [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: { content: '✅ COMPLETE - Deploy Firestore & Storage Rules to Staging' },
            annotations: { bold: true }
          }
        ]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Status' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '✅ SUCCESS - All tests passed, all rules deployed' } }
        ]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Test Results' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Total Tests: 17/17 PASSED (100% success rate)' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Firestore Rules: 10/10 tests passed' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Storage Rules: 7/7 tests passed' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Deployment' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Project: ropi-bccee (staging)' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Firestore rules: cloud.firestore ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Storage rules: firebase.storage ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Indexes: 3 composite indexes ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Security Validated' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Authentication enforcement ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Creator-based permissions ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Field validation ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Storage upload restrictions (<5MB, image/* only) ✅' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Deliverables' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { type: 'text', text: { content: 'PR: ' } },
          { type: 'text', text: { content: '#161', link: { url: 'https://github.com/twgallo13/ROPI-V2.1/pull/161' } } },
          { type: 'text', text: { content: ' - Created (DO NOT MERGE - staging only)' } }
        ]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Branch: feature/aoss-firestore-rules-v1-0' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Audit: HOMER_AOSS_FIRESTORE_RULES_DEPLOY_v1.0_AUDIT.txt' } }]
      }
    },
    {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: 'Next Steps' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Monitor staging logs for 24-48 hours' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Integrate with Product Editor (PR #160)' } }]
      }
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: 'Address storage delete permissions (restrict to creator)' } }]
      }
    },
    {
      object: 'block',
      type: 'divider',
      divider: {}
    }
  ]
};

const postData = JSON.stringify(content);

const options = {
  hostname: 'api.notion.com',
  port: 443,
  path: '/v1/pages',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📝 Updating Notion Build Progress Log...');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Notion Build Progress Log updated successfully');
      console.log(`   Page ID: ${PAGE_ID}`);
      console.log(`   Timestamp: ${timestamp}`);
    } else {
      console.error(`❌ Failed to update Notion: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
