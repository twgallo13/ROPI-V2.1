import * as admin from 'firebase-admin';
import { cleanObject } from '../lib/cleanObject';

const RULE_DOC_PATH = 'settings/smartRules/rules/test-autoapply-sampling';

function makeTestRule() {
  return {
    name: "Test Auto-Apply: SAMPLING -> gender",
    description: "SVS protected test rule for Smart Rules verification.",
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

export async function ensureProtectedTestRule(): Promise<void> {
  const db = admin.firestore();
  const docRef = db.doc(RULE_DOC_PATH);
  const rule = makeTestRule();
  await docRef.set(rule, { merge: true });

  const auditRef = db.collection('settings').doc('smartRules').collection('audit').doc();
  await auditRef.set(cleanObject({
    action: 'ensure_protected_test_rule',
    ruleId: 'test-autoapply-sampling',
    after: rule,
    actor: 'svs-system',
    ts: admin.firestore.FieldValue.serverTimestamp(),
  }));
}

export function getProtectedRulePath() {
  return RULE_DOC_PATH;
}
