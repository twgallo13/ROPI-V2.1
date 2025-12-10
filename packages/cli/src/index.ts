#!/usr/bin/env node

/**
 * Ropi AOSS CLI Entry Point
 * 
 * Supports multiple commands:
 * - notion:export — Export Notion database to JSON
 * - retailops:import — Import RetailOps CSV to CoreProducts
 * - retailops:export — Export CoreProducts to RetailOps CSV
 */

import { runNotionExport } from './exportNotion';
import { runRetailopsImport, type ImportOptions } from './commands/retailopsImport';
import { runRetailopsExport, type ExportOptions } from './commands/retailopsExport';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const command = args[0];

  // Route to appropriate command
  if (command === 'notion:export') {
    try {
      await runNotionExport();
    } catch (error: any) {
      console.error('\n❌ Export failed:', error.message);
      process.exit(1);
    }
  } else if (command === 'retailops:import') {
    const csvPath = args[1];
    if (!csvPath) {
      console.error('❌ CSV path required: ropi retailops:import <csvPath> [--jsonOut <path>] [--detailsOut <path>]');
      process.exit(1);
    }

    const jsonOut = args.includes('--jsonOut') ? args[args.indexOf('--jsonOut') + 1] : undefined;
    const detailsOut = args.includes('--detailsOut') ? args[args.indexOf('--detailsOut') + 1] : undefined;

    try {
      await runRetailopsImport({ csvPath, jsonOut, detailsOut });
    } catch (error: any) {
      console.error('\n❌ Import failed:', error.message);
      process.exit(1);
    }
  } else if (command === 'retailops:export') {
    const fromJsonIdx = args.indexOf('--from-json');
    if (fromJsonIdx === -1) {
      console.error('❌ --from-json required: ropi retailops:export --from-json <jsonPath> [--out <csvPath>]');
      process.exit(1);
    }

    const fromJson = args[fromJsonIdx + 1];
    if (!fromJson) {
      console.error('❌ JSON path required after --from-json');
      process.exit(1);
    }

    const outIdx = args.indexOf('--out');
    const out = outIdx !== -1 ? args[outIdx + 1] : undefined;

    try {
      await runRetailopsExport({ fromJson, out });
    } catch (error: any) {
      console.error('\n❌ Export failed:', error.message);
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown command: ${command}`);
    printHelp();
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
Ropi AOSS CLI

USAGE:
  ropi <command> [options]

COMMANDS:
  notion:export
    Export Notion database to JSON
    Usage: ropi notion:export

  retailops:import <csvPath> [--jsonOut <path>] [--detailsOut <path>]
    Import RetailOps CSV to CoreProducts
    Usage: ropi retailops:import data.csv --jsonOut products.json --detailsOut details.json

  retailops:export --from-json <jsonPath> [--out <csvPath>]
    Export CoreProducts to RetailOps CSV
    Usage: ropi retailops:export --from-json products.json --out output.csv

OPTIONS:
  --jsonOut <path>     Write core products JSON to this path (import command)
  --detailsOut <path>  Write import details to this path (import command)
  --from-json <path>   Read core products from JSON (export command)
  --out <path>         Write CSV to this path (export command, stdout if omitted)
`);
}

main();
