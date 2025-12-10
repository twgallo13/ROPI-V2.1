/**
 * RetailOps Import Command
 * 
 * Command: ropi retailops:import <csvPath> [--jsonOut <path>] [--detailsOut <path>]
 * 
 * Reads a RetailOps CSV file, parses it using the SDK helper,
 * and outputs summary and optional JSON files.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  retailOpsCsvToCoreProductsWithDetails,
  type CoreProduct,
} from '@ropi-aoss/sdk';

export interface ImportOptions {
  csvPath: string;
  jsonOut?: string;
  detailsOut?: string;
}

export async function runRetailopsImport(options: ImportOptions): Promise<void> {
  const { csvPath, jsonOut, detailsOut } = options;

  // Validate input file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // Read CSV file
  let csv: string;
  try {
    csv = fs.readFileSync(csvPath, 'utf-8');
  } catch (error: any) {
    console.error(`❌ Error reading CSV file: ${error.message}`);
    process.exit(1);
  }

  // Parse CSV and convert to CoreProducts
  let result;
  try {
    result = retailOpsCsvToCoreProductsWithDetails(csv);
  } catch (error: any) {
    console.error(`❌ Error parsing CSV: ${error.message}`);
    process.exit(1);
  }

  // Display summary
  console.log(`\n✅ RetailOps Import Summary`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total rows processed:  ${result.totalRows}`);
  console.log(`Core products created: ${result.products.length}`);
  console.log(`Skipped rows:          ${result.skipped.length}`);

  if (result.skipped.length > 0) {
    console.log(`\nSkipped rows breakdown:`);
    for (const skip of result.skipped) {
      console.log(`  Row ${skip.rowNumber}: ${skip.reason}`);
    }
  }

  // Write JSON output if requested
  if (jsonOut) {
    try {
      const jsonPath = path.resolve(jsonOut);
      fs.writeFileSync(jsonPath, JSON.stringify(result.products, null, 2));
      console.log(`\n✅ Core products JSON written to: ${jsonPath}`);
    } catch (error: any) {
      console.error(`❌ Error writing JSON output: ${error.message}`);
      process.exit(1);
    }
  }

  // Write details output if requested
  if (detailsOut) {
    try {
      const detailsPath = path.resolve(detailsOut);
      const details = {
        stats: {
          totalRows: result.totalRows,
          coreProducts: result.products.length,
          skipped: result.skipped.length,
        },
        skipped: result.skipped,
        coreProducts: result.products,
      };
      fs.writeFileSync(detailsPath, JSON.stringify(details, null, 2));
      console.log(`✅ Details JSON written to: ${detailsPath}`);
    } catch (error: any) {
      console.error(`❌ Error writing details output: ${error.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Import complete!`);
  process.exit(0);
}
