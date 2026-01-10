# Evidence Inventory - LP-phase2b-003 Remediation

**Phase**: LP-phase2b-003 (Firestore Integration + Remediation)  
**Completed**: 2026-01-10T02:20:00Z  
**Status**: ✅ COMPLETE

## 5 Verification Artifacts

| # | File | Type | Size | Purpose |
|---|------|------|------|---------|
| 1 | `evaluator_status.json` | JSON | 910B | Evaluator registry source, attributes count, cache TTL |
| 2 | `admin_attr_fetch_name.json` | JSON | 781B | 'name' attribute with category=sku_core, persistence proof |
| 3 | `api_product_18-test_completion.json` | JSON | 1.7K | API response with segments, scores, missing attributes |
| 4 | `ui_console_network.log` | Text | 2.3K | Network trace: UI calls /api/products/{id}/completion |
| 5 | `sync_disabled_final.txt` | Text | 5.4K | Complete remediation summary & deployment status |

## Supporting Documentation

| File | Purpose | Size |
|------|---------|------|
| `LP-phase2b-003-REMEDIATION-COMPLETE.md` | Executive summary with all technical details | 7.2K |
| `sync_disabled.txt` | Initial remediation evidence (first deployment) | 2.7K |
| `INVENTORY.md` | This file |  |

## Code Changes

| File | Change | Impact |
|------|--------|--------|
| `packages/api/src/index.ts` | Added sync endpoint guard (403 SYNC_DISABLED) | Prevents accidental overwrites |
| `packages/api/src/tasks/syncAttributeRegistry.ts` | Non-destructive upsert + disabled auto-derivation | Preserves user edits |

## Deployment Status

```
✅ API rebuilt & deployed (2026-01-10T02:15:00Z)
✅ 15 Cloud Functions updated
✅ All functions deployed successfully
✅ No errors or failures
```

## Key Findings

### Root Causes (Fixed)
1. **syncAttributeRegistry destructive merge** → FIXED: Non-destructive upsert with field preservation
2. **Sync endpoint always enabled** → FIXED: Returns 403 by default (SYNC_ATTRIBUTE_REGISTRY_ENABLED=false)
3. **Auto-creation from products** → FIXED: Disabled unless ALLOW_DERIVE_FROM_PRODUCTS=true
4. **UI might cache evaluator output** → VERIFIED: UI reads from API only, no client-side caching

### Current Safe State
- Firestore is authoritative source for attributes
- Sync endpoint disabled by default
- User edits persist across sync cycles
- Evaluator refreshes from Firestore every 30s
- UI displays authoritative API response (no re-derivation)

## Verification Instructions

```bash
# 1. Check sync is disabled
curl -X POST https://us-central1-ropi-bccee.cloudfunctions.net/syncAttributeRegistry
# Expected: 403 SYNC_DISABLED

# 2. Check evaluator reads from Firestore
curl https://us-central1-ropi-bccee.cloudfunctions.net/api/products/18-test/completion \
  -H "Authorization: Bearer <token>" | jq '.operatorExplanation.completionBreakdown[0]'
# Expected: Core Identifiers segment with current evaluator score

# 3. Check UI makes API call
# Open browser, ProductEditorPage, inspect Network tab
# Filter: XHR, search: /completion
# Expected: GET /api/products/{id}/completion with 200 OK response
```

## Timeline

| Date | Event | Status |
|------|-------|--------|
| 2026-01-09 | LP-phase2b-002: Registry load fix deployed | ✅ COMPLETE |
| 2026-01-09 | LP-phase2b-003: Firestore integration deployed | ✅ COMPLETE |
| 2026-01-10 | Remediation: Pause sync, non-destructive upsert | ✅ COMPLETE |
| 2026-01-10 | Evidence artifacts collected | ✅ COMPLETE |

## Acceptance Sign-Off

User to verify:
- [ ] All 5 artifacts present and readable
- [ ] Evaluator status shows Firestore source
- [ ] 'name' attribute shows persistence
- [ ] API returns correct completion breakdown
- [ ] UI network log shows API call
- [ ] Sync endpoint returns 403 SYNC_DISABLED

---

**Prepared by**: Homer (GitHub Copilot)  
**For**: User LP-phase2b-003 Remediation Sign-Off
