#!/usr/bin/env node
/**
 * ensure_test_rule.mjs
 *
 * Idempotently ensures the protected Smart Rule used by SVS exists:
 *   settings/smartRules/rules/test-autoapply-sampling
 *
 * Usage:
 *   node ensure_test_rule.mjs --apply
 *
 * Auth: GOOGLE_APPLICATION_CREDENTIALS or GCP_SA_KEY_BASE64
 */

import fs from 'fs';
import admin from 'firebase-admin';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Clean object utility - removes undefined values to prevent Firestore errors
 */
function cleanObject(obj) {
  if (obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject).filter(item => item !== undefined);
  if (obj && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      const cleanedValue = cleanObject(value);
      if (cleanedValue !== undefined) cleaned[key] = cleanedValue;
    }
    return cleaned;
  }
  return obj;
}

const argv = yargs(hideBin(process.argv))
  .option('apply', { type: 'boolean', default: false })
  .parseSync();

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

function initAdmin() {
  if (admin.apps.length) return;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    admin.initializeApp({ credential: admin.credential.cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
    return;
  }

  const keyObj = decodeSaKey();
  if (keyObj) {
    admin.initializeApp({ credential: admin.credential.cert(keyObj) });
    return;
  }

  throw new Error('No admin credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or GCP_SA_KEY_BASE64');
}

function makeTestRule() {
  return {
    name: "Test Auto-Apply: SAMPLING -> gender",
    description: "SVS protected test rule: if rics_category contains 'SAMPLING', set attributes.gender to \"Men's\" (auto-apply).",
    enabled: true,
    priority: 1000,
    createdBy: { uid: 'svs-system', name: 'svs' },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    conditions: [
      {
        source: 'attributes',
        field: 'attributes.rics_category',
        type: 'token',
        operator: 'contains',
        value: 'sampling',
      },
    ],
    actions: [
      {
        targetField: 'attributes.gender',
        valueTemplate: "Men's",
        autoApply: true,
        onlyIfEmpty: true,
      },
    ],
    meta: {
      testRule: true,
      protected: true,
      createdFor: 'svs',
    },
  };
}

async function upsertRule() {
  initAdmin();
  const db = admin.firestore();
  const docRef = db.collection('settings').doc('smartRules').collection('rules').doc('test-autoapply-sampling');
  const rule = makeTestRule();

  await docRef.set(rule, { merge: true });
  console.log('Upserted protected test rule at', docRef.path);

  const auditRef = db.collection('settings').doc('smartRules').collection('audit').doc();
  await auditRef.set(cleanObject({
    action: 'ensure_test_rule_upsert',
    ruleId: 'test-autoapply-sampling',
    after: rule,
    actor: 'ensure_test_rule.mjs',
    ts: admin.firestore.FieldValue.serverTimestamp(),
  }));
  console.log('Audit written:', auditRef.path);
}

if (argv.apply) {
  upsertRule()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  console.log('Dry-run: use --apply to upsert the protected test rule.');
  process.exit(0);
}
