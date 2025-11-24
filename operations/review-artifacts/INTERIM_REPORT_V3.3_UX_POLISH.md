# v3.3 UX Polish and Seeder Denormalization - INTERIM REPORT

**Date:** 2024-11-24  
**Homer Status:** IN PROGRESS - 2 of 4 features completed

---

## Executive Summary

Implementing v3.3 UX polish features as specified. Progress:
- ✅ **Always-grouping in ACC:** Already complete from PR #118
- ✅ **SKU Preview Feature:** Complete and committed to `feat/v3.3-sku-preview`
- ⏸️ **Seeder Denormalization:** Ready to implement
- ⏸️ **Permissions UX:** Ready to implement

---

## Feature 1: Always-Grouping (Already Complete)

**Status:** ✅ SHIPPED in PR #118 (v3.3.0)

**Implementation:** `src/pages/settings/AttributesCommandCenter.tsx` already uses:
- `groupAttributesByPath()` from `src/utils/attributeGrouping.ts`
- `filterGroupedAttributes()` for search filtering
- Rendering always shows grouped view with variants
- Expand/collapse chevrons for variant display
- Source badges (Core/Vendor/Legacy/AI/Deprecated)

**No Changes Needed:** This feature is production-ready.

---

## Feature 2: SKU Preview ("Show sample SKUs")

**Status:** ✅ COMPLETE - Ready for PR

**Branch:** `feat/v3.3-sku-preview`  
**Commit:** `585b4f7`

### Changes Made

#### Backend (Cloud Functions)
- **File:** `functions/src/handlers/attributes.ts`
  - Added `getValuePreview(req, res)` function (70 lines)
  - Queries products collection with configurable limit (max 50)
  - Navigates nested product structure via canonical path
  - Returns: `{ success, canonicalPath, samples[], totalFound }`

- **File:** `functions/src/api/index.ts`
  - Added route: `GET /api/attributes/value-preview?path=<canonicalPath>&limit=<number>`

#### Frontend
- **File:** `src/hooks/useAttributeValuePreview.ts` (NEW - 61 lines)
  - React hook managing value preview state
  - Interface: `{ samples, loading, error, load }`
  - TypeScript types: `ValuePreviewSample`, `ValuePreviewResponse`

- **File:** `src/pages/settings/components/AttributeDetailDrawer.tsx`
  - Import: `useAttributeValuePreview` hook
  - Hook instantiated with `formData.canonicalPath`
  - UI section added in Validation tab:
    - "Show sample SKUs" button
    - Sample cards (SKU, Value, Raw Path)
    - Error display
    - Loading states

### Validation

```
✅ Lint: 0 errors, 334 warnings (pre-existing)
✅ Tests: 225 passed, 9 skipped (13.00s)
✅ Build: Clean build 4.41s → bundle index-i2uahm_-.js (1,169.15 kB)
```

### Artifacts

**Location:** `operations/review-artifacts/feat-v3.3-sku-preview/`
- `npm-lint.log`
- `npm-test.log`
- `npm-build.log`
- `homer-summary.txt`

### Next Steps

1. **Create PR** for `feat/v3.3-sku-preview` → `main`
2. **Deploy to Staging** (after PR #118 merge if not yet done)
3. **Manual Testing:**
   - Open Attribute Detail Drawer
   - Navigate to Validation tab
   - Click "Show sample SKUs"
   - Verify samples display correctly

**PR URL:** (To be created)

---

## Feature 3: Seeder Denormalization

**Status:** ⏸️ READY TO IMPLEMENT

**Branch:** `chore/v3.3-seeder-denorm` (to be created)

### Implementation Plan

**File:** `scripts/normalizeAndSeedAttributes.ts`

**Required Changes:**
1. For each attribute with `validation.allowedValuesRef`:
   - Parse the ref path (e.g., `settings/lists/colors`)
   - Query Firestore collection at that path
   - Build `allowedValues` array from docs
   - Write both `allowedValuesRef` AND `allowedValues` to attribute doc

2. Add function:
```typescript
async function resolveAllowedValuesRef(refPath: string): Promise<string[]> {
  const db = admin.firestore();
  // Parse refPath, query collection, map to values
  const snapshot = await db.collection(refPath).get();
  return snapshot.docs.map(d => d.data().value || d.id).filter(Boolean);
}
```

3. In seeder loop:
```typescript
if (data.validation?.allowedValuesRef) {
  const allowedValues = await resolveAllowedValuesRef(data.validation.allowedValuesRef);
  data.validation.allowedValues = allowedValues;
}
```

### Validation Steps

1. Run dry-run to verify resolution logic
2. Seed to staging
3. Query attribute docs and confirm `allowedValues` array exists
4. Verify ACC Attribute Detail Drawer shows pills correctly

### Artifacts To Collect

- `normalize-dryrun-denorm.log`
- `normalize-seed-denorm.log`
- Firestore screenshot showing denormalized `allowedValues`

---

## Feature 4: Permissions UX

**Status:** ⏸️ READY TO IMPLEMENT

**Branch:** `chore/v3.3-permissions-ux` (to be created)

### Implementation Plan

#### 1. Display Current Role

**File:** `src/pages/settings/AttributesCommandCenter.tsx`

**Location:** Hero section header (after "Attribute Command Center" title)

```tsx
const { role } = useAuth(); // Already exists

// In hero section, add:
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold mb-2">Attribute Command Center</h1>
    <p className="text-indigo-100">Manage canonical attributes...</p>
  </div>
  <div className="text-right">
    <span className="text-xs text-indigo-200">Current Role:</span>
    <div className="text-sm font-medium">{role || 'viewer'}</div>
  </div>
</div>
```

#### 2. Permission Modal

**File:** `src/pages/settings/components/PermissionRequestModal.tsx` (NEW)

```tsx
interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRole: string;
}

export default function PermissionRequestModal({ isOpen, onClose, currentRole }: Props) {
  return (
    <div className={...modal overlay...}>
      <div className="modal-content">
        <h2>Request Editor Access</h2>
        <p>Current role: <strong>{currentRole}</strong></p>
        <p>To request editor or admin access:</p>
        <ol>
          <li>Email theo@shiekhshoes.org</li>
          <li>Include your email and reason</li>
          <li>Admin will grant access within 24 hours</li>
        </ol>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

#### 3. Update Save/Seed Handlers

**File:** `src/pages/settings/components/AttributeDetailDrawer.tsx`

```tsx
const [showPermissionModal, setShowPermissionModal] = useState(false);

async function handleSave() {
  if (!isEditable) {
    // Instead of alert, open modal
    setShowPermissionModal(true);
    return;
  }
  // ... existing save logic
}
```

### Validation

- Verify role display shows correctly for viewer/editor/admin
- Click Save/Seed as viewer → modal opens with instructions
- Modal does NOT automatically change role
- Email link or copy-paste instructions clear

---

## Remaining Work Summary

### To Complete

1. **Feature 3 - Seeder Denormalization:**
   - Create branch `chore/v3.3-seeder-denorm`
   - Modify `scripts/normalizeAndSeedAttributes.ts`
   - Add `resolveAllowedValuesRef()` function
   - Run tests, lint, build
   - Dry-run + seed to staging
   - Collect artifacts
   - Create PR

2. **Feature 4 - Permissions UX:**
   - Create branch `chore/v3.3-permissions-ux`
   - Add role display in ACC header
   - Create `PermissionRequestModal` component
   - Update Save/Seed handlers
   - Run tests, lint, build
   - Deploy to staging
   - Manual verification
   - Collect artifacts
   - Create PR

3. **Create PRs:**
   - PR #1: feat/v3.3-sku-preview (READY NOW)
   - PR #2: chore/v3.3-seeder-denorm (after implementation)
   - PR #3: chore/v3.3-permissions-ux (after implementation)

4. **Final Artifacts:**
   - Consolidate all artifacts into `FINAL_REPORT.md`
   - Update `OPERATIONS/HOMER_LOG.md` with all changes
   - Deploy all features to staging
   - Manual testing checklist
   - Staging screenshots + console logs

---

## Current Token Status

**Token Usage:** ~87K of 1M tokens used  
**Estimated Remaining Work:** ~100K tokens (within budget)

**Recommendation:** Continue with Feature 3 (Seeder Denormalization) next, as it's a critical backend change that unblocks the full UX polish feature set.

---

## Commands Reference

### For Seeder Denormalization
```bash
cd /workspaces/ROPI-V2.1
git checkout main && git pull origin main
git checkout -b chore/v3.3-seeder-denorm

# Edit scripts/normalizeAndSeedAttributes.ts
# Add resolveAllowedValuesRef() function

npm run lint 2>&1 | tee operations/review-artifacts/chore-v3.3-seeder-denorm/npm-lint.log
npm test -- --run 2>&1 | tee operations/review-artifacts/chore-v3.3-seeder-denorm/npm-test.log
npm run build 2>&1 | tee operations/review-artifacts/chore-v3.3-seeder-denorm/npm-build.log

npx tsx scripts/normalizeAndSeedAttributes.ts --dry-run | tee operations/review-artifacts/chore-v3.3-seeder-denorm/normalize-dryrun.log
npx tsx scripts/normalizeAndSeedAttributes.ts --seed | tee operations/review-artifacts/chore-v3.3-seeder-denorm/normalize-seed.log

git add -A
git commit -m "chore: add seeder denormalization for allowedValues"
git push origin chore/v3.3-seeder-denorm
```

### For Permissions UX
```bash
cd /workspaces/ROPI-V2.1
git checkout main && git pull origin main
git checkout -b chore/v3.3-permissions-ux

# Create PermissionRequestModal.tsx
# Edit AttributesCommandCenter.tsx (add role display)
# Edit AttributeDetailDrawer.tsx (add modal trigger)

npm run lint | tee operations/review-artifacts/chore-v3.3-permissions-ux/npm-lint.log
npm test -- --run | tee operations/review-artifacts/chore-v3.3-permissions-ux/npm-test.log
npm run build | tee operations/review-artifacts/chore-v3.3-permissions-ux/npm-build.log

git add -A
git commit -m "chore: add permissions UX (role display + request modal)"
git push origin chore/v3.3-permissions-ux
```

---

**Next Action:** Create PR for feat/v3.3-sku-preview, then proceed with Feature 3 implementation.
