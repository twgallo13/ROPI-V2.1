#!/usr/bin/env node

/**
 * Deterministic Completion Evaluation CLI
 * 
 * Evaluates product completion using the deterministic evaluation engine.
 * Uses test vector format with static inputs and produces reproducible outputs.
 * 
 * Usage:
 *   node packages/engine/bin/evaluate.js --input <input.json> --out <output.json> --seed <seed>
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    input: null,
    out: null,
    seed: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      parsed.input = args[i + 1];
      i++;
    } else if (args[i] === '--out' && i + 1 < args.length) {
      parsed.out = args[i + 1];
      i++;
    } else if (args[i] === '--seed' && i + 1 < args.length) {
      parsed.seed = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return parsed;
}

// Deterministic evaluation function with binary segment semantics
function evaluateCompletionDeterministic(inputData, seed) {
  // Extract product data
  const productSnapshot = inputData.snapshot || inputData;
  const { id, attributes, images, description, price } = productSnapshot;
  
  // Use snapshot timestamp if available, otherwise current time
  const evaluationTimestamp = inputData.snapshot_timestamp || new Date().toISOString();
  
  // UPDATED: Binary segment semantics
  // Each segment is evaluated as:
  // - All required attributes present → status="complete", score=100
  // - Missing any required attribute → status="blocked", score=0
  // Then aggregate weighted scores for total completion
  
  // Get completion rules if provided
  const rules = inputData.rules || {};
  const segments = rules.segments || [];
  const attributeRegistry = inputData.attributeRegistry || {};
  
  // Build registry lookup by category
  const registryByCategory = {};
  if (attributeRegistry.attributes && Array.isArray(attributeRegistry.attributes)) {
    attributeRegistry.attributes.forEach(attr => {
      const cat = attr.category || 'uncategorized';
      if (!registryByCategory[cat]) {
        registryByCategory[cat] = [];
      }
      registryByCategory[cat].push(attr);
    });
  }
  
  // Evaluate each segment
  const evaluatedSegments = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  // Build complete attributes object from all sources
  const allAttrs = {};
  
  // Add all top-level fields from snapshot (direct attributes)
  if (productSnapshot && typeof productSnapshot === 'object') {
    for (const [key, value] of Object.entries(productSnapshot)) {
      if (key !== 'id' && key !== 'images' && key !== 'description' && key !== 'price' && key !== 'attributes') {
        allAttrs[key] = value;
      }
    }
  }
  
  // Also include any nested attributes object
  if (attributes && typeof attributes === 'object') {
    Object.assign(allAttrs, attributes);
  }
  
  for (const segment of segments) {
    if (!segment.enabled) {
      continue;
    }
    
    const segmentId = segment.id || 'unknown';
    const segmentName = segment.name || segmentId;
    const weight = segment.weightPct || 0;
    totalWeight += weight;
    
    let segmentStatus = 'complete';
    let segmentScore = 100;
    let missingAttributes = [];
    
    // Get attributes that should be in this segment
    const requiredAttrs = getSegmentRequiredAttributes(
      segment,
      registryByCategory,
      allAttrs
    );
    
    // Check if all required attributes are present and non-empty
    if (requiredAttrs.length > 0) {
      const missingAttrs = requiredAttrs.filter(attr => {
        const attrValue = allAttrs[attr];
        // Attribute is missing if: null, undefined, empty string, or false
        if (attrValue === null || attrValue === undefined) {
          return true;
        }
        if (typeof attrValue === 'string' && attrValue.trim() === '') {
          return true;
        }
        return false;
      });
      
      if (missingAttrs.length > 0) {
        segmentStatus = 'blocked';
        segmentScore = 0;
        missingAttributes = missingAttrs;
      }
    }
    
    evaluatedSegments.push({
      id: segmentId,
      name: segmentName,
      status: segmentStatus,
      score: segmentScore,
      weightPct: weight,
      requiredAttributes: requiredAttrs,
      missingAttributes,
      ruleType: segment.ruleType
    });
    
    totalWeightedScore += (segmentScore / 100) * weight;
  }
  
  // Fallback calculation if no rules provided (backwards compat)
  let totalCompletion = totalWeightedScore;
  if (evaluatedSegments.length === 0) {
    // Use legacy formula as fallback
    const attributeCount = attributes ? Object.keys(attributes).length : 0;
    const hasImages = images && Array.isArray(images) && images.length >= 1 ? 1 : 0;
    const hasDescription = description && description.length > 0 ? 1 : 0;
    
    const baseScore = 20;
    const attributePoints = attributeCount * 10;
    const contentItems = hasImages + hasDescription;
    const contentPoints = contentItems * 5;
    totalCompletion = Math.min(100, baseScore + attributePoints + contentPoints);
  }

  // Determine overall status based on completion percentage
  const threshold = 80;
  let status;
  let ready;
  let hasBlockingSites;
  let blockingReasons = [];
  
  if (totalCompletion >= threshold) {
    status = 'ready';
    ready = true;
    hasBlockingSites = false;
  } else if (totalCompletion > 40) {
    status = 'partial';
    ready = false;
    hasBlockingSites = false;
  } else {
    status = 'blocked';
    ready = false;
    hasBlockingSites = true;
    const blockedSegments = evaluatedSegments
      .filter(s => s.status === 'blocked')
      .map(s => `${s.name} (missing: ${s.missingAttributes.join(', ')})`)
      .join('; ');
    blockingReasons = blockedSegments ? [blockedSegments] : ['Insufficient attributes'];
  }

  return {
    product_id: id || 'unknown',
    input_snapshot: inputData.input_snapshot_path || 'provided',
    evaluation_timestamp: evaluationTimestamp,
    completion_result: {
      completionPct: Math.round(totalCompletion),
      status,
      ready,
      threshold,
      hasBlockingSites,
      blockingReasons,
      segments: evaluatedSegments,
      missingAttributes: evaluatedSegments.flatMap(s => s.missingAttributes)
    },
    deterministic_factors: {
      commit_sha: inputData.commit_sha || 'd5103ea',
      random_seed: seed || 0,
      rules_version: rules.rulesVersion || 1,
      evaluation_mode: 'BINARY_SEGMENT_SEMANTICS'
    }
  };
}

// Helper: Extract required attributes for a segment
function getSegmentRequiredAttributes(segment, registryByCategory, productAttributes) {
  const selector = segment.attributeSelector || {};
  const requiredAttributes = [];
  
  // Get attributes from specified categories
  if (selector.categories && Array.isArray(selector.categories)) {
    for (const category of selector.categories) {
      const categoryAttrs = registryByCategory[category] || [];
      const filtered = categoryAttrs.filter(attr => {
        // Check requirement flag
        if (selector.requirementFlag) {
          return attr[selector.requirementFlag] === true;
        }
        // Default: include all in category
        return true;
      });
      requiredAttributes.push(...filtered.map(a => a.attribute_id));
    }
  }
  
  // Add static attributes if specified
  if (selector.staticAttributeIds && Array.isArray(selector.staticAttributeIds)) {
    requiredAttributes.push(...selector.staticAttributeIds);
  }
  
  // Remove excluded attributes
  if (selector.excludeAttributeIds && Array.isArray(selector.excludeAttributeIds)) {
    return requiredAttributes.filter(a => !selector.excludeAttributeIds.includes(a));
  }
  
  return [...new Set(requiredAttributes)]; // deduplicate
}

// Main execution
function main() {
  const args = parseArgs();

  // Validate arguments
  if (!args.input) {
    console.error('Error: --input is required');
    process.exit(1);
  }
  if (!args.out) {
    console.error('Error: --out is required');
    process.exit(1);
  }
  if (args.seed === null) {
    console.error('Error: --seed is required');
    process.exit(1);
  }

  try {
    // Read input file
    const inputPath = path.resolve(process.cwd(), args.input);
    if (!fs.existsSync(inputPath)) {
      console.error(`Error: Input file not found: ${inputPath}`);
      process.exit(1);
    }

    const inputData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Add input snapshot path to the data
    inputData.input_snapshot_path = args.input;

    // Run evaluation
    const result = evaluateCompletionDeterministic(inputData, args.seed);

    // Ensure output directory exists
    const outputPath = path.resolve(process.cwd(), args.out);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');

    console.log(`✓ Evaluation complete`);
    console.log(`  Input: ${args.input}`);
    console.log(`  Output: ${args.out}`);
    console.log(`  Seed: ${args.seed}`);
    console.log(`  Completion: ${result.completion_result.completionPct}%`);
    console.log(`  Status: ${result.completion_result.status}`);
    console.log(`  Ready: ${result.completion_result.ready}`);

    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
