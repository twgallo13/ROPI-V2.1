# HOMER LP-obs-studio-cleanup-1.6.5 AUDIT

## Lisa Plan (LP) Reference
- **LP Version**: LP-obs-studio-cleanup-1.6.5
- **Title**: Aggregated AI Candidate Generation Per Target Website
- **Date**: 2025-01-XX
- **Status**: IMPLEMENTED

## Summary

This LP implements aggregated AI candidate generation per target website, replacing the previous per-observation candidate display model. The system now produces one set of AI candidates per target (shiekh.com, karmaloop, mltd) using all observations and product attributes as input.

## Key Changes

### 1. Backend API (packages/api)

#### New Endpoints

**POST /api/products/:productId/describe**
- Multi-target aggregated describe endpoint
- Request body: `{ targets[], audience, tone, observations[], attributes{}, images[], options{} }`
- Response: `{ results: [{ target, candidates[], seo{}, meta{} }] }`
- Features:
  - Generates candidates per target using aggregated observations
  - SEO metadata per target (title, bullets)
  - Meta counts (observationsCount, tagsCount) per target
  - Backward compatible with `aggregate=false` option
  - Activity log entry added on describe

**POST /api/products/:productId/apply**
- Apply candidate/SEO to product
- Request body: `{ target, action, payload }`
- Actions: `description`, `seo`, `attribute`
- Activity log entry added on apply

#### Files Changed
- [describe.ts](packages/api/src/endpoints/describe.ts) - NEW: 508 lines
- [apiApp.ts](packages/api/src/apiApp.ts) - MODIFIED: Added imports and routes

### 2. Frontend Components (packages/web)

#### New Components

**TargetAccordion.tsx**
- Per-target accordion panel for AI candidates display
- Features:
  - Header with target name, status, tag count
  - "Generated using X observations and Y tags" footnote
  - "Show contributing observations" toggle
  - CandidateCard list
  - SEO preview area with Apply/Edit/Try Again
  - Undo toast (placeholder)

**CandidateCard.tsx**
- Individual candidate card component
- Features:
  - Display candidate text
  - Meta info (observations count, tags count)
  - Apply button (primary action)
  - Inline edit mode
  - Try Again button

**AIDescribeClient.ts**
- Client service for describe/apply API orchestration
- Methods: `describe()`, `apply()`, `getDefaultTargets()`, `formatTargetName()`
- Helper functions: `aggregateObservations()`

#### Modified Components

**AIActionsTab.tsx**
- Updated to use per-target aggregated model
- New state: `selectedTargets`, `targetResults`, `expandedTarget`, `targetStatuses`
- New handlers: `handleGenerateDescriptions` (refactored), `handleApplyCandidate`, `handleEditCandidate`, `handleTryAgain`, etc.
- New UI sections: Targets Row (target chips), Target Panels (TargetAccordion)
- Removed legacy per-observation generation helpers

#### Files Changed
- [TargetAccordion.tsx](packages/web/src/components/product/TargetAccordion.tsx) - NEW
- [TargetAccordion.css](packages/web/src/components/product/TargetAccordion.css) - NEW
- [CandidateCard.tsx](packages/web/src/components/product/CandidateCard.tsx) - NEW
- [CandidateCard.css](packages/web/src/components/product/CandidateCard.css) - NEW
- [AIDescribeClient.ts](packages/web/src/services/AIDescribeClient.ts) - NEW
- [AIActionsTab.tsx](packages/web/src/components/product/AIActionsTab.tsx) - MODIFIED
- [AIActionsTab.css](packages/web/src/components/product/AIActionsTab.css) - MODIFIED

### 3. Test Coverage

#### New Tests
- [describe.integration.test.ts](packages/api/src/endpoints/__tests__/describe.integration.test.ts)
  - 14 tests covering:
    - Input validation (missing targets, audience, tone)
    - Empty targets array validation
    - Product not found error
    - Valid request acceptance
    - Apply action validation (missing target, action, payload)
    - Invalid action validation
    - Valid action types (description, seo, attribute)

## API Contract

### Describe Request
```typescript
{
  targets: string[];           // ["shiekh.com", "karmaloop", "mltd"]
  audience: string;            // "Streetwear Enthusiast"
  tone: string;                // "Professional"
  observations: ObservationInput[];
  attributes: Record<string, unknown>;
  images?: ImageInput[];
  options?: {
    candidates?: number;       // Default: 3
    aggregate?: boolean;       // Default: true
  };
}
```

### Describe Response
```typescript
{
  results: [
    {
      target: string;
      candidates: [
        {
          id: string;
          text: string;
          meta: {
            observationsCount: number;
            tagsCount: number;
          };
        }
      ];
      seo: {
        title: string;
        bullets: string[];
      };
      meta: {
        observationsCount: number;
        tagsCount: number;
      };
    }
  ];
}
```

### Apply Request
```typescript
{
  target: string;              // "shiekh.com"
  action: "description" | "seo" | "attribute";
  payload: {
    candidateId?: string;
    text?: string;
    seo?: { title: string; bullets: string[] };
    attributeId?: string;
    value?: unknown;
  };
}
```

### Apply Response
```typescript
{
  success: boolean;
  productId: string;
  target: string;
  appliedAt: string;
  appliedBy: string;
}
```

## UI Behavior

1. **Target Selection**: Users select targets via chips in "Targets Row"
2. **Generation**: Single "Generate" action creates candidates for all selected targets
3. **Display**: Each target shows in collapsible TargetAccordion panel
4. **Per-Target Content**:
   - 3 candidate variations
   - SEO metadata (title + bullets)
   - Meta footnote (observation/tag counts)
   - Contributing observations (toggle)
5. **Actions**: Apply/Edit/Try Again per candidate and SEO section
6. **Activity Log**: All describe/apply actions logged to product document

## Backward Compatibility

- Setting `options.aggregate = false` enables legacy per-observation mode
- Existing `/products/:productId/suggestions` endpoint unchanged
- Existing `/products/:productId/apply-suggestion` endpoint unchanged

## Verification Checklist

- [x] TypeScript compiles without errors (packages/web)
- [x] TypeScript compiles without new errors (packages/api) 
- [x] Unit tests pass (14/14)
- [x] API routes registered correctly
- [x] New components created with CSS
- [x] AIActionsTab refactored for per-target model
- [x] Vitest setup updated for emulator auth mode
- [ ] E2E tests updated (pending)
- [ ] Manual browser testing (pending)

## Notes

1. The `IS_EMULATOR` check in auth.ts was causing test failures. Fixed by setting `NODE_ENV=test_emulator` in vitest.setup.unit.ts.

2. The describe endpoint currently uses placeholder description generation logic. In production, this would integrate with an AI service (e.g., OpenAI, Claude).

3. The undo feature in TargetAccordion is placeholder - `_lastApplied` state tracks applied items but undo logic not implemented.

## Related Files

- CONTRIBUTING.md
- packages/api/src/endpoints/describe.ts
- packages/api/src/apiApp.ts
- packages/web/src/components/product/AIActionsTab.tsx
- packages/web/src/components/product/TargetAccordion.tsx
- packages/web/src/components/product/CandidateCard.tsx
- packages/web/src/services/AIDescribeClient.ts

---

*Generated by Homer AI Assistant*
*LP-obs-studio-cleanup-1.6.5*
