#!/usr/bin/env node
/**
 * create_test_smartrule.mjs
 *
 * Creates or updates a temporary test Smart Rule at:
 *   settings/smartRules/rules/test-autoapply-sampling
 *
 * Behavior:
 * - Condition: attributes.rics_category token contains "sampling" (case-insensitive)
 * - Action: set attributes.gender to "Men's" with autoApply: true
 *
 * Usage:
 *  - Provide GCP_SA_KEY_BASE64 as an environment variable (base64-encoded service account JSON),
 *    OR set GOOGLE_APPLICATION_CREDENTIALS to a local service account JSON file.
 *
 * Important: Run only in staging.
 */

import fs from 'fs';
import admin from 'firebase-admin';

function decodeSaKey() {
  const b64 = process.env.GCP_SA_KEY_BASE64;
  if (!b64) return null;
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    console.error('Failed to decode GCP_SA_KEY_BASE64:', err);
    throw err;
  }
}

async function initAdmin() {
  if (admin.apps && admin.apps.length > 0) {
    return;
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    admin.initializeApp({
      credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    });
    return;
  }

  const keyObj = decodeSaKey();
  if (keyObj) {
    admin.initializeApp({
      credential: admin.credential.cert(keyObj),
    });
    return;
  }

  throw new Error('No service account key found. Set GCP_SA_KEY_BASE64 env or GOOGLE_APPLICATION_CREDENTIALS');
}

function makeTestRule() {
  return {
    name: "Test Auto-Apply: SAMPLING -> gender",
    description: "Temporary test rule for SmartRules logging: if rics_category contains 'SAMPLING', set gender to \"Men's\" (auto-apply).",
    enabled: true,
    priority: 1000,
    createdBy: { uid: "system-test", name: "test-runner" },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    // conditions: a simple token/phrase condition on attributes.rics_category
    conditions: [
      {
        source: "attributes",
        field: "attributes.rics_category",
        type: "token",
        operator: "contains",
        value: "sampling" // lowercase token; engine should normalize tokens
      }
    ],
    actions: [
      {
        targetField: "attributes.gender",
        valueTemplate: "Men's",
        autoApply: true
      }
    ],
    meta: {
      testRule: true,
      createdFor: "smartrule-logging-test"
    }
  };
}

async function upsertRule() {
  await initAdmin();
  const db = admin.firestore();
  const rulesDocRef = db.collection('settings').doc('smartRules').collection('rules').doc('test-autoapply-sampling');

  const testRule = makeTestRule();

  // Upsert the rule (merge true to be idempotent)
  await rulesDocRef.set(testRule, { merge: true });
  console.log(`Upserted test rule at ${rulesDocRef.path}`);

  // Audit entry
  const auditRef = db.collection('settings').doc('smartRules').collection('audit').doc();
  await auditRef.set({
    action: 'upsert_test_rule',
    ruleId: 'test-autoapply-sampling',
    before: null,
    after: testRule,
    actor: 'create_test_smartrule.mjs',
    ts: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log('Audit written to', auditRef.path);
}

upsertRule()
  .then(() => {
    console.log('create_test_smartrule completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('create_test_smartrule error:', err);
    process.exit(1);
  });
