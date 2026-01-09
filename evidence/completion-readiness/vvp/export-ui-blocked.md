# VVP: Export UI - Blocked State

**LP:** LP-completion-readiness-005  
**Feature:** Export readiness gate enforcement - blocked state  
**Verification Date:** YYYY-MM-DD  
**Verifier:** Homer  
**Result:** PENDING

## Objective
Verify that the Export UI correctly displays blocked state when catalog has incomplete products, shows operator explanation, and prevents export with 423 status.

## Prerequisites
- Catalog with at least one blocked product
- Admin access to Export page
- Staging environment
- Browser DevTools for API inspection

## Test Scenario: Blocked Catalog Export

### Initial State

**Catalog Summary:**
- Total products: _____
- Ready products: _____
- Blocked products: _____

**Blocking Product Example:**
- Product ID: _____
- Missing: _____

---

### Step 1: Navigate to Export Page

**Action:** Navigate to Admin → Export

**Expected Display:**
- ✅ Export readiness indicator shows "Blocked" or "Not Ready"
- ✅ Catalog completion percentage displayed (e.g., "85% complete")
- ✅ Blocked product count displayed
- ✅ Operator explanation visible and actionable
- ✅ Export button disabled or shows blocked state

**Actual Display:**
- [ ] Readiness indicator: _____
- [ ] Completion %: _____
- [ ] Blocked product count: _____
- [ ] Operator explanation: _____
- [ ] Export button state: _____

**Screenshot:**
`artifacts/LP-completion-readiness-005/screenshots/export-ui-blocked-main.png`

---

### Step 2: Verify Operator Explanation

**Expected Operator Explanation:**
```
Catalog is not ready for export. 5 products are incomplete and blocking export.

Conservative policy: ANY blocked product blocks the entire catalog export.

Actions:
• Review blocked products in the Product list
• Complete missing required attributes
• Re-check export readiness

Blocked products: [Link to filtered product list]
```

**Actual Operator Explanation:**
_____

**Screenshot:**
`artifacts/LP-completion-readiness-005/screenshots/export-ui-blocked-explanation.png`

---

### Step 3: API Verification - GET /api/admin/exports/readiness

**Request:**
```
GET /api/admin/exports/readiness
Authorization: Bearer {token}
```

**Expected Response:**
- Status: `423 Locked`
- Body:
```json
{
  "catalogReady": false,
  "catalogCompletionPct": 85,
  "blockedProductCount": 5,
  "totalProductCount": 100,
  "operatorExplanation": "Catalog is not ready for export. 5 products are incomplete and blocking export...",
  "conservativePolicy": true,
  "evaluatedAt": "2026-01-08T12:00:00Z"
}
```

**Actual Response:**
- Status: _____
- Body: _____

**Screenshot:**
`artifacts/LP-completion-readiness-005/screenshots/export-api-readiness-blocked.png`

---

### Step 4: API Verification - POST /api/admin/exports/dry-run

**Request:**
```
POST /api/admin/exports/dry-run
Authorization: Bearer {token}
Content-Type: application/json

{}
```

**Expected Response:**
- Status: `423 Locked`
- Body:
```json
{
  "readiness": {
    "catalogReady": false,
    "catalogCompletionPct": 85,
    "blockedProductCount": 5,
    "operatorExplanation": "..."
  },
  "message": "Export blocked due to incomplete products"
}
```

**Actual Response:**
- Status: _____
- Body: _____

**Screenshot:**
`artifacts/LP-completion-readiness-005/screenshots/export-api-dry-run-blocked.png`

---

### Step 5: Attempt Export Action

**Action:** Click Export button (if enabled) or observe disabled state

**Expected Behavior:**
- ✅ Button is disabled, OR
- ✅ Click shows error message with readiness info, OR
- ✅ API call returns 423 with readiness payload

**Actual Behavior:**
_____

**Screenshot:**
`artifacts/LP-completion-readiness-005/screenshots/export-ui-blocked-attempt.png`

---

## Verification Checklist

- [ ] Export UI displays "Blocked" or "Not Ready" state
- [ ] Catalog completion percentage displayed
- [ ] Blocked product count displayed
- [ ] Operator explanation actionable and clear
- [ ] Export button appropriately disabled or gated
- [ ] GET /api/admin/exports/readiness returns 423
- [ ] POST /api/admin/exports/dry-run returns 423
- [ ] Response payloads conform to CompletionDrivenExportReadiness
- [ ] Conservative policy (ANY blocked → catalog blocked) enforced

---

## Sign-Off

**Result:** PENDING / PASS / FAIL  
**Notes:**

**Approved By:** Homer  
**Date:** YYYY-MM-DD
