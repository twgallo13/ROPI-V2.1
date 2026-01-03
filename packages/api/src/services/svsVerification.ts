import * as admin from 'firebase-admin';
import { ensureProtectedTestRule } from './ensureTestRule';
import { getRegistrySyncStatus } from './registryBridge';
import { processImportWithSmartRules } from '../functions/smartRulesImport';
import type { ImportRow, Product } from '../lib/smartEngineV2';

export interface VerificationTrace {
  productId: string;
  applied: number;
  suggestions: number;
  changes?: Array<{ targetField: string; value: unknown }>;
  errors?: string[];
}

export interface VerificationSummary {
  runId: string;
  registryVersion?: string | null;
  evalCount: number;
  applyCount: number;
  errors: string[];
  traces: VerificationTrace[];
  actor: string;
  startedAt: admin.firestore.Timestamp | admin.firestore.FieldValue;
}

function buildImportRow(productId: string, data: admin.firestore.DocumentData): { normalized: Record<string, unknown>; source: ImportRow['source']; existing: Product } {
  const attributes = data.attributes || {};
  const normalized: Record<string, unknown> = {
    ...data.core,
    ...attributes,
  };

  const source: ImportRow['source'] = {
    rics: {
      category: attributes.rics_category || attributes.category || '',
      color: attributes.rics_color || attributes.color || '',
      shortDescription: attributes.rics_short_description || '',
      longDescription: attributes.rics_long_desc || '',
    },
  };

  const existing: Product = {
    mpn: productId,
    attributes,
    provenance: data.provenance || {},
    _smartRulesSkipUntil: data._smartRulesSkipUntil,
  } as Product;

  return { normalized, source, existing };
}

export async function runVerification(productIds: string[], actor: string): Promise<VerificationSummary> {
  const db = admin.firestore();
  await ensureProtectedTestRule();
  const syncStatus = await getRegistrySyncStatus();

  const runId = `svs-${Date.now()}`;
  const traces: VerificationTrace[] = [];
  const errors: string[] = [];
  let evalCount = 0;
  let applyCount = 0;

  for (const productId of productIds) {
    try {
      const doc = await db.collection('products').doc(productId).get();
      if (!doc.exists) {
        errors.push(`Product ${productId} not found`);
        continue;
      }
      const data = doc.data() || {};
      const { normalized, source, existing } = buildImportRow(productId, data);
      const result = await processImportWithSmartRules(productId, normalized, source, existing);

      const applied = result.autoApplied?.length || 0;
      const suggestions = result.suggestions?.length || 0;
      evalCount += suggestions;
      applyCount += applied;

      const changes = (result.autoApplied || []).map(a => ({
        targetField: a.targetField,
        value: a.value,
      }));

      const traceErrors = (result.errors || []).map(e => e.message || String(e));
      errors.push(...traceErrors);

      traces.push({
        productId,
        applied,
        suggestions,
        changes,
        errors: traceErrors.length ? traceErrors : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      traces.push({ productId, applied: 0, suggestions: 0, errors: [msg] });
    }
  }

  const summary: VerificationSummary = {
    runId,
    registryVersion: syncStatus.firestoreVersion || null,
    evalCount,
    applyCount,
    errors,
    traces,
    actor,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db
    .collection('settings')
    .doc('smartRules')
    .collection('verificationRuns')
    .doc(runId)
    .set(summary);

  return summary;
}

export async function getLatestVerificationRun() {
  const db = admin.firestore();
  const snap = await db
    .collection('settings')
    .doc('smartRules')
    .collection('verificationRuns')
    .orderBy('startedAt', 'desc')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data();
}
