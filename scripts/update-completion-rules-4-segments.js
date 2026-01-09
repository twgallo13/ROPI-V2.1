#!/usr/bin/env node
/**
 * Update Firestore completion rules to 4 segments with 25% weights each
 * - core-attributes (sku_core, classification) - 25%
 * - seo-attributes (description, seo) - 25%  
 * - media-attributes (media) - 25%
 * - technical-attributes (technical) - 25%
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  try {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'ropi-bccee'
    });
  } catch (e) {
    console.error('❌ service-account.json not found. Run from project root.');
    process.exit(1);
  }
}

const db = admin.firestore();

async function updateCompletionRules() {
  try {
    console.log('📝 Fetching current rules...');
    const settingsRef = db.doc('settings/exportSettings');
    const snapshot = await settingsRef.get();
    
    if (!snapshot.exists) {
      throw new Error('settings/exportSettings not found');
    }
    
    const data = snapshot.data();
    const oldRules = data.completionRules;
    
    // Save before state
    const beforePath = path.join(__dirname, '../inventory/LP-phase2b-002/evidence/completionRules_before_4segment.json');
    fs.mkdirSync(path.dirname(beforePath), { recursive: true });
    fs.writeFileSync(beforePath, JSON.stringify(oldRules, null, 2));
    console.log(`✅ Saved before state: ${beforePath}`);
    console.log(`   Current rulesVersion: ${oldRules.rulesVersion}`);
    console.log(`   Current segments: ${oldRules.segments.map(s => `${s.id}(${s.weightPct}%)`).join(', ')}`);
    
    // Create new 4-segment configuration
    const newRules = {
      schemaVersion: '1.0',
      rulesVersion: (oldRules.rulesVersion || 1) + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'binary-segment-semantics-option-a',
      exportUnlockThresholdPct: 80,
      segments: [
        {
          id: 'core-attributes',
          name: 'Core Product Attributes',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['sku_core', 'classification'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: []
          }
        },
        {
          id: 'seo-attributes',
          name: 'SEO & Marketing',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['description', 'seo'],
            requirementFlag: 'required_for_completion',
            siteAware: true,
            includeInternalOnly: false,
            excludeAttributeIds: []
          }
        },
        {
          id: 'media-attributes',
          name: 'Media & Images',
          enabled: true,
          weightPct: 25,
          ruleType: 'ANY_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['media'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: []
          }
        },
        {
          id: 'technical-attributes',
          name: 'Technical Specifications',
          enabled: true,
          weightPct: 25,
          ruleType: 'ALL_REQUIRED',
          appliesTo: {
            mode: 'ALL_PRODUCTS',
            sites: []
          },
          attributeSelector: {
            source: 'REGISTRY',
            categories: ['technical'],
            requirementFlag: 'required_for_completion',
            siteAware: false,
            includeInternalOnly: false,
            excludeAttributeIds: []
          }
        }
      ],
      builtInSegments: {
        'description-seo': {
          segmentId: 'seo-attributes',
          lockedSemantics: true
        }
      },
      exclusions: {
        media: {
          affectsCompletion: false,
          reason: 'Media attributes excluded by governance directive'
        },
        pricing: {
          affectsCompletion: false,
          reason: 'Pricing attributes excluded by governance directive'
        }
      }
    };
    
    // Verify weights sum to 100
    const totalWeight = newRules.segments
      .filter(s => s.enabled)
      .reduce((sum, s) => sum + s.weightPct, 0);
    
    if (Math.abs(totalWeight - 100) > 0.1) {
      throw new Error(`Total weight ${totalWeight}% does not equal 100%`);
    }
    
    console.log(`\n📊 New configuration:`);
    console.log(`   New rulesVersion: ${newRules.rulesVersion}`);
    console.log(`   Total weight: ${totalWeight}%`);
    console.log(`   Segments:`);
    newRules.segments.forEach(s => {
      console.log(`     - ${s.id} (${s.name}): ${s.weightPct}% enabled=${s.enabled}`);
    });
    
    // Save after state
    const afterPath = path.join(__dirname, '../inventory/LP-phase2b-002/evidence/completionRules_after_4segment.json');
    fs.writeFileSync(afterPath, JSON.stringify(newRules, null, 2));
    console.log(`\n✅ Saved after state: ${afterPath}`);
    
    // Update Firestore
    await settingsRef.update({
      completionRules: newRules
    });
    
    console.log('\n✅ Updated Firestore with 4-segment configuration');
    
    // Create changelog
    const changelog = {
      timestamp: new Date().toISOString(),
      operation: 'update_completion_rules_to_4_segments',
      oldRulesVersion: oldRules.rulesVersion,
      newRulesVersion: newRules.rulesVersion,
      reason: 'Binary segment semantics implementation (Option A) - 4 segments with equal 25% weights',
      changes: {
        segments: {
          removed: [],
          updated: ['core-attributes', 'seo-attributes'],
          added: ['media-attributes (enabled)', 'technical-attributes (enabled)'],
          weights: {
            old: oldRules.segments.map(s => `${s.id}=${s.weightPct}%`).join(', '),
            new: newRules.segments.map(s => `${s.id}=${s.weightPct}%`).join(', ')
          }
        }
      }
    };
    
    const changelogPath = path.join(__dirname, '../inventory/LP-phase2b-002/evidence/rulesVersion_4segment_changelog.json');
    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));
    console.log(`✅ Saved changelog: ${changelogPath}`);
    
    console.log('\n🎯 Completion rules update complete!');
    console.log('\n📋 What changed:');
    console.log('  - Added 4th segment: technical-attributes (25%)');
    console.log('  - All segments now equally weighted at 25% each');
    console.log('  - All segments use binary semantics: all-or-nothing scoring');
    console.log('  - Scoring formula: sum of (score × weight) / 100');
    console.log('    * 1 complete segment = 25% total');
    console.log('    * 2 complete segments = 50% total');
    console.log('    * 3 complete segments = 75% total');
    console.log('    * 4 complete segments = 100% total');
    console.log('\n✅ Test on staging: https://ropi-aoss-staging.web.app/products/14-test');
    console.log('  Expected: Product shows 25% (1 segment complete) instead of 80%\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

updateCompletionRules();
