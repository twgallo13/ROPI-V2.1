# UI Design Specification: GLOBAL Export Mode
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready

---

## 1. UX Requirements

### 1.1 Mode Detection
- Page loads → fetch `/api/admin/exports/config`
- Response: `{ "mode": "GLOBAL" | "SITE_SCOPED" }`
- Conditional UI rendering based on mode

### 1.2 GLOBAL Mode UI Changes

**ExportPage.tsx ([L169-189](packages/web/src/pages/ExportPage.tsx#L169-L189)):**
- **HIDE:** Website/site dropdown
- **SHOW:** "🌍 Global Export Mode" badge + "Product-level evaluation" help text
- **PRESERVE:** Format selector, Export button, completion gauge

**CompletionExportGatePanel.tsx ([L200-227](packages/web/src/components/product/CompletionExportGatePanel.tsx#L200-L227)):**
- **HIDE:** Per-site accordion (siteStatus array)
- **SHOW:** Product-level missing attributes list (from `productLevelReadiness.missingGlobalAttributes`)
- **PRESERVE:** Completion gauge, segment breakdown

---

## 2. Visual Design (Wireframes)

### 2.1 ExportPage - SITE_SCOPED Mode (Current)
```
┌─────────────────────────────────────────────┐
│ Export Manager                              │
├─────────────────────────────────────────────┤
│ Completion: 85%  [█████████████░░░░] 80%   │
│ Status: ✅ Ready for export                 │
│                                             │
│ Website:  [▼ ropi-web]    Format: [▼ CSV]  │
│                                             │
│ [Export Products]                           │
└─────────────────────────────────────────────┘
```

### 2.2 ExportPage - GLOBAL Mode (Target)
```
┌─────────────────────────────────────────────┐
│ Export Manager                              │
├─────────────────────────────────────────────┤
│ Completion: 85%  [█████████████░░░░] 80%   │
│ Status: ✅ Ready for export                 │
│                                             │
│ [🌍 Global Export Mode] Product-level eval │  ← NEW
│                                             │
│ Format: [▼ CSV]                             │  ← Website dropdown HIDDEN
│                                             │
│ [Export Products]                           │
└─────────────────────────────────────────────┘
```

### 2.3 CompletionExportGatePanel - GLOBAL Mode
```
┌─────────────────────────────────────────────┐
│ 🌍 Completion / Export (GLOBAL)             │  ← Mode indicator
├─────────────────────────────────────────────┤
│ Completion: 85%  [█████████████░░░░] 80%   │
│                                             │
│ Status: ✅ Ready for export                 │
│                                             │
│ Segment Breakdown:                          │
│ • Core Attributes: 100% ✅                  │
│ • Product Classification: 67% ⚠️            │
│   Missing: department                       │
│                                             │
│ Sites Evaluated: ropi-web, ropi-app         │  ← Info only, not blocking
└─────────────────────────────────────────────┘
```

**Key Difference:** No per-site accordion in GLOBAL mode (siteStatus empty array).

---

## 3. Component Specifications

### 3.1 ExportPage State Changes

**File:** [packages/web/src/pages/ExportPage.tsx](packages/web/src/pages/ExportPage.tsx)

**New State:**
```tsx
const [exportMode, setExportMode] = useState<'GLOBAL' | 'SITE_SCOPED' | null>(null);
const [modeLoading, setModeLoading] = useState(true);
```

**Conditional Rendering:**
```tsx
{exportMode === 'SITE_SCOPED' && (
  <label>Website: <select>...</select></label>
)}

{exportMode === 'GLOBAL' && (
  <div className="mode-indicator">
    <span className="badge badge-global">🌍 Global Export Mode</span>
    <span className="help-text">Product-level evaluation</span>
  </div>
)}
```

**CSS (New Styles):**
```css
.mode-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border-radius: 4px;
  margin-bottom: 12px;
}

.badge-global {
  background: #2196f3;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 12px;
}

.help-text {
  color: #666;
  font-size: 13px;
}
```

---

### 3.2 CompletionExportGatePanel Changes

**File:** [packages/web/src/components/product/CompletionExportGatePanel.tsx](packages/web/src/components/product/CompletionExportGatePanel.tsx)

**Conditional Site Accordion:**
```tsx
{/* Only show site accordion in SITE_SCOPED mode */}
{completion.mode === 'SITE_SCOPED' && siteStatus.length > 0 && (
  <div className="sites-section">
    <h4 className="section-title">Site Status</h4>
    {/* Existing per-site accordion code L200-227 */}
  </div>
)}

{/* Show product-level missing attributes in GLOBAL mode */}
{completion.mode === 'GLOBAL' && completion.productLevelReadiness && (
  <div className="global-missing-section">
    <h4 className="section-title">Missing Attributes (Product-Level)</h4>
    <ul className="missing-attrs-list">
      {completion.productLevelReadiness.missingGlobalAttributes.map(attr => (
        <li key={attr}>{attr}</li>
      ))}
    </ul>
    <div className="sites-evaluated-info">
      Evaluated across: {completion.productLevelReadiness.sitesEvaluated.join(', ')}
    </div>
  </div>
)}
```

---

## 4. Non-Developer QA Steps

### 4.1 SITE_SCOPED Mode Verification
1. Navigate to `https://staging.ropi.ai/export`
2. **Verify:** Website dropdown visible with options (ropi-web, ropi-app)
3. **Verify:** NO "Global Export Mode" badge visible
4. Select site "ropi-web" → Click Export
5. Open browser DevTools → Network tab
6. **Verify:** Export request body includes `{ "site": "ropi-web" }`

**Screenshot:** site-scoped-export-page.png (site dropdown visible)

---

### 4.2 GLOBAL Mode Verification

**Prerequisites:** Firestore config set to `mode: "GLOBAL"`
```javascript
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'GLOBAL' });
```

**QA Steps:**
1. Navigate to `https://staging.ropi.ai/export`
2. **Verify:** Website dropdown HIDDEN
3. **Verify:** "🌍 Global Export Mode" badge visible with help text
4. Click Export
5. Open browser DevTools → Network tab
6. **Verify:** Export request body has NO `site` field

**Screenshot:** global-export-page.png (site dropdown hidden, badge visible)

---

### 4.3 Product Detail Page (CompletionExportGatePanel)

**GLOBAL Mode:**
1. Navigate to `https://staging.ropi.ai/products/18`
2. Scroll to "Completion / Export" panel
3. **Verify:** NO per-site accordion visible
4. **Verify:** "Missing Attributes (Product-Level)" section shows global missing attrs
5. **Verify:** "Evaluated across: ropi-web, ropi-app" info text visible

**Screenshot:** global-completion-panel.png

---

## 5. Accessibility Requirements

- **Badge:** ARIA label "Export mode: Global"
- **Help Text:** Readable contrast ratio (4.5:1 minimum)
- **Mode Indicator:** Keyboard focusable (if interactive)
- **Dropdown Hidden:** Screen reader announces "Website selection not required in Global mode"

---

## 6. Fallback Behavior

**If mode detection fails:**
```tsx
useEffect(() => {
  async function fetchExportMode() {
    try {
      // ... fetch logic ...
    } catch (error) {
      console.error('Error fetching export mode:', error);
      setExportMode('SITE_SCOPED'); // ← SAFE DEFAULT
    }
  }
  fetchExportMode();
}, []);
```

**Rationale:** Fallback to SITE_SCOPED ensures existing UI always works.

---

## 7. Browser Testing Matrix

| Browser | Version | SITE_SCOPED | GLOBAL | Notes |
|---------|---------|-------------|--------|-------|
| Chrome | Latest | ✅ | ✅ | Primary |
| Firefox | Latest | ✅ | ✅ | Primary |
| Safari | Latest | ✅ | ✅ | macOS/iOS |
| Edge | Latest | ✅ | ✅ | Windows |

---

**Document Status:** ✅ Ready for Implementation  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** vvp-retailops-global.md
