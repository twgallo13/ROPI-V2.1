# Export Manager — RetailOps CSV Workflow

# Export Manager — RetailOps CSV Workflow

(AOSS v1.0 Official Specification)

> **Related Specification:**
> 

> See [RetailOps CSV Field Mapping](RetailOps%20CSV%20Field%20Mapping%20348d1e671b7b407d984ec243a02981d1.md) for the complete AOSS → RetailOps column mapping.
> 

### Reference Index

The Export Manager relies on several core AOSS specifications. Use these links for deeper detail:

- ← Back to [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)
- [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)
    
    (Defines readiness rules, blocking logic, and `ready_for_export`)
    
- [Section 7 — Frontend & Launch Calendar](Section%207%20%E2%80%94%20Frontend%20&%20Launch%20Calendar%202b845ee1ec5a811d8d47ef14b3d0f46c.md)
    
    (Defines Export Manager UI, Export Readiness Indicator, and state transitions)
    
- [Section 6 — API Contracts & Integration (AOSS v1.0)](Section%206%20%E2%80%94%20API%20Contracts%20&%20Integration%20(AOSS%20v1%200%202b845ee1ec5a80c3baf0d2a9e415e0b5.md)
    
    (Defines export API endpoints and RO upload confirmation behavior)
    
- [RetailOps CSV Field Mapping](RetailOps%20CSV%20Field%20Mapping%20348d1e671b7b407d984ec243a02981d1.md)
    
    (Full header-to-field mapping for CSV generation)
    

---

## 1. Purpose of the Export Manager

The **Export Manager** is the AOSS module responsible for exporting completed product records into **RetailOps via CSV**.

RetailOps does not support API ingestion, so CSV export is the only integration path.

Export Manager ensures:

- Products are validated and complete before export
- CSV files follow RetailOps requirements
- Users can track and confirm manual uploads
- Export batches are auditable and replayable

This is a core operational workflow for merchandising, data, and e-commerce teams.

---

## 2. Export Manager Overview

The Export Manager lives under the route:

```
/export
```

It contains four submodules:

1. **Export Queue**
2. **Generate CSV (Batch Export)**
3. **Mark as Uploaded to RetailOps**
4. **Export History**

These components form the full export lifecycle.

---

## 3. Export Eligibility

A product is eligible for export when **all** of the following are TRUE:

- `statusFlags.validation_status === "valid"`
- `statusFlags.ready_for_export === true`
- `statusFlags.uploaded_to_ro !== true`

### Important Notes

- **Images are NOT part of export eligibility.**
    
    They are only relevant for Launch Calendar and internal presentation quality.
    
- Launch fields (launchDate, hype, VIP lists) do **not** affect export.
- Shipping overrides do **not** block export.

Export eligibility comes directly from **Workflow W2** and the **Export Readiness Indicator** in Section 7.

---

## 4. Submodule 1 — Export Queue

**Route:** `/export/queue`

Displays all products that are eligible for CSV export.

### Columns include:

- SKU / Style ID / Name
- Brand
- Department / Category
- Sites selected
- Completion Status
- Export Readiness summary
- Checkbox selection

### Actions:

- Select one or many products
- Generate CSV
- View or open product
- Filter by brand, category, website, readiness status

---

## 5. Submodule 2 — Generate RetailOps CSV

When the user selects products and clicks **Generate CSV**, AOSS:

1. Collects all required RetailOps fields
2. Normalizes fields using Import Engine rules (Sections 3.1 & 3.2)
3. Generates a CSV file ready for RetailOps ingestion
4. Downloads it to the user's machine

### File naming:

```
aoss_export_<YYYY-MM-DD>_<batchId>.csv
```

This action does **not** set uploaded status.

---

## 6. Submodule 3 — Mark as Uploaded to RO

**Route:** `/export/mark-uploaded`

After uploading the CSV into RetailOps manually, the user returns to AOSS.

### When the user selects products and confirms:

AOSS sets:

```json
statusFlags.uploaded_to_ro = true
statusFlags.ready_for_export = false
roUploadBatchId = "<uuid>"
roUploadDate = "<timestamp>"
```

This removes the product from future exports and logs upload history.

---

## 7. Submodule 4 — Export History

**Route:** `/export/history`

Shows past export batches, including:

- Batch ID
- Metadata (timestamp, user)
- Product count
- CSV download
- Product list per batch

This provides traceability and audit logs for compliance.

---

## 8. Export Schema Fields

These fields power the entire export lifecycle.

### In `statusFlags`:

```json
statusFlags.uploaded_to_ro     // boolean
statusFlags.ready_for_export   // boolean
statusFlags.validation_status  // "valid" | "has_errors" | "has_warnings"
```

### At root level:

```json
roUploadBatchId   // string
roUploadDate      // timestamp
```

These fields are updated by:

- Product Editor (W2)
- Export Manager
- Validation Engine

---

## 9. Backend Storage

Export batches are stored in:

```
export_batches/{batchId}
```

With fields:

```json
{
  "batchId": "...",
  "createdAt": "...",
  "createdBy": "...",
  "productIds": [...],
  "csvDownloadUrl": "..."
}
```

Products store references to this batch via:

- `roUploadBatchId`
- `roUploadDate`
- `uploaded_to_ro`

---

## 10. Relationship to Other Modules

### Product Editor (W2)

- Determines readiness
- No images required
- Sets `ready_for_export = true`

### Launch Calendar

- Does not affect export
- Images are relevant for **media quality**, not CSV workflows

### Import Engine

- Normalization rules also apply in reverse during CSV generation

### Smart Rules

- Blocking rules must be resolved before export
- Non-blocking rules appear as warnings only

### Observations

- Blocking Observations must be resolved or explicitly ignored

---

## 11. Future Enhancements (Reserved)

- Multi-site export templates
- RetailOps validation preview
- Post-upload monitoring
- Automated export windows

Reserved for AOSS v1.1+.

---

# End of Export Manager Documentation