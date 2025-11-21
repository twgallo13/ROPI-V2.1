#!/usr/bin/env node
/**
 * Validate that no importerColumns are duplicated across attributes
 * except where intentionally allowed (e.g., rics_color on rics_source.color only)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Attribute {
  key: string;
  canonicalPath: string;
  importerColumns: string[];
}

function main() {
  const registryPath = path.join(__dirname, 'attribute-registry-normalized.json');
  const registryContent = fs.readFileSync(registryPath, 'utf-8');
  const attributes: Attribute[] = JSON.parse(registryContent);
  
  // Build a map of importer column -> list of canonical paths
  const columnMap = new Map<string, string[]>();
  
  for (const attr of attributes) {
    for (const col of attr.importerColumns) {
      if (!columnMap.has(col)) {
        columnMap.set(col, []);
      }
      columnMap.get(col)!.push(attr.canonicalPath);
    }
  }
  
  // Find duplicates
  const duplicates: Array<{ column: string; paths: string[] }> = [];
  
  for (const [column, paths] of columnMap.entries()) {
    if (paths.length > 1) {
      duplicates.push({ column, paths });
    }
  }
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate importerColumns found!');
    process.exit(0);
  } else {
    console.log('❌ Found duplicate importerColumns:');
    console.log('');
    
    for (const dup of duplicates) {
      console.log(`Column: "${dup.column}"`);
      console.log(`  Used by: ${dup.paths.join(', ')}`);
      console.log('');
    }
    
    process.exit(1);
  }
}

main();
