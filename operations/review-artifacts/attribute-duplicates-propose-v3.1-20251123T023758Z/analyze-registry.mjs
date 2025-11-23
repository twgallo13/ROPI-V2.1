#!/usr/bin/env node
/**
 * Homer v3.1 - Attribute Registry Duplicate Analysis & Merge Proposal
 * Purpose: Detect duplicates, score keepers, propose merges (NO AUTO-APPLY)
 */

import fs from 'fs/promises';
import path from 'path';

const TS = process.env.TS || '20251123T023758Z';
const OUTDIR = `operations/review-artifacts/attribute-duplicates-propose-v3.1-${TS}`;
const SOURCE_FILE = `${OUTDIR}/attribute-registry-source-${TS}.json`;

// Utility: safe get
function safeGet(obj, path, defaultVal = null) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? defaultVal;
}

// Utility: score candidate
function scoreCandidate(entry) {
  let score = 0;
  let reasons = [];

  // +10: non-empty label
  if (entry.label && entry.label.trim().length > 0) {
    score += 10;
    reasons.push('+10 non-empty label');
  }

  // +8: importerColumns length > 0
  const importerCols = safeGet(entry, 'importerColumns', []);
  if (Array.isArray(importerCols) && importerCols.length > 0) {
    score += 8;
    reasons.push(`+8 importerColumns (${importerCols.length})`);
  }

  // +5: export === true
  if (entry.export === true) {
    score += 5;
    reasons.push('+5 export=true');
  }

  // +3: deprecated !== true
  if (entry.deprecated !== true) {
    score += 3;
    reasons.push('+3 not deprecated');
  }

  // +3: foundation === true
  if (entry.foundation === true) {
    score += 3;
    reasons.push('+3 foundation');
  }

  // +2: ai.can_write === true or ai.* non-empty
  const ai = entry.ai;
  if (ai && (ai.can_write === true || Object.keys(ai).length > 0)) {
    score += 2;
    reasons.push('+2 ai object');
  }

  // +1: more recent audit.updatedAt
  const updatedAt = safeGet(entry, 'audit.updatedAt');
  if (updatedAt) {
    score += 1;
    reasons.push('+1 has updatedAt');
  }

  return { score, reasons, updatedAt };
}

// Main analysis
async function main() {
  console.log(`[Homer v3.1 Propose] Starting duplicate analysis`);
  console.log(`OUTDIR: ${OUTDIR}`);
  console.log(`SOURCE: ${SOURCE_FILE}`);

  // Read registry
  const registryRaw = await fs.readFile(SOURCE_FILE, 'utf-8');
  const registry = JSON.parse(registryRaw);
  console.log(`Registry entries: ${registry.length}`);

  // Group by canonicalPath
  const byCanonical = {};
  const blankLabels = [];

  registry.forEach((entry, idx) => {
    const canonical = entry.canonicalPath || '(blank)';
    if (!byCanonical[canonical]) {
      byCanonical[canonical] = [];
    }
    byCanonical[canonical].push({ ...entry, _index: idx });

    // Check blank label
    if (!entry.label || entry.label.trim().length === 0) {
      blankLabels.push({ _index: idx, id: entry.id, key: entry.key, canonicalPath: canonical });
    }
  });

  // Find duplicates
  const duplicates = {};
  for (const [canonical, group] of Object.entries(byCanonical)) {
    if (group.length > 1) {
      duplicates[canonical] = group;
    }
  }

  console.log(`Duplicate groups found: ${Object.keys(duplicates).length}`);
  console.log(`Blank labels found: ${blankLabels.length}`);

  // Write duplicates-by-canonical.json
  await fs.writeFile(
    path.join(OUTDIR, 'duplicates-by-canonical.json'),
    JSON.stringify(duplicates, null, 2)
  );

  // Write blank-labels.json
  await fs.writeFile(
    path.join(OUTDIR, 'blank-labels.json'),
    JSON.stringify(blankLabels, null, 2)
  );

  // Build duplicates-summary.md
  let summaryMd = `# Attribute Registry Duplicates Summary\n\n`;
  summaryMd += `**Generated:** ${new Date().toISOString()}\n`;
  summaryMd += `**Source:** ${SOURCE_FILE}\n`;
  summaryMd += `**Total Entries:** ${registry.length}\n`;
  summaryMd += `**Duplicate Groups:** ${Object.keys(duplicates).length}\n`;
  summaryMd += `**Blank Labels:** ${blankLabels.length}\n\n`;
  summaryMd += `---\n\n`;

  const proposedKeepers = {};
  const mergePlans = [];

  for (const [canonical, group] of Object.entries(duplicates)) {
    summaryMd += `## \`${canonical}\` (${group.length} entries)\n\n`;

    // Score each
    const scored = group.map(entry => {
      const { score, reasons, updatedAt } = scoreCandidate(entry);
      return { entry, score, reasons, updatedAt };
    });

    // Sort by score desc, then updatedAt desc
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.updatedAt && b.updatedAt) return new Date(b.updatedAt) - new Date(a.updatedAt);
      if (a.updatedAt) return -1;
      if (b.updatedAt) return 1;
      return 0;
    });

    const keeper = scored[0];
    proposedKeepers[canonical] = {
      canonicalPath: canonical,
      keeperId: keeper.entry.id,
      keeperKey: keeper.entry.key,
      score: keeper.score,
      rationale: keeper.reasons.join(', ')
    };

    // Document each entry
    scored.forEach(({ entry, score, reasons }, i) => {
      const isKeeper = i === 0;
      summaryMd += `### ${isKeeper ? '🏆 KEEPER' : 'Duplicate'}: \`${entry.key}\` (Score: ${score})\n\n`;
      summaryMd += `- **ID:** \`${entry.id}\`\n`;
      summaryMd += `- **Index:** ${entry._index}\n`;
      summaryMd += `- **Label:** "${entry.label || '(blank)'}"\n`;
      summaryMd += `- **ImporterColumns:** ${JSON.stringify(entry.importerColumns || [])}\n`;
      summaryMd += `- **Export:** ${entry.export}\n`;
      summaryMd += `- **Deprecated:** ${entry.deprecated || false}\n`;
      summaryMd += `- **Foundation:** ${entry.foundation || false}\n`;
      summaryMd += `- **AllowedValuesRef:** ${safeGet(entry, 'validation.allowedValuesRef', 'none')}\n`;
      summaryMd += `- **AI Object:** ${entry.ai ? 'present' : 'none'}\n`;
      summaryMd += `- **Updated:** ${safeGet(entry, 'audit.updatedAt', 'n/a')}\n`;
      summaryMd += `- **Score Reasons:** ${reasons.join(', ')}\n\n`;
    });

    // Build merge plan
    const mergePlan = buildMergePlan(canonical, keeper.entry, scored.slice(1).map(s => s.entry));
    mergePlans.push(mergePlan);

    summaryMd += `#### Merge Plan:\n\n`;
    summaryMd += `- Keeper: \`${keeper.entry.key}\` (${keeper.entry.id})\n`;
    summaryMd += `- ImporterColumns (merged): ${JSON.stringify(mergePlan.mergeFields.importerColumns)}\n`;
    summaryMd += `- AllowedValuesRef: ${mergePlan.mergeFields.allowedValuesRef || 'none'}\n`;
    summaryMd += `- To Deprecate: ${mergePlan.toDeprecate.map(d => d.id).join(', ')}\n`;
    if (mergePlan.manualChecks.length > 0) {
      summaryMd += `- ⚠️ Manual Checks Required:\n`;
      mergePlan.manualChecks.forEach(check => {
        summaryMd += `  - ${check}\n`;
      });
    }
    summaryMd += `\n---\n\n`;
  }

  await fs.writeFile(path.join(OUTDIR, 'duplicates-summary.md'), summaryMd);

  // Write proposed-keepers.json
  await fs.writeFile(
    path.join(OUTDIR, 'proposed-keepers.json'),
    JSON.stringify(proposedKeepers, null, 2)
  );

  // Write merge-plan.json
  await fs.writeFile(
    path.join(OUTDIR, 'merge-plan.json'),
    JSON.stringify(mergePlans, null, 2)
  );

  // Write merge-plan.md
  let mergePlanMd = `# Attribute Registry Merge Plan\n\n`;
  mergePlanMd += `**Generated:** ${new Date().toISOString()}\n\n`;
  mergePlanMd += `This document describes the proposed merge strategy for ${mergePlans.length} duplicate groups.\n\n`;
  mergePlanMd += `---\n\n`;

  mergePlans.forEach((plan, i) => {
    mergePlanMd += `## ${i + 1}. \`${plan.canonicalPath}\`\n\n`;
    mergePlanMd += `**Keeper:** \`${plan.keeper.key}\` (${plan.keeper.id})\n\n`;
    mergePlanMd += `### Merged Fields:\n\n`;
    mergePlanMd += `\`\`\`json\n${JSON.stringify(plan.mergeFields, null, 2)}\n\`\`\`\n\n`;
    mergePlanMd += `### To Deprecate (${plan.toDeprecate.length}):\n\n`;
    plan.toDeprecate.forEach(dep => {
      mergePlanMd += `- \`${dep.key}\` (${dep.id})\n`;
    });
    mergePlanMd += `\n`;
    if (plan.manualChecks.length > 0) {
      mergePlanMd += `### ⚠️ Manual Checks Required:\n\n`;
      plan.manualChecks.forEach(check => {
        mergePlanMd += `- ${check}\n`;
      });
      mergePlanMd += `\n`;
    }
    mergePlanMd += `---\n\n`;
  });

  await fs.writeFile(path.join(OUTDIR, 'merge-plan.md'), mergePlanMd);

  // Generate proposed patch
  const patch = generateProposedPatch(registry, mergePlans);
  await fs.writeFile(
    path.join(OUTDIR, 'registry-proposed-patch.json'),
    JSON.stringify(patch, null, 2)
  );

  // Generate allowed-values check
  const allowedValuesCheck = generateAllowedValuesCheck(registry, duplicates);
  await fs.writeFile(
    path.join(OUTDIR, 'attribute-allowed-values-check.json'),
    JSON.stringify(allowedValuesCheck, null, 2)
  );

  // Summary
  const summary = {
    timestamp: new Date().toISOString(),
    version: 'v3.1.propose',
    source: SOURCE_FILE,
    totalEntries: registry.length,
    duplicateGroups: Object.keys(duplicates).length,
    blankLabels: blankLabels.length,
    proposedKeepers: Object.keys(proposedKeepers).length,
    duplicateCanonicalPaths: Object.keys(duplicates),
    outdir: OUTDIR
  };

  await fs.writeFile(
    path.join(OUTDIR, 'homer-summary-v3.1-propose.json'),
    JSON.stringify(summary, null, 2)
  );

  let summaryTxt = `Homer v3.1 Propose - Attribute Registry Duplicate Analysis\n`;
  summaryTxt += `==========================================================\n\n`;
  summaryTxt += `Generated: ${summary.timestamp}\n`;
  summaryTxt += `Source: ${SOURCE_FILE}\n`;
  summaryTxt += `Total Entries: ${summary.totalEntries}\n`;
  summaryTxt += `Duplicate Groups: ${summary.duplicateGroups}\n`;
  summaryTxt += `Blank Labels: ${summary.blankLabels}\n`;
  summaryTxt += `Proposed Keepers: ${summary.proposedKeepers}\n\n`;
  summaryTxt += `Duplicate Canonical Paths:\n`;
  summary.duplicateCanonicalPaths.forEach(path => {
    summaryTxt += `  - ${path}\n`;
  });
  summaryTxt += `\nOutput Directory: ${OUTDIR}\n`;
  summaryTxt += `\n⚠️ PROPOSAL ONLY - NO CHANGES APPLIED\n`;
  summaryTxt += `Review artifacts and approve before applying patch or seeding staging.\n`;

  await fs.writeFile(
    path.join(OUTDIR, 'homer-summary-v3.1-propose.txt'),
    summaryTxt
  );

  console.log(`\n✅ Analysis complete!`);
  console.log(`Artifacts saved to: ${OUTDIR}`);
  console.log(`Duplicate groups: ${Object.keys(duplicates).length}`);
  console.log(`Duplicate paths: ${Object.keys(duplicates).join(', ') || 'none'}`);
}

function buildMergePlan(canonical, keeper, duplicates) {
  const mergeFields = {
    importerColumns: [],
    allowedValuesRef: null,
    ai: {},
    export: keeper.export || false,
    requiredForExport: keeper.requiredForExport || false,
    foundation: keeper.foundation || false,
    description: keeper.description || '',
    sampleValues: []
  };

  const manualChecks = [];
  const toDeprecate = [];

  // Collect from keeper first
  if (keeper.importerColumns) {
    mergeFields.importerColumns.push(...keeper.importerColumns);
  }
  if (keeper.validation?.allowedValuesRef) {
    mergeFields.allowedValuesRef = keeper.validation.allowedValuesRef;
  }
  if (keeper.ai) {
    mergeFields.ai = { ...keeper.ai };
  }
  if (keeper.examples?.sampleValues) {
    mergeFields.sampleValues.push(...keeper.examples.sampleValues);
  }

  // Merge from duplicates
  duplicates.forEach(dup => {
    if (dup.importerColumns) {
      mergeFields.importerColumns.push(...dup.importerColumns);
    }

    // Check allowedValuesRef conflicts
    const dupRef = dup.validation?.allowedValuesRef;
    if (dupRef && dupRef !== mergeFields.allowedValuesRef) {
      if (!mergeFields.allowedValuesRef) {
        mergeFields.allowedValuesRef = dupRef;
      } else {
        manualChecks.push(`Conflicting allowedValuesRef: keeper='${mergeFields.allowedValuesRef}', duplicate='${dupRef}'`);
      }
    }

    // Merge AI
    if (dup.ai) {
      mergeFields.ai = { ...mergeFields.ai, ...dup.ai };
    }

    // Logical OR for booleans
    if (dup.export === true) mergeFields.export = true;
    if (dup.requiredForExport === true) mergeFields.requiredForExport = true;
    if (dup.foundation === true) mergeFields.foundation = true;

    // Merge description if keeper empty
    if (!mergeFields.description && dup.description) {
      mergeFields.description = dup.description;
    }

    // Merge sample values
    if (dup.examples?.sampleValues) {
      mergeFields.sampleValues.push(...dup.examples.sampleValues);
    }

    // Check dataType conflicts
    if (dup.dataType && keeper.dataType && dup.dataType !== keeper.dataType) {
      manualChecks.push(`Conflicting dataType: keeper='${keeper.dataType}', duplicate='${dup.dataType}'`);
    }

    toDeprecate.push({ id: dup.id, key: dup.key });
  });

  // Deduplicate arrays
  mergeFields.importerColumns = [...new Set(mergeFields.importerColumns)];
  mergeFields.sampleValues = [...new Set(mergeFields.sampleValues)];

  return {
    canonicalPath: canonical,
    keeper: { id: keeper.id, key: keeper.key, label: keeper.label },
    mergeFields,
    toDeprecate,
    manualChecks
  };
}

function generateProposedPatch(registry, mergePlans) {
  const patch = {
    version: 'v3.1.propose',
    timestamp: new Date().toISOString(),
    operations: []
  };

  mergePlans.forEach(plan => {
    // Update keeper
    patch.operations.push({
      action: 'update',
      id: plan.keeper.id,
      key: plan.keeper.key,
      canonicalPath: plan.canonicalPath,
      updates: plan.mergeFields
    });

    // Deprecate duplicates
    plan.toDeprecate.forEach(dup => {
      patch.operations.push({
        action: 'deprecate',
        id: dup.id,
        key: dup.key,
        updates: {
          deprecated: true,
          ui: { hidden: true }
        }
      });
    });
  });

  return patch;
}

function generateAllowedValuesCheck(registry, duplicates) {
  const check = [];
  const targetPaths = new Set([
    'sku_core.department',
    'sku_core.class',
    'descriptive.primaryColor',
    'source.rics'
  ]);

  // Add all duplicate paths
  Object.keys(duplicates).forEach(path => targetPaths.add(path));

  registry.forEach(entry => {
    if (targetPaths.has(entry.canonicalPath)) {
      check.push({
        canonicalPath: entry.canonicalPath,
        id: entry.id,
        key: entry.key,
        label: entry.label,
        allowedValuesRef: safeGet(entry, 'validation.allowedValuesRef', null),
        dataType: entry.dataType,
        importerColumns: entry.importerColumns || [],
        lastModified: safeGet(entry, 'audit.updatedAt', null)
      });
    }
  });

  return check;
}

main().catch(err => {
  console.error('ERROR:', err);
  fs.writeFile(path.join(OUTDIR, 'error.log'), err.stack).then(() => {
    process.exit(1);
  });
});
