/**
 * RetailOps Export Command
 * 
 * Command: ropi retailops:export --from-json <jsonPath> [--out <csvPath>]
 * 
 * Reads a JSON file of CoreProduct objects and exports them to RetailOps CSV format.
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildRetailOpsCsv, type CoreProduct } from '@ropi-aoss/sdk';

export interface ExportOptions {
  fromJson: string;
  out?: string;
}

export async function runRetailopsExport(options: ExportOptions): Promise<void> {
  const { fromJson, out } = options;

  // Validate input file exists
  if (!fs.existsSync(fromJson)) {
    console.error(`❌ JSON file not found: ${fromJson}`);
    process.exit(1);
  }

  // Read JSON file
  let products: CoreProduct[];
  try {
    const json = fs.readFileSync(fromJson, 'utf-8');
    products = JSON.parse(json);

    // Validate it's an array
    if (!Array.isArray(products)) {
      throw new Error('JSON must be an array of CoreProduct objects');
    }

    // Basic validation that it looks like CoreProducts
    if (products.length > 0 && !('sku' in products[0])) {
      console.warn(`⚠️  Warning: JSON doesn't look like CoreProduct objects (missing 'sku' field)`);
    }
  } catch (error: any) {
    console.error(`❌ Error reading or parsing JSON file: ${error.message}`);
    process.exit(1);
  }

  // Build CSV
  let csv: string;
  try {
    csv = buildRetailOpsCsv(products);
  } catch (error: any) {
    console.error(`❌ Error building CSV: ${error.message}`);
    process.exit(1);
  }

  // Output to file or stdout
  if (out) {
    try {
      const outPath = path.resolve(out);
      fs.writeFileSync(outPath, csv);
      console.log(`✅ RetailOps CSV written to: ${outPath}`);
      console.log(`   Products exported: ${products.length}`);
    } catch (error: any) {
      console.error(`❌ Error writing CSV file: ${error.message}`);
      process.exit(1);
    }
  } else {
    // Print to stdout
    console.log(csv);
  }

  process.exit(0);
}
