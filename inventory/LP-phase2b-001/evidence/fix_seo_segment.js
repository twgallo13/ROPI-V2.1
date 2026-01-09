#!/usr/bin/env node
/**
 * Fix SEO segment category mapping
 * Change from 'description' to 'descriptions_sites'
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  const serviceAccount = require('../../../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

async function fixSEOSegmentMapping() {
  try {
    console.log('Fetching current rules...');
    const settingsRef = db.doc('settings/exportSettings');
    const snapshot = await settingsRef.get();
    
    if (!snapshot.exists) {
      throw new Error('settings/exportSettings not found');
    }
    
    const data = snapshot.data();
    const rules = data.completionRules;
    
    // Save before state
    const beforePath = path.join(__dirname, 'completionRules_before_seo_fix.json');
    fs.writeFileSync(beforePath, JSON.stringify(rules, null, 2));
    console.log(`✅ Saved before state: ${beforePath}`);
    console.log(`   Current rulesVersion: ${rules.rulesVersion}`);
    
    // Find and fix SEO segment
    const seoSegment = rules.segments.find(s => 
      s.name === 'SEO & Marketing' || s.id === 'seo-attributes'
    );
    
    if (!seoSegment) {
      throw new Error('SEO segment not found');
    }
    
    console.log(`\nSEO Segment found: ${seoSegment.name}`);
    console.log(`  Current categories: ${JSON.stringify(seoSegment.attributeSelector.categories)}`);
    
    // Update the categories
    seoSegment.attributeSelector.categories = ['descriptions_sites', 'seo'];
    
    // Increment rules version
    rules.rulesVersion += 1;
    rules.updatedAt = new Date().toISOString();
    rules.updatedBy = 'homer-remediation-lp-phase2b-001';
    
    console.log(`\n  New categories: ${JSON.stringify(seoSegment.attributeSelector.categories)}`);
    console.log(`  New rulesVersion: ${rules.rulesVersion}`);
    
    // Save updated rules
    const afterPath = path.join(__dirname, 'completionRules_after_seo_fix.json');
    fs.writeFileSync(afterPath, JSON.stringify(rules, null, 2));
    console.log(`\n✅ Saved after state: ${afterPath}`);
    
    // Update Firestore
    await settingsRef.update({
      completionRules: rules
    });
    
    console.log('\n✅ Updated Firestore with new rules');
    
    // Save changelog
    const changelog = {
      timestamp: new Date().toISOString(),
      operation: 'fix_seo_segment_categories',
      oldRulesVersion: rules.rulesVersion - 1,
      newRulesVersion: rules.rulesVersion,
      changes: {
        segment: 'SEO & Marketing (seo-attributes)',
        field: 'attributeSelector.categories',
        oldValue: ['description'],
        newValue: ['descriptions_sites', 'seo'],
        reason: 'No attributes in registry have category="description". Changed to match actual registry categories.'
      }
    };
    
    const changelogPath = path.join(__dirname, 'rulesVersion_change_log.json');
    fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2));
    console.log(`✅ Saved changelog: ${changelogPath}`);
    
    console.log('\n🎯 SEO segment fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

fixSEOSegmentMapping();
