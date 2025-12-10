# @ropi-aoss/cli

Ropi AOSS CLI — Command-line tools for managing product data imports/exports.

## Installation

```bash
pnpm install @ropi-aoss/cli
```

## Commands

### notion:export

Export Notion database to JSON.

```bash
ropi notion:export
```

Requires environment variables:
- `NOTION_API_KEY` — Your Notion integration token
- `NOTION_DATABASE_ID` — The Notion database ID to export

### retailops:import

Import RetailOps CSV file to CoreProducts JSON.

```bash
ropi retailops:import <csvPath> [--jsonOut <path>] [--detailsOut <path>]
```

**Arguments:**
- `<csvPath>` — Path to RetailOps CSV file (required)

**Options:**
- `--jsonOut <path>` — Write core products to JSON file
- `--detailsOut <path>` — Write import details (stats, skipped rows) to JSON file

**Examples:**

Import and write products to JSON:
```bash
ropi retailops:import data.csv --jsonOut products.json
```

Import with full details including skipped rows:
```bash
ropi retailops:import data.csv --jsonOut products.json --detailsOut details.json
```

Import and display summary (no file output):
```bash
ropi retailops:import data.csv
```

**Output Format:**

Summary is always printed to console:
```
✅ RetailOps Import Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total rows processed:  10
Core products created: 8
Skipped rows:          2

Skipped rows breakdown:
  Row 3: Non-NIKE brand (ADIDAS)
  Row 5: Non-NIKE brand (JORDAN)
```

JSON output (--jsonOut):
```json
[
  {
    "id": "prod-001",
    "sku": "NK-001",
    "brand": "NIKE",
    "category": "FOOTWEAR",
    ...
  }
]
```

Details output (--detailsOut):
```json
{
  "stats": {
    "totalRows": 10,
    "coreProducts": 8,
    "skipped": 2
  },
  "skipped": [
    {
      "rowNumber": 3,
      "reason": "Non-NIKE brand (ADIDAS)",
      "raw": { "SKU": "...", ... }
    }
  ],
  "coreProducts": [...]
}
```

### retailops:export

Export CoreProducts JSON to RetailOps CSV format.

```bash
ropi retailops:export --from-json <jsonPath> [--out <csvPath>]
```

**Options:**
- `--from-json <path>` — Read core products from JSON file (required)
- `--out <path>` — Write CSV to file (stdout if omitted)

**Examples:**

Export to file:
```bash
ropi retailops:export --from-json products.json --out output.csv
```

Export to stdout:
```bash
ropi retailops:export --from-json products.json
```

**Output Format:**

CSV with RetailOps field mapping:
```
SKU,Product Name,Brand,Description,Department,Category,Color,Size,MSRP,Cost,Retail Price,Currency,Quantity,Warehouse,First Received,Launch Date,Images,Primary Image
NK-001,Nike Air Max 270 - Black,NIKE,...
NK-002,Nike Running - White,NIKE,...
```

## Exit Codes

- `0` — Success
- `1` — Error (file not found, parse error, etc.)

## Development

Run tests:
```bash
pnpm --filter @ropi-aoss/cli test
```

Build:
```bash
pnpm --filter @ropi-aoss/cli build
```

## Related

- [@ropi-aoss/sdk](../sdk) — Core types and utilities
- [@ropi-aoss/api](../api) — REST API endpoints
