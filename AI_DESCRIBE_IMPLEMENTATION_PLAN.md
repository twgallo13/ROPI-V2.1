# AI Describe End-to-End Implementation Plan

**Goal**: Implement AI Describe end-to-end and admin settings, merge into aoss-main, deploy to staging (project ropi-bccee), and verify in UI.

**Feature Branch**: `feature/aoss-ai-describe`
**Base Branch**: `aoss-main`
**Target Project**: ropi-bccee (staging)

## Phase Overview

- [x] **Phase 1**: Setup & branches ✅
- [x] **Phase 2**: Backend implementation (Describe endpoint, Gemini integration, registry enforcement) ✅
- [ ] **Phase 3**: Admin UI (aiInput, AITemplate fields + Test Preview)
- [ ] **Phase 4**: Frontend (Tab 5 — AI Actions)
- [ ] **Phase 5**: Data migration & infra (aiInput backfill, secrets, indexes)
- [ ] **Phase 6**: QA / Integration tests in staging
- [ ] **Phase 7**: Cutover checklist & staging validation

## Phase 1: Setup & branches ✅

### Completed:
- ✅ Created feature branch: `feature/aoss-ai-describe`
- ✅ Base: aoss-main
- ✅ Implementation plan document created

### Project Board Setup (Next):
Create columns: To Do / In Progress / In Review / Staging / Done

### Issues to Create:
1. **BE**: Backend Describe endpoint implementation
2. **FE**: Frontend AI Actions Tab 5
3. **ADMIN**: Admin UI aiInput & AITemplate controls
4. **DATA**: Migration & infrastructure setup
5. **QA**: Integration tests & staging validation

### PR Rules:
- **Target**: aoss-main
- **Require**: 2 reviewers (Backend + Frontend), 1 QA signoff
- **Template**: Must include Acceptance Criteria and Staging Test checklist

---

## Phase 2: Backend Implementation

### Objectives:
- Implement `POST /api/products/:mpn/describe`
- Registry-only attributes, template selection, blocked responses
- Gemini call, logging, trace, matchedTemplate block
- Write AI Action Log entries

### Files to Add/Update:
```
packages/api/src/endpoints/describe.ts
packages/api/src/lib/geminiClient.ts
packages/api/src/lib/settingsHelpers.ts
packages/api/test/describe.test.ts
```

### Key Features:
- **Registry filtering**: Only attributes with `aiInput: true` or `aiUsage.includes('productDescriptions')`
- **Template matching**: Priority-based template selection with site fallback
- **Blocked responses**: 409 status when required attributes missing
- **Gemini integration**: Server-side API calls with proper error handling
- **Audit logging**: AI Action Log entries for all requests

### API Response Format:
```json
{
  "status": "ok",
  "result": {
    "site": "shiekh",
    "mpn": "MPN123",
    "candidates": [...],
    "matchedTemplate": "mens_footwear",
    "matchedTemplatePriority": 100,
    "matchedConditions": [...],
    "trace": {
      "model": "gemini-1.5-flash",
      "elapsedMs": 1250
    }
  }
}
```

### Error Responses:
```json
// 409 - Blocked (missing required attributes)
{
  "status": "blocked",
  "code": "BLOCKED_MISSING_REQUIRED_ATTRIBUTES",
  "missingAttributes": ["color", "size"],
  "message": "Describe is blocked due to missing required registry attributes."
}

// 404 - MPN not found
{
  "status": "error", 
  "message": "mpn not found"
}

// 500 - Internal error
{
  "status": "error",
  "code": "INTERNAL_ERROR", 
  "message": "..."
}
```

---

## Phase 3: Admin UI Implementation

### Tasks:
1. **AttributeEditor**: Add `aiInput` boolean in `settings/attributes/keys/{attributeId}`
2. **AITemplate Builder**: Add fields `priority`, `includeObservations`, `includeAttributeNotes`
3. **Test Product Preview**: Implement render-only preview with masking

### Admin Preview Endpoint:
```
GET /admin/ai/templates/{templateKey}/preview?mpn=...&includeObservations=true/false&includeAttributeNotes=true/false
```

### Preview Response:
```json
{
  "status": "ok",
  "preview": {
    "renderedPrompt": "...",
    "matchedConditions": [...],
    "contextAttributes": {...},
    "templateKey": "mens_footwear",
    "maskingApplied": true
  }
}
```

### Acceptance Criteria:
- Preview renders identical prompt to server (render-only, no LLM call)
- Respects admin-only masking & copy rules
- Writes audit event to Admin Action Log
- Read-only UI with copy/download actions

---

## Phase 4: Frontend Tab 5 Implementation

### Components:
```
src/components/product/AIActionsTab/
├── index.tsx              # Main tab component
├── SitePanel.tsx          # Per-site generation panel  
├── CandidateView.tsx      # Display generated candidates
├── PromptPreview.tsx      # Modal for prompt debugging
├── StatusChip.tsx         # Status indicators
└── AcceptActions.tsx      # Accept candidate controls
```

### Key Features:
- **Per-site panels**: Separate generation for each site
- **Status chips**: Show generation status (ready/blocked/generating/error)
- **Generate button**: Trigger describe API call
- **Candidate view**: Display and preview generated descriptions
- **Accept action**: Validate and save selected candidate
- **Prompt preview**: Debug modal showing matched template and conditions
- **Client filtering**: Filter attributes by registry rules before display

### Route Integration:
```
/product/:mpn/edit
└── Tab 5: AI Actions
```

### Error Handling:
- 409 Blocked: Show missing attributes with links to edit
- Rate limits: Show retry timer
- Network errors: Show retry button
- Validation errors: Highlight invalid fields before save

---

## Phase 5: Data Migration & Infrastructure

### Secrets Management:
```bash
# Add Gemini API key to Secret Manager
echo -n "YOUR_GEMINI_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# Grant access to service account
gcloud projects add-iam-policy-binding ropi-bccee \
  --member="serviceAccount:ropi-api@ropi-bccee.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Firestore Indexes:
```javascript
// Required index for MPN resolution
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION", 
  "fields": [
    { "fieldPath": "mpn", "order": "ASCENDING" }
  ]
}
```

### Backfill Script:
```javascript
// Set aiInput: true for eligible attributes
const registry = await loadRegistry();
const batch = firestore.batch();

Object.values(registry).forEach(attr => {
  if (attr.status === 'active' && 
      (attr.aiUsage?.includes('productDescriptions') || attr.manualAiInput)) {
    const ref = firestore.collection('registry').doc(attr.attribute_id);
    batch.update(ref, { aiInput: true });
  }
});

await batch.commit();
```

### Cloud Run Deployment:
```bash
gcloud run deploy ropi-api-staging \
  --image gcr.io/ropi-bccee/api:staging \
  --region=us-central1 \
  --update-env-vars=DEFAULT_AI_MODEL=gemini-1.5-flash \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --project=ropi-bccee
```

---

## Phase 6: QA & Staging Checks

### Smoke Tests:

#### 1. MPN Lookup Validation:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://staging-api.ropi.example.com/api/products/MPN123
```

#### 2. Happy Path Describe:
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://staging-api.ropi.example.com/api/products/MPN123/describe \
  -d '{"site":"shiekh","options":{"candidates":1}}'
```

#### 3. Blocked Response Test:
```bash
# Remove required attribute, expect 409 with missingAttributes
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://staging-api.ropi.example.com/api/products/INCOMPLETE_MPN/describe \
  -d '{"site":"shiekh"}'
```

#### 4. Admin Test Preview:
```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "https://staging-admin.ropi.example.com/admin/ai/templates/mens_footwear/preview?mpn=MPN123&includeObservations=false&includeAttributeNotes=false"
```

### UI Flow Tests:
1. **Admin UI**: Create/edit attributes with aiInput flag
2. **Admin UI**: Create/edit AI templates with all fields
3. **Admin UI**: Test Product Preview functionality
4. **Frontend**: Navigate to AI Actions tab
5. **Frontend**: Generate descriptions for multiple sites
6. **Frontend**: Preview prompts and debug matched templates
7. **Frontend**: Accept candidates and validate saves

### Observability Checks:
- [ ] Logs include `matchedTemplate`, `matchedTemplatePriority`, `matchedConditions`
- [ ] Trace includes `model` and `elapsedMs`
- [ ] AI Action Log entries created for all requests
- [ ] Admin Action Log entries for preview renders
- [ ] Error tracking for blocked/failed requests
- [ ] SLO dashboards configured for latency and error rate

---

## Phase 7: Cutover Checklist

### Pre-Production Checklist:
- [ ] Staging smoke tests green ✅
- [ ] Firestore backups completed
- [ ] `aiInput` backfill migration completed
- [ ] Secrets present in production Secret Manager
- [ ] Admin preview functionality verified
- [ ] SLO dashboards configured
- [ ] Rollback plan documented
- [ ] Feature flag ready (if applicable)

### Production Deployment:
1. Deploy backend with feature flag OFF
2. Run production backfill migration
3. Verify admin functionality
4. Enable feature flag for internal testing
5. Gradual rollout to user segments

---

## PR Template

**Title**: `feat(ai-describe): add describe endpoint, admin controls, and frontend AI Actions`

**Body**:
```markdown
This PR implements the AI Describe end-to-end PoC:

**Backend Changes:**
- POST /api/products/:mpn/describe (registry-only attributes, template matching, Gemini integration, blocked responses)
- Gemini client with proper error handling and rate limiting
- AI Action Log entries for audit trail

**Admin UI Changes:**  
- aiInput attribute flag in AttributeEditor
- AITemplate fields (priority, includeObservations, includeAttributeNotes)
- Test Product Preview (render-only with admin masking)

**Frontend Changes:**
- Tab 5 — AI Actions with per-site generation
- Prompt preview modal and matchedTemplate debug
- Accept candidate functionality with validation

**Data/Infrastructure:**
- aiInput backfill migration script
- Firestore indexes for MPN resolution
- Secret Manager integration for Gemini API key

## Acceptance Criteria:
- [x] Unit tests for registry filtering and blocked responses
- [x] Integration tests for Describe happy/blocked/error paths  
- [x] Staging smoke tests (MPN resolve, describe happy path, blocked path, admin preview)
- [x] Documentation updates (this plan + inline code docs)

## Staging Verification:
- Happy path: `curl -X POST .../api/products/MPN123/describe`
- Blocked path: `curl -X POST .../api/products/INCOMPLETE_MPN/describe` 
- Admin preview: `GET /admin/ai/templates/mens_footwear/preview?mpn=MPN123`
```

## Communication Protocol

### Status Reporting Format:
For each completed phase, report:
1. **PR link** (for backend, frontend, admin)
2. **Staging deploy URL and timestamp**
3. **Logs/curl output** for smoke tests (happy & blocked paths)
4. **Any errors/blockers** with exact error text and stack traces

### Escalation:
If blocked by permissions, missing secrets, index errors, or deployment issues:
1. Report immediately with exact error text
2. Include relevant logs and stack traces  
3. Tag @lisa for immediate triage

---

## Implementation Status

| Phase | Status | Owner | PR Link | Deploy Time | Notes |
|-------|--------|--------|---------|-------------|--------|
| 1. Setup | ✅ Complete | - | - | - | Feature branch created |
| 2. Backend | 🔄 In Progress | Homer | - | - | - |
| 3. Admin UI | 📋 To Do | - | - | - | - |
| 4. Frontend | 📋 To Do | - | - | - | - |
| 5. Data/Infra | 📋 To Do | - | - | - | - |
| 6. QA Tests | 📋 To Do | - | - | - | - |
| 7. Staging | 📋 To Do | - | - | - | - |

**Next Action**: Begin Phase 2 - Backend implementation starting with `describe.ts` endpoint