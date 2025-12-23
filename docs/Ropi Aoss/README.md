# ROPI Smart Rules Engine

> Deterministic rule system for converting structured signals into reliable suggestions and safe auto-fills.

Based on **ROPI AOSS v1.0 — Section 4 (Smart Rules)**

## Overview

Smart Rules are the deterministic rule system that converts structured signals (RICS tokens, product attributes, observation AI outputs) into reliable suggestions and safe auto-fills. They are intentionally separate from free-form AI.

### Key Principles

- ✅ **Auditable** — All rules are logged and versioned
- ✅ **Testable** — Each rule can be tested in isolation
- ✅ **Safe** — No user field is silently overwritten
- ✅ **Versioned** — Rules support draft/publish workflow

## Installation

```bash
# From your functions directory
npm install @ropi/smart-rules

# Or with yarn
yarn add @ropi/smart-rules
```

## Quick Start

```typescript
import SmartRulesEngine, { CANONICAL_RULES } from '@ropi/smart-rules';

// Initialize engine with rules
const engine = new SmartRulesEngine(CANONICAL_RULES);

// Evaluate rules against a product
const product = {
  mpn: 'NK-AJ1-001',
  attributes: {},
  source: {
    rics: {
      category_tokens: ['mens', 'footwear', 'basketball'],
      color: 'Black/Red',
      shortDescription: 'Air Jordan 1 Retro High OG',
    },
  },
  observations: {
    ai_insights: 'lace-up closure, leather upper',
  },
  sku_core: {
    brand: 'Jordan',
  },
};

const result = await engine.evaluateRulesForProduct(product);

console.log(result.suggestions);
// [
//   { targetField: 'descriptive.gender', value: "Men's", confidence: 0.95, autoApply: true },
//   { targetField: 'descriptive.closureType', value: 'Lace-up', confidence: 0.9, autoApply: true },
//   ...
// ]
```

## API Reference

### SmartRulesEngine

The main engine class for evaluating rules.

```typescript
class SmartRulesEngine {
  constructor(rules?: SmartRule[]);
  
  // Load/update rules
  setRules(rules: SmartRule[]): void;
  getRules(): SmartRule[];
  
  // Evaluate all rules against a product
  evaluateRulesForProduct(product: Product): Promise<EngineResult>;
  
  // Test a single rule (for admin UI)
  testRule(rule: SmartRule, product: Product): TestRuleResponse;
  
  // Apply a suggestion to a product
  applySuggestion(product: Product, suggestion: Suggestion, appliedBy: string): ApplyResult;
}
```

### Condition Types

| matchType | Description | Example |
|-----------|-------------|---------|
| `equals` | Strict equality | `value: "Black"` |
| `contains` | Substring or array contains | `value: "Jordan"` |
| `regex` | Regular expression match | `value: "Air\\s+Jordan"` |
| `token` | Token matching with normalization | `value: ["mens", "basketball"]` |
| `in` | Source value in array | `value: ["Nike", "Jordan"]` |
| `exists` | Field exists (or not) | `value: true` |
| `range` | Numeric range | `value: { min: 0, max: 100 }` |
| `and` | All conditions must match | `value: [cond1, cond2]` |
| `or` | Any condition can match | `value: [cond1, cond2]` |
| `not` | Negate condition | `value: condition` |

### Template Helpers

Safe Handlebars helpers available in `valueTemplate`:

| Helper | Description | Example |
|--------|-------------|---------|
| `trim` | Remove whitespace | `{{trim value}}` |
| `substr` | Substring | `{{substr value 0 10}}` |
| `lower` | Lowercase | `{{lower value}}` |
| `upper` | Uppercase | `{{upper value}}` |
| `capitalize` | Capitalize first letter | `{{capitalize value}}` |
| `join` | Join array | `{{join array ", "}}` |
| `first` | First array element | `{{first array}}` |
| `contains` | Check array contains | `{{#if (contains arr "x")}}` |
| `firstMatch` | First matching token | `{{firstMatch tokens candidates}}` |
| `normalizeColor` | Normalize color name | `{{normalizeColor "BLK"}}` → "Black" |
| `normalizeName` | Clean product name | `{{normalizeName rawName}}` |

## Canonical Rules

The module includes 20 seed rules covering common scenarios:

| Rule ID | Purpose | Auto-Apply |
|---------|---------|------------|
| `sd_001` | Gender from RICS category | ✅ |
| `sd_002` | Age group from RICS category | ✅ |
| `sd_003` | Primary color from RICS | ✅ |
| `sd_004` | Department from RICS | ✅ |
| `sd_005` | Category/class mapping | ✅ |
| `sd_006` | Product name suggestion | ❌ |
| `sd_007` | Family sizing detection | ✅ |
| `sd_008` | Closure type from observations | ✅ |
| `sd_009` | Heel type from observations | ✅ |
| `sd_010` | Heel height mapping | ✅ |
| `sd_011` | Pattern from images | ✅ |
| `sd_012` | Material normalization | ✅ |
| `sd_013` | Fast fashion flag | ✅ |
| `sd_014` | Core product flag | ✅ |
| `sd_015` | Tax class mapping | ✅ |
| `sd_016` | Platform height mapping | ✅ |
| `sd_017` | Sports team to league | ✅ |
| `sd_018` | Color from image analysis | ✅ |
| `sd_019` | Duplicate suspect flag | ❌ |
| `sd_020` | Promotional eligibility | ✅ |

## Firebase Integration

### Cloud Function Example

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import SmartRulesEngine, { CANONICAL_RULES } from '@ropi/smart-rules';

const db = admin.firestore();

// Initialize engine (load rules from Firestore in production)
let engine: SmartRulesEngine;

async function getEngine(): Promise<SmartRulesEngine> {
  if (!engine) {
    const rulesSnapshot = await db.collection('settings/smartRules/rules').get();
    const rules = rulesSnapshot.docs.map(doc => doc.data() as SmartRule);
    engine = new SmartRulesEngine(rules.length > 0 ? rules : CANONICAL_RULES);
  }
  return engine;
}

// Trigger on product update
export const onProductUpdate = functions.firestore
  .document('products/{mpn}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return; // Deleted
    
    const product = change.after.data() as Product;
    const engine = await getEngine();
    
    const result = await engine.evaluateRulesForProduct(product);
    
    // Auto-apply safe suggestions
    const updates: Record<string, any> = {};
    
    for (const suggestion of result.autoApplied) {
      const applyResult = engine.applySuggestion(product, suggestion, 'system');
      if (applyResult.success && applyResult.updates) {
        Object.assign(updates, applyResult.updates);
      }
    }
    
    // Store suggestions for UI
    updates['_smartSuggestions'] = result.suggestions;
    updates['_smartConflicts'] = result.conflicts;
    
    if (Object.keys(updates).length > 0) {
      await change.after.ref.update(updates);
    }
  });

// HTTP endpoint to get suggestions
export const getProductSuggestions = functions.https.onCall(
  async (data: { mpn: string }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    
    const productDoc = await db.doc(`products/${data.mpn}`).get();
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Product not found');
    }
    
    const engine = await getEngine();
    const result = await engine.evaluateRulesForProduct(productDoc.data() as Product);
    
    return result;
  }
);

// HTTP endpoint to test a rule
export const testSmartRule = functions.https.onCall(
  async (data: { rule: SmartRule; productSample: Product }, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    
    // Check admin role
    const user = await admin.auth().getUser(context.auth.uid);
    if (user.customClaims?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin only');
    }
    
    const engine = await getEngine();
    return engine.testRule(data.rule, data.productSample);
  }
);
```

### Seeding Rules to Firestore

```typescript
import { CANONICAL_RULES, getRulesAsJSON } from '@ropi/smart-rules';

async function seedRules() {
  const batch = db.batch();
  
  for (const rule of CANONICAL_RULES) {
    const ref = db.doc(`settings/smartRules/rules/${rule.ruleId}`);
    batch.set(ref, {
      ...rule,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
  }
  
  await batch.commit();
  console.log(`Seeded ${CANONICAL_RULES.length} rules`);
}
```

## Safety & Security

### Auto-Apply Safety Checks

1. **Never overwrite user-edited fields** — Fields in `_userEditedFields` are protected
2. **Confidence threshold** — Auto-apply only when `confidence >= autoApplyConfidence`
3. **Empty fields only** — By default, only auto-fill null/undefined fields
4. **Allowed target fields** — Engine validates `targetField` against allowlist
5. **Activity logging** — All auto-applies are logged for audit

### Template Safety

- Only safe helpers are available (no arbitrary code execution)
- Templates run in a sandboxed environment
- HTML fields are sanitized before write

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- smartEngine.test.ts
```

## Project Structure

```
ropi-smart-rules/
├── src/
│   ├── index.ts           # Main exports
│   ├── smartEngine.ts     # Engine implementation
│   ├── canonicalRules.ts  # 20 seed rules
│   ├── types.ts           # TypeScript definitions
│   └── __tests__/         # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

1. Add new rules to `canonicalRules.ts`
2. Add tests for new functionality
3. Run `npm test` to verify
4. Update this README if adding new features

## License

Proprietary - Shiekh Shoes
