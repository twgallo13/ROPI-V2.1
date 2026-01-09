#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

// Required canonical labels per GOVERNANCE.md
const REQUIRED_LABELS = {
  state: [
    { name: 'state:planned', color: 'd4c5f9', description: 'PR is planned but not started' },
    { name: 'state:in-progress', color: 'fbca04', description: 'PR is actively being worked on' },
    { name: 'state:review', color: '0e8a16', description: 'PR is in review' },
    { name: 'state:changes-requested', color: 'd93f0b', description: 'PR has changes requested' },
    { name: 'state:approved', color: '0e8a16', description: 'PR is approved and ready to merge' },
    { name: 'state:merged', color: '6f42c1', description: 'PR has been merged' },
    { name: 'state:closed', color: 'd73a4a', description: 'PR has been closed without merging' }
  ],
  blocked: [
    { name: 'blocked:decision-needed', color: 'd93f0b', description: 'Blocked awaiting decision' },
    { name: 'blocked:dependency', color: 'd93f0b', description: 'Blocked by dependency' },
    { name: 'blocked:ci-failure', color: 'd93f0b', description: 'Blocked by CI failure' },
    { name: 'blocked:external', color: 'd93f0b', description: 'Blocked by external factor' },
    { name: 'blocked:coderabbit-review', color: 'd93f0b', description: 'Blocked by unresolved CodeRabbit comments' }
  ],
  cleanup: [
    { name: 'cleanup:required', color: 'ffffff', description: 'Cleanup required after merge' },
    { name: 'cleanup:done', color: '0e8a16', description: 'Cleanup completed' }
  ],
  type: [
    { name: 'type:docs', color: '0075ca', description: 'Documentation changes' },
    { name: 'type:infra', color: '5319e7', description: 'Infrastructure changes' },
    { name: 'type:feature', color: 'a2eeef', description: 'New feature' },
    { name: 'type:fix', color: 'd73a4a', description: 'Bug fix' },
    { name: 'type:chore', color: 'fef2c0', description: 'Maintenance or chore' }
  ],
  other: [
    { name: 'stale-candidate', color: 'ededed', description: 'Item may be stale (LP-cleanup-002)' },
    { name: 'needs-info', color: 'd93f0b', description: 'Needs more information or clarification' }
  ]
};

// Read existing labels
const existingLabels = JSON.parse(readFileSync('./existing_labels.json', 'utf8'));
const existingNames = new Set(existingLabels.map(l => l.name));

console.log('=== Label Creation Analysis ===\n');

const toCreate = [];
const alreadyExists = [];

for (const [category, labels] of Object.entries(REQUIRED_LABELS)) {
  for (const label of labels) {
    if (existingNames.has(label.name)) {
      alreadyExists.push(label.name);
    } else {
      toCreate.push(label);
    }
  }
}

console.log(`Already exists: ${alreadyExists.length}`);
console.log(`To create: ${toCreate.length}\n`);

if (toCreate.length > 0) {
  console.log('Labels to create:');
  toCreate.forEach(l => console.log(`  - ${l.name} (${l.color}): ${l.description}`));
}

// Save labels to create
writeFileSync('./labels_to_create.json', JSON.stringify(toCreate, null, 2));
writeFileSync('./labels_already_exist.json', JSON.stringify(alreadyExists, null, 2));

console.log(`\n✅ Analysis complete. ${toCreate.length} labels need creation.`);
