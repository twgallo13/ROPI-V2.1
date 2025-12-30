#!/usr/bin/env node
/**
 * migrate-observations-tags.dryrun.js
 * 
 * LP-obs-studio-cleanup-apply-1.5.0: Enhanced migration dry-run script for observations tags.
 * 
 * This script:
 * 1. Samples N observations from Firestore (or full collection with --all)
 * 2. Derives tags[] from comma-separated text fields using category-aware parsing
 * 3. Detects conflicts between existing tags and derived tags
 * 4. Assigns confidence scores to each derivation
 * 5. Flags anomalies (e.g., suspicious patterns, encoding issues)
 * 6. Produces a comprehensive dry-run report with acceptance criteria metrics
 * 
 * IMPORTANT: This is a DRY-RUN ONLY script. It does NOT write to Firestore.
 * Any production migration requires explicit Lisa approval and a separate Apply LP.
 * 
 * Usage:
 *   node scripts/migrate-observations-tags.dryrun.js <path-to-sa-key.json> [options]
 * 
 * Options:
 *   --limit=N       Sample N observations (default: 100)
 *   --all           Process all observations (use with caution)
 *   --output=PATH   Write report to PATH instead of /tmp
 *   --verbose       Show detailed per-observation analysis
 * 
 * Example:
 *   node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-deploy-sa-key.json --limit=100
 *   node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-deploy-sa-key.json --all --output=/tmp/full-report.json
 * 
 * Acceptance Criteria (for Apply LP):
 *   - Conflict rate < 5%
 *   - Mean confidence score ≥ 0.80
 *   - Anomaly rate < 2%
 *   - Coverage ≥ 70% (observations that would benefit from migration)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

const args = process.argv.slice(2);
const saKeyPath = args.find(arg => !arg.startsWith('--'));
const limitArg = args.find(arg => arg.startsWith('--limit='));
const outputArg = args.find(arg => arg.startsWith('--output='));
const processAll = args.includes('--all');
const verbose = args.includes('--verbose');
const limit = processAll ? Infinity : (limitArg ? parseInt(limitArg.split('=')[1], 10) : 100);
const customOutput = outputArg ? outputArg.split('=')[1] : null;

if (!saKeyPath) {
  console.error('Usage: node scripts/migrate-observations-tags.dryrun.js <path-to-sa-key.json> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --limit=N       Sample N observations (default: 100)');
  console.error('  --all           Process all observations');
  console.error('  --output=PATH   Custom output path for report');
  console.error('  --verbose       Show detailed analysis');
  console.error('');
  console.error('⚠️  This is a DRY-RUN script. It does NOT modify Firestore.');
  process.exit(1);
}

if (!fs.existsSync(saKeyPath)) {
  console.error(`Error: Service account key file not found: ${saKeyPath}`);
  process.exit(1);
}

// =============================================================================
// FIREBASE INITIALIZATION
// =============================================================================

const serviceAccount = JSON.parse(fs.readFileSync(saKeyPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// =============================================================================
// TAG CATEGORIES & PATTERNS (from LP-1.4.0 heuristics)
// =============================================================================

const TAG_CATEGORIES = {
  color: {
    patterns: [
      /\b(black|white|red|blue|green|yellow|orange|purple|pink|brown|grey|gray|navy|gold|silver|beige|cream|tan|maroon|burgundy|olive|teal|coral|turquoise|ivory|charcoal|khaki|mint|lavender|peach|rust|sand|slate|wine|taupe|fuchsia|magenta|aqua|cyan|indigo|lime|mauve|plum|rose|salmon|scarlet|violet)\b/i,
      /\b(multi[- ]?colou?r(?:ed)?|multicolor|tie[- ]?dye|ombre|heather(?:ed)?|mottled|camo(?:uflage)?)\b/i,
    ],
    weight: 0.95,
  },
  material: {
    patterns: [
      /\b(leather|suede|canvas|nylon|polyester|cotton|wool|silk|denim|mesh|synthetic|rubber|plastic|metal|wood|velvet|satin|lace|linen|fleece|knit|woven|patent|pu|faux|vegan|genuine|full[- ]?grain)\b/i,
    ],
    weight: 0.90,
  },
  size: {
    patterns: [
      /\b(small|medium|large|x[sl]|xxl?|xxxl?|one[- ]?size|os|petite|plus|wide|narrow|regular|slim|relaxed|oversized)\b/i,
      /\b(\d+(?:\.\d+)?(?:\s*(?:us|uk|eu|cm|mm|inch(?:es)?|"|'))?)\b/i,
    ],
    weight: 0.85,
  },
  style: {
    patterns: [
      /\b(casual|formal|athletic|sport(?:s|y)?|vintage|modern|classic|contemporary|minimalist|bohemian|boho|preppy|streetwear|luxury|designer|retro|trendy|elegant|chic|edgy|grunge|punk|goth|western|cowboy|urban|outdoor|hiking|running|basketball|tennis|golf|yoga|dance|ballet|skate|surf|snow)\b/i,
    ],
    weight: 0.80,
  },
  gender: {
    patterns: [
      /\b(men(?:'?s)?|women(?:'?s)?|unisex|boy(?:'?s)?|girl(?:'?s)?|kid(?:'?s)?|child(?:ren)?(?:'?s)?|infant(?:'?s)?|toddler(?:'?s)?|baby(?:'?s)?|adult(?:'?s)?|youth)\b/i,
    ],
    weight: 0.90,
  },
  feature: {
    patterns: [
      /\b(waterproof|breathable|insulated|padded|cushioned|lightweight|durable|adjustable|removable|reversible|slip[- ]?on|lace[- ]?up|zip(?:per)?|buckle|strap|velcro|elastic|stretch(?:y)?|comfort|arch[- ]?support|memory[- ]?foam|orthopedic|anti[- ]?slip|non[- ]?slip)\b/i,
    ],
    weight: 0.85,
  },
  heel: {
    patterns: [
      /\b(flat|low[- ]?heel|mid[- ]?heel|high[- ]?heel|stiletto|block[- ]?heel|wedge|platform|kitten[- ]?heel|stacked[- ]?heel|cone[- ]?heel)\b/i,
    ],
    weight: 0.90,
  },
  toe: {
    patterns: [
      /\b(round[- ]?toe|pointed[- ]?toe|square[- ]?toe|open[- ]?toe|peep[- ]?toe|closed[- ]?toe|cap[- ]?toe|almond[- ]?toe|moc[- ]?toe)\b/i,
    ],
    weight: 0.90,
  },
};

// Anomaly patterns
const ANOMALY_PATTERNS = [
  { name: 'encoding_issue', pattern: /[\uFFFD\u0000-\u001F]/, severity: 'high' },
  { name: 'html_tags', pattern: /<[^>]+>/, severity: 'medium' },
  { name: 'excessive_length', test: (text) => text && text.length > 500, severity: 'low' },
  { name: 'numeric_only', pattern: /^\d+$/, severity: 'low' },
  { name: 'url_fragment', pattern: /https?:\/\/|www\./i, severity: 'medium' },
  { name: 'json_like', pattern: /^\s*[\[{]/, severity: 'medium' },
];

// =============================================================================
// TAG DERIVATION ENGINE
// =============================================================================

/**
 * Derive tags from observation text with category classification and confidence.
 */
function deriveTagsFromText(text) {
  if (!text || typeof text !== 'string') {
    return { tags: [], confidence: 0, categories: {}, raw: [] };
  }

  const result = {
    tags: [],
    confidence: 0,
    categories: {},
    raw: [],
  };

  // Step 1: Split by common delimiters (comma, semicolon, pipe)
  const parts = text.split(/[,;|]/).map(p => p.trim().toLowerCase()).filter(p => p.length > 0 && p.length < 80);
  result.raw = parts;

  // Step 2: Classify each part
  const tagSet = new Set();
  const confidenceScores = [];

  for (const part of parts) {
    let matched = false;
    let bestConfidence = 0.5; // Default confidence for unclassified

    for (const [category, config] of Object.entries(TAG_CATEGORIES)) {
      for (const pattern of config.patterns) {
        const match = part.match(pattern);
        if (match) {
          const tag = match[0].toLowerCase().trim();
          if (tag.length >= 2) {
            tagSet.add(tag);
            result.categories[category] = result.categories[category] || [];
            if (!result.categories[category].includes(tag)) {
              result.categories[category].push(tag);
            }
            bestConfidence = Math.max(bestConfidence, config.weight);
            matched = true;
          }
        }
      }
    }

    // If no category match but looks like a reasonable tag, add with lower confidence
    if (!matched && part.length >= 2 && part.length <= 30 && /^[a-z][a-z0-9\s\-]+$/i.test(part)) {
      tagSet.add(part);
      result.categories['uncategorized'] = result.categories['uncategorized'] || [];
      result.categories['uncategorized'].push(part);
      bestConfidence = 0.5;
    }

    if (bestConfidence > 0) {
      confidenceScores.push(bestConfidence);
    }
  }

  result.tags = [...tagSet];
  result.confidence = confidenceScores.length > 0
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : 0;

  return result;
}

/**
 * Detect anomalies in observation text.
 */
function detectAnomalies(text) {
  if (!text) return [];
  
  const anomalies = [];
  for (const { name, pattern, test, severity } of ANOMALY_PATTERNS) {
    if (pattern && pattern.test(text)) {
      anomalies.push({ name, severity });
    } else if (test && test(text)) {
      anomalies.push({ name, severity });
    }
  }
  return anomalies;
}

/**
 * Detect conflicts between existing tags and derived tags.
 */
function detectConflicts(existingTags, derivedTags) {
  if (!existingTags || existingTags.length === 0) return { hasConflict: false, conflicts: [] };
  
  const existingSet = new Set(existingTags.map(t => t.toLowerCase().trim()));
  const derivedSet = new Set(derivedTags.map(t => t.toLowerCase().trim()));
  
  const conflicts = [];
  
  // Check for tags that would be overwritten
  for (const existing of existingSet) {
    if (!derivedSet.has(existing)) {
      conflicts.push({ type: 'missing_in_derived', tag: existing });
    }
  }
  
  // Check for contradictory tags (e.g., both "black" and "white" in color category)
  const colorTags = derivedTags.filter(t => TAG_CATEGORIES.color.patterns.some(p => p.test(t)));
  if (colorTags.length > 3) {
    conflicts.push({ type: 'too_many_colors', tags: colorTags });
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

// =============================================================================
// MAIN DRY-RUN EXECUTION
// =============================================================================

async function runDryRunMigration() {
  console.log('═'.repeat(70));
  console.log('OBSERVATIONS TAGS MIGRATION - ENHANCED DRY RUN');
  console.log('LP-obs-studio-cleanup-apply-1.5.0');
  console.log('═'.repeat(70));
  console.log('');
  console.log('⚠️  THIS IS A DRY-RUN. NO CHANGES WILL BE MADE TO FIRESTORE.');
  console.log('');
  console.log(`Mode: ${processAll ? 'FULL COLLECTION' : `Sample (limit=${limit})`}`);
  console.log(`Verbose: ${verbose ? 'ON' : 'OFF'}`);
  console.log('');

  const report = {
    meta: {
      timestamp: new Date().toISOString(),
      lp: 'LP-obs-studio-cleanup-apply-1.5.0',
      mode: 'DRY_RUN',
      limit: processAll ? 'ALL' : limit,
      scriptVersion: '2.0.0',
    },
    counts: {
      totalProcessed: 0,
      withExistingTags: 0,
      withoutTags: 0,
      wouldMigrate: 0,
      wouldSkip: 0,
      withConflicts: 0,
      withAnomalies: 0,
    },
    metrics: {
      meanConfidence: 0,
      conflictRate: 0,
      anomalyRate: 0,
      coverageRate: 0,
    },
    acceptanceCriteria: {
      conflictRateThreshold: 0.05,  // < 5%
      meanConfidenceThreshold: 0.80, // ≥ 80%
      anomalyRateThreshold: 0.02,    // < 2%
      coverageThreshold: 0.70,       // ≥ 70%
      passed: false,
      details: [],
    },
    categoryDistribution: {},
    anomalySummary: {},
    samples: {
      wouldMigrate: [],
      conflicts: [],
      anomalies: [],
      highConfidence: [],
      lowConfidence: [],
    },
    // Full data (only included if --all or for detailed analysis)
    fullData: processAll ? [] : null,
  };

  const confidenceScores = [];
  let processedCount = 0;

  try {
    console.log('Fetching observations...');
    
    // Use pagination for large collections
    let lastDoc = null;
    const batchSize = 500;
    let hasMore = true;

    while (hasMore && processedCount < limit) {
      let query = db.collection('observations').orderBy('createdAt', 'asc').limit(Math.min(batchSize, limit - processedCount));
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        processedCount++;
        
        const existingTags = data.tags || [];
        const derivation = deriveTagsFromText(data.text);
        const anomalies = detectAnomalies(data.text);
        const conflicts = detectConflicts(existingTags, derivation.tags);

        const record = {
          id: doc.id,
          productMpn: data.product_mpn || null,
          textPreview: data.text ? data.text.substring(0, 150) + (data.text.length > 150 ? '...' : '') : null,
          existingTags,
          derivedTags: derivation.tags,
          categories: derivation.categories,
          confidence: derivation.confidence,
          anomalies,
          conflicts: conflicts.conflicts,
          hasExistingTags: existingTags.length > 0,
          wouldMigrate: existingTags.length === 0 && derivation.tags.length > 0,
          hasConflict: conflicts.hasConflict,
          hasAnomaly: anomalies.length > 0,
        };

        // Update counts
        if (record.hasExistingTags) {
          report.counts.withExistingTags++;
        } else {
          report.counts.withoutTags++;
        }

        if (record.wouldMigrate) {
          report.counts.wouldMigrate++;
        } else {
          report.counts.wouldSkip++;
        }

        if (record.hasConflict) {
          report.counts.withConflicts++;
        }

        if (record.hasAnomaly) {
          report.counts.withAnomalies++;
          for (const a of anomalies) {
            report.anomalySummary[a.name] = (report.anomalySummary[a.name] || 0) + 1;
          }
        }

        // Track confidence
        if (derivation.tags.length > 0) {
          confidenceScores.push(derivation.confidence);
        }

        // Track category distribution
        for (const [cat, tags] of Object.entries(derivation.categories)) {
          report.categoryDistribution[cat] = report.categoryDistribution[cat] || { count: 0, samples: [] };
          report.categoryDistribution[cat].count += tags.length;
          if (report.categoryDistribution[cat].samples.length < 5) {
            report.categoryDistribution[cat].samples.push(...tags.slice(0, 2));
          }
        }

        // Collect samples
        if (record.wouldMigrate && report.samples.wouldMigrate.length < 10) {
          report.samples.wouldMigrate.push(record);
        }
        if (record.hasConflict && report.samples.conflicts.length < 10) {
          report.samples.conflicts.push(record);
        }
        if (record.hasAnomaly && report.samples.anomalies.length < 10) {
          report.samples.anomalies.push(record);
        }
        if (record.confidence >= 0.9 && report.samples.highConfidence.length < 5) {
          report.samples.highConfidence.push(record);
        }
        if (record.confidence > 0 && record.confidence < 0.6 && report.samples.lowConfidence.length < 5) {
          report.samples.lowConfidence.push(record);
        }

        // Store full data if requested
        if (report.fullData !== null) {
          report.fullData.push(record);
        }

        if (verbose && processedCount % 100 === 0) {
          console.log(`  Processed ${processedCount} observations...`);
        }
      }

      if (snapshot.size < batchSize) {
        hasMore = false;
      }
    }

    report.counts.totalProcessed = processedCount;

    // Calculate metrics
    report.metrics.meanConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;
    report.metrics.conflictRate = processedCount > 0
      ? report.counts.withConflicts / processedCount
      : 0;
    report.metrics.anomalyRate = processedCount > 0
      ? report.counts.withAnomalies / processedCount
      : 0;
    report.metrics.coverageRate = report.counts.withoutTags > 0
      ? report.counts.wouldMigrate / report.counts.withoutTags
      : 0;

    // Evaluate acceptance criteria
    const criteria = report.acceptanceCriteria;
    criteria.details = [];

    const conflictCheck = report.metrics.conflictRate < criteria.conflictRateThreshold;
    criteria.details.push({
      criterion: 'Conflict rate',
      threshold: `< ${(criteria.conflictRateThreshold * 100).toFixed(1)}%`,
      actual: `${(report.metrics.conflictRate * 100).toFixed(2)}%`,
      passed: conflictCheck,
    });

    const confidenceCheck = report.metrics.meanConfidence >= criteria.meanConfidenceThreshold;
    criteria.details.push({
      criterion: 'Mean confidence',
      threshold: `≥ ${(criteria.meanConfidenceThreshold * 100).toFixed(0)}%`,
      actual: `${(report.metrics.meanConfidence * 100).toFixed(1)}%`,
      passed: confidenceCheck,
    });

    const anomalyCheck = report.metrics.anomalyRate < criteria.anomalyRateThreshold;
    criteria.details.push({
      criterion: 'Anomaly rate',
      threshold: `< ${(criteria.anomalyRateThreshold * 100).toFixed(1)}%`,
      actual: `${(report.metrics.anomalyRate * 100).toFixed(2)}%`,
      passed: anomalyCheck,
    });

    const coverageCheck = report.metrics.coverageRate >= criteria.coverageThreshold;
    criteria.details.push({
      criterion: 'Coverage rate',
      threshold: `≥ ${(criteria.coverageThreshold * 100).toFixed(0)}%`,
      actual: `${(report.metrics.coverageRate * 100).toFixed(1)}%`,
      passed: coverageCheck,
    });

    criteria.passed = conflictCheck && confidenceCheck && anomalyCheck && coverageCheck;

    // Print summary
    console.log('');
    console.log('─'.repeat(70));
    console.log('SUMMARY');
    console.log('─'.repeat(70));
    console.log(`Total processed:        ${report.counts.totalProcessed}`);
    console.log(`With existing tags:     ${report.counts.withExistingTags}`);
    console.log(`Without tags:           ${report.counts.withoutTags}`);
    console.log(`Would migrate:          ${report.counts.wouldMigrate}`);
    console.log(`Would skip:             ${report.counts.wouldSkip}`);
    console.log(`With conflicts:         ${report.counts.withConflicts}`);
    console.log(`With anomalies:         ${report.counts.withAnomalies}`);
    console.log('');
    console.log('─'.repeat(70));
    console.log('METRICS');
    console.log('─'.repeat(70));
    console.log(`Mean confidence:        ${(report.metrics.meanConfidence * 100).toFixed(1)}%`);
    console.log(`Conflict rate:          ${(report.metrics.conflictRate * 100).toFixed(2)}%`);
    console.log(`Anomaly rate:           ${(report.metrics.anomalyRate * 100).toFixed(2)}%`);
    console.log(`Coverage rate:          ${(report.metrics.coverageRate * 100).toFixed(1)}%`);
    console.log('');
    console.log('─'.repeat(70));
    console.log('ACCEPTANCE CRITERIA');
    console.log('─'.repeat(70));
    for (const check of criteria.details) {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}  ${check.criterion}: ${check.actual} (threshold: ${check.threshold})`);
    }
    console.log('');
    console.log(criteria.passed
      ? '✅ ALL CRITERIA PASSED - Ready for Apply LP approval'
      : '❌ CRITERIA NOT MET - Review required before Apply LP');
    console.log('');

    // Show sample candidates
    if (report.samples.wouldMigrate.length > 0) {
      console.log('─'.repeat(70));
      console.log('SAMPLE MIGRATION CANDIDATES (first 5)');
      console.log('─'.repeat(70));
      for (const s of report.samples.wouldMigrate.slice(0, 5)) {
        console.log(`  ID: ${s.id}`);
        console.log(`  MPN: ${s.productMpn}`);
        console.log(`  Text: ${s.textPreview}`);
        console.log(`  Derived: [${s.derivedTags.slice(0, 5).join(', ')}${s.derivedTags.length > 5 ? '...' : ''}]`);
        console.log(`  Confidence: ${(s.confidence * 100).toFixed(0)}%`);
        console.log('');
      }
    }

    // Write report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = customOutput || `/tmp/migrate-observations-tags.dryrun.${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('─'.repeat(70));
    console.log('REPORT WRITTEN');
    console.log('─'.repeat(70));
    console.log(`Report file: ${reportPath}`);
    console.log('');
    console.log('✅ DRY-RUN COMPLETE. No changes made to Firestore.');
    console.log('');
    console.log('Next steps for Apply LP:');
    console.log('  1. Review this report with Lisa');
    console.log('  2. If criteria passed, mark as ACCEPTED');
    console.log('  3. Create Firestore snapshot before apply');
    console.log('  4. Obtain approvals (Product, Platform, Data Gov, Release)');
    console.log('  5. Schedule maintenance window');
    console.log('  6. Execute Apply LP with production SA');

    return report;

  } catch (error) {
    console.error('');
    console.error('❌ ERROR during dry-run:', error.message);
    report.error = {
      message: error.message,
      stack: error.stack,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = customOutput || `/tmp/migrate-observations-tags.dryrun.${timestamp}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.error(`Report with error written to: ${reportPath}`);
    process.exit(1);
  }
}

// =============================================================================
// ENTRY POINT
// =============================================================================

runDryRunMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
