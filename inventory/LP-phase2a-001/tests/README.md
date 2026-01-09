# LP-phase2a-001: Deterministic Test Vectors

## Overview

This directory contains 10 deterministic test vectors for completion engine verification.

## Test Vector Structure

Each test consists of:
- **Input**: `inputs/product-XXXX.json` - Product snapshot with deterministic seed
- **Expected Output**: `expected/product-XXXX.expected.json` - Expected completion evaluation result

## Deterministic Factors

All tests use:
- **Commit SHA**: `d5103ea` (initial implementation commit)
- **Random Seeds**: `12445` to `13445` (incremented by 100 per test)
- **Rules Version**: `1` (initial completion rules)
- **Snapshot Timestamp**: `2026-01-08T21:45:00Z`

## Test Scenarios

### Complete Products (Tests 1-3, 9)
- **Products**: product-0001, product-0002, product-0003, product-0009
- **Attributes**: Full attribute set (brand, category, color, size, gender, material, SKU)
- **Images**: 2 images
- **Description**: Complete description
- **Expected Completion**: 100%
- **Expected Status**: ready

### Partial Products (Tests 4-6, 10)
- **Products**: product-0004, product-0005, product-0006, product-0010
- **Attributes**: Partial attribute set (brand, category, color)
- **Images**: 1 image
- **Description**: Partial description
- **Expected Completion**: 60%
- **Expected Status**: partial

### Minimal Products (Tests 7-8)
- **Products**: product-0007, product-0008
- **Attributes**: Minimal attribute set (brand, category only)
- **Images**: None
- **Description**: Empty
- **Expected Completion**: 40%
- **Expected Status**: blocked

## Reproducibility

To reproduce these tests:

```bash
# For each test vector
node packages/engine/bin/evaluate.js \
  --input inventory/LP-phase2a-001/tests/inputs/product-XXXX.json \
  --out inventory/LP-phase2a-001/evidence/product-XXXX-output.json \
  --seed <seed_from_input>
```

Compare actual output with expected output:

```bash
diff inventory/LP-phase2a-001/evidence/product-XXXX-output.json \
     inventory/LP-phase2a-001/tests/expected/product-XXXX.expected.json
```

## Sample Check Format

Each test will be recorded in HES as:

```json
{
  "product_id": "product-0001",
  "input_snapshot_path": "inventory/LP-phase2a-001/tests/inputs/product-0001.json",
  "exact_command": "node packages/engine/bin/evaluate.js --input inventory/LP-phase2a-001/tests/inputs/product-0001.json --out inventory/LP-phase2a-001/evidence/product-0001-output.json --seed 12445",
  "expected_output_path": "inventory/LP-phase2a-001/tests/expected/product-0001.expected.json",
  "actual_output_path": "inventory/LP-phase2a-001/evidence/product-0001-output.json",
  "verdict": "PASS"
}
```

## Validation

All test vectors have been generated with:
- Deterministic seeds (no randomness)
- Fixed commit SHA
- Consistent timestamp
- Documented expected outputs

Tests cover:
- ✅ Complete products (100% completion)
- ✅ Partial products (60% completion)
- ✅ Minimal products (40% completion, blocked)
- ✅ Various attribute combinations
- ✅ Different image counts
- ✅ Different description states
