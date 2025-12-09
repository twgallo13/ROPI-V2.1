/**
 * Attribute Value Reconciliation API
 * 
 * Endpoints for managing attribute reconciliation jobs:
 * - Analyze products to find mismatched attribute values
 * - Generate mapping suggestions using fuzzy matching
 * - Apply approved mappings to update products
 * 
 * Homer v1.0.0 - Attribute Reconciliation
 */

import { Router } from 'express';
import admin from 'firebase-admin';

// Temporary local stubs until @ropi/sdk/normalizers/attributes is available
interface MappingSuggestion {
  sourceValue: string;
  suggestedValue: string | null;
  confidence: number;
}

function bestMatchAgainstAllowedValues(value: string, allowed: string[]): { match: string | null; score: number } {
  const normalized = value?.toLowerCase?.() || '';
  for (const candidate of allowed) {
    if (candidate.toLowerCase() === normalized) {
      return { match: candidate, score: 1 };
    }
  }
  return { match: null, score: 0 };
}

function generateMappingSuggestions(values: string[], allowed: string[]): MappingSuggestion[] {
  return values.map((v) => {
    const { match, score } = bestMatchAgainstAllowedValues(v, allowed);
    return {
      sourceValue: v,
      suggestedValue: match,
      confidence: score,
    };
  });
}

const router = Router();
const db = admin.firestore();

// ============================================================================
// Types
// ============================================================================

interface ReconciliationJob {
  jobId: string;
  attributeId: string;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Configuration
  minConfidence?: number;
  autoApply?: boolean;
  autoApplyThreshold?: number;
  
  // Results
  totalProducts?: number;
  totalDistinctValues?: number;
  suggestions?: MappingSuggestion[];
  appliedMappings?: Array<{ from: string; to: string }>;
  productsUpdated?: number;
  
  // Error info
  error?: string;
}

interface ReconciliationRequest {
  attributeId: string;
  minConfidence?: number;
  autoApply?: boolean;
  autoApplyThreshold?: number;
}

interface ApplyMappingRequest {
  attributeId: string;
  mappings: Array<{ from: string; to: string }>;
  dryRun?: boolean;
}

// ============================================================================
// POST /admin/reconcile-attributes/analyze
// Analyze products and generate mapping suggestions for an attribute
// ============================================================================

router.post('/analyze', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const {
      attributeId,
      minConfidence = 0.7,
      autoApply = false,
      autoApplyThreshold = 0.9,
    }: ReconciliationRequest = req.body;
    
    if (!attributeId) {
      return res.status(400).json({ error: 'attributeId is required' });
    }
    
    // Create job document
    const jobId = `reconcile_${attributeId}_${Date.now()}`;
    const job: ReconciliationJob = {
      jobId,
      attributeId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      minConfidence,
      autoApply,
      autoApplyThreshold,
    };
    
    await db.collection('reconciliation').doc(jobId).set(job);
    
    // Start analysis in background
    analyzeAttribute(jobId, attributeId, minConfidence, autoApply, autoApplyThreshold)
      .catch(err => {
        console.error(`[reconcileAttributes] Analysis failed for job ${jobId}:`, err);
        db.collection('reconciliation').doc(jobId).update({
          status: 'failed',
          error: err.message,
          updatedAt: new Date(),
        });
      });
    
    res.json({ jobId, status: 'pending' });
    
  } catch (error: unknown) {
    console.error('[reconcileAttributes] Analyze error:', error);
    res.status(500).json({ 
      error: 'Failed to start reconciliation analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// GET /admin/reconcile-attributes/:jobId
// Get reconciliation job status and results
// ============================================================================

router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const jobDoc = await db.collection('reconciliation').doc(jobId).get();
    
    if (!jobDoc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = jobDoc.data() as ReconciliationJob;
    res.json(job);
    
  } catch (error: unknown) {
    console.error('[reconcileAttributes] Get job error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch job',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// POST /admin/reconcile-attributes/apply
// Apply approved mappings to update products
// ============================================================================

router.post('/apply', async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const {
      attributeId,
      mappings,
      dryRun = false,
    }: ApplyMappingRequest = req.body;
    
    if (!attributeId || !mappings || !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'attributeId and mappings array are required' });
    }
    
    console.log(`[reconcileAttributes] Applying ${mappings.length} mappings for ${attributeId} (dryRun: ${dryRun})`);
    
    // Build mapping map
    const mappingMap = new Map<string, string>();
    mappings.forEach(m => mappingMap.set(m.from, m.to));
    
    // Query products that need updating
    let query: FirebaseFirestore.Query = db.collection('products');
    
    // First, scan products to find those with matching values
    const snapshot = await query.get();
    const productsToUpdate: Array<{ id: string; currentValue: unknown; newValue: string }> = [];
    
    for (const doc of snapshot.docs) {
      const product = doc.data();
      
      // Check top-level field
      const currentValue = product[attributeId];
      if (typeof currentValue === 'string' && mappingMap.has(currentValue)) {
        productsToUpdate.push({
          id: doc.id,
          currentValue,
          newValue: mappingMap.get(currentValue)!,
        });
        continue;
      }
      
      // Check attributes map
      const attrValue = product.attributes?.[attributeId];
      if (typeof attrValue === 'string' && mappingMap.has(attrValue)) {
        productsToUpdate.push({
          id: doc.id,
          currentValue: attrValue,
          newValue: mappingMap.get(attrValue)!,
        });
      }
    }
    
    console.log(`[reconcileAttributes] Found ${productsToUpdate.length} products to update`);
    
    if (dryRun) {
      return res.json({
        dryRun: true,
        productsToUpdate: productsToUpdate.length,
        preview: productsToUpdate.slice(0, 10),
      });
    }
    
    // Apply updates in batches
    const batchSize = 500;
    let updated = 0;
    
    for (let i = 0; i < productsToUpdate.length; i += batchSize) {
      const batch = db.batch();
      const chunk = productsToUpdate.slice(i, i + batchSize);
      
      for (const { id, newValue } of chunk) {
        const ref = db.collection('products').doc(id);
        batch.update(ref, {
          [attributeId]: newValue,
          [`attributes.${attributeId}`]: newValue,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      
      await batch.commit();
      updated += chunk.length;
      console.log(`[reconcileAttributes] Updated ${updated}/${productsToUpdate.length} products`);
    }
    
    res.json({
      success: true,
      productsUpdated: updated,
      mappingsApplied: mappings.length,
    });
    
  } catch (error: unknown) {
    console.error('[reconcileAttributes] Apply error:', error);
    res.status(500).json({ 
      error: 'Failed to apply mappings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// Background Analysis Function
// ============================================================================

async function analyzeAttribute(
  jobId: string,
  attributeId: string,
  minConfidence: number,
  autoApply: boolean,
  autoApplyThreshold: number
): Promise<void> {
  console.log(`[analyzeAttribute] Starting analysis for ${attributeId} (job: ${jobId})`);
  
  // Update status
  await db.collection('reconciliation').doc(jobId).update({
    status: 'analyzing',
    updatedAt: new Date(),
  });
  
  // 1. Get allowed values from attribute registry
  const attrDoc = await db.collection('settings').doc('attributes').collection('keys').doc(attributeId).get();
  
  if (!attrDoc.exists) {
    throw new Error(`Attribute ${attributeId} not found in registry`);
  }
  
  const attrData = attrDoc.data();
  const allowedValues: string[] = attrData?.allowed_values || [];
  
  if (allowedValues.length === 0) {
    throw new Error(`Attribute ${attributeId} has no allowed_values defined`);
  }
  
  console.log(`[analyzeAttribute] Found ${allowedValues.length} allowed values for ${attributeId}`);
  
  // 2. Scan products to collect distinct values
  const valueCounts = new Map<string, number>();
  const productsSnapshot = await db.collection('products').get();
  
  for (const doc of productsSnapshot.docs) {
    const product = doc.data();
    
    // Check top-level field
    let value = product[attributeId];
    
    // Fallback to attributes map
    if (!value) {
      value = product.attributes?.[attributeId];
    }
    
    if (value && typeof value === 'string') {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }
  }
  
  console.log(`[analyzeAttribute] Found ${valueCounts.size} distinct values across ${productsSnapshot.size} products`);
  
  // 3. Generate suggestions using fuzzy matching
  const valueCountsArray = Array.from(valueCounts.entries()).map(([value, count]) => ({
    value,
    count,
  }));
  
  const suggestions = generateMappingSuggestions(
    valueCountsArray,
    allowedValues,
    autoApplyThreshold
  );
  
  // Count auto-apply suggestions
  const autoApplySuggestions = suggestions.filter(s => s.autoApply);
  
  console.log(`[analyzeAttribute] Generated ${suggestions.length} suggestions, ${autoApplySuggestions.length} can auto-apply`);
  
  // 4. If autoApply is true, apply high-confidence mappings
  let appliedMappings: Array<{ from: string; to: string }> = [];
  let productsUpdated = 0;
  
  if (autoApply && autoApplySuggestions.length > 0) {
    console.log(`[analyzeAttribute] Auto-applying ${autoApplySuggestions.length} high-confidence mappings`);
    
    appliedMappings = autoApplySuggestions
      .filter(s => s.suggestedCanonical)
      .map(s => ({
        from: s.rawValue,
        to: s.suggestedCanonical!,
      }));
    
    // Apply mappings
    const mappingMap = new Map<string, string>();
    appliedMappings.forEach(m => mappingMap.set(m.from, m.to));
    
    const productsToUpdate: Array<{ id: string; newValue: string }> = [];
    
    for (const doc of productsSnapshot.docs) {
      const product = doc.data();
      
      // Check top-level
      let currentValue = product[attributeId];
      if (!currentValue) {
        currentValue = product.attributes?.[attributeId];
      }
      
      if (typeof currentValue === 'string' && mappingMap.has(currentValue)) {
        productsToUpdate.push({
          id: doc.id,
          newValue: mappingMap.get(currentValue)!,
        });
      }
    }
    
    // Update in batches
    const batchSize = 500;
    for (let i = 0; i < productsToUpdate.length; i += batchSize) {
      const batch = db.batch();
      const chunk = productsToUpdate.slice(i, i + batchSize);
      
      for (const { id, newValue } of chunk) {
        const ref = db.collection('products').doc(id);
        batch.update(ref, {
          [attributeId]: newValue,
          [`attributes.${attributeId}`]: newValue,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      
      await batch.commit();
      productsUpdated += chunk.length;
    }
    
    console.log(`[analyzeAttribute] Auto-applied ${appliedMappings.length} mappings to ${productsUpdated} products`);
  }
  
  // 5. Save results
  await db.collection('reconciliation').doc(jobId).update({
    status: 'completed',
    updatedAt: new Date(),
    totalProducts: productsSnapshot.size,
    totalDistinctValues: valueCounts.size,
    suggestions,
    appliedMappings,
    productsUpdated,
  });
  
  console.log(`[analyzeAttribute] Completed analysis for ${attributeId} (job: ${jobId})`);
}

export default router;
