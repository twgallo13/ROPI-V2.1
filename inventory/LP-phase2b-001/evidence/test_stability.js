#!/usr/bin/env node
/**
 * Stability Test: Run 3 identical evaluations and prove determinism
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runStabilityTest() {
  const mpns = ['19-test', '16-test', '15-test'];
  const runs = [];
  
  console.log('🔄 Stability Test: 3 Consecutive Identical Runs\n');
  
  for (let runNum = 1; runNum <= 3; runNum++) {
    console.log(`\n=== RUN ${runNum} ===`);
    const runData = {
      runNumber: runNum,
      timestamp: new Date().toISOString(),
      products: []
    };
    
    for (const mpn of mpns) {
      console.log(`  Evaluating ${mpn}...`);
      
      // Run evaluation
      const cmd = `node evaluate_completion.js ${mpn}`;
      const output = execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
      
      // Load result
      const resultPath = path.join(__dirname, `eval_expected_${mpn}.json`);
      const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
      
      // Calculate hash
      const hash = crypto.createHash('sha256')
        .update(JSON.stringify(result))
        .digest('hex');
      
      runData.products.push({
        mpn,
        completionPct: result.overallCompletionPct,
        rulesVersion: result.rulesVersion,
        hash: hash.substring(0, 16)
      });
      
      console.log(`    Completion: ${result.overallCompletionPct}% (hash: ${hash.substring(0, 16)})`);
    }
    
    runs.push(runData);
  }
  
  // Save all runs
  const outputPath = path.join(__dirname, 'stability_runs_after.json');
  fs.writeFileSync(outputPath, JSON.stringify(runs, null, 2));
  console.log(`\n✅ Saved runs: ${outputPath}`);
  
  // Verify equality
  console.log('\n📊 Equality Verification:');
  let allEqual = true;
  
  for (const mpn of mpns) {
    const hashes = runs.map(r => r.products.find(p => p.mpn === mpn).hash);
    const percentages = runs.map(r => r.products.find(p => p.mpn === mpn).completionPct);
    
    const hashesEqual = hashes.every(h => h === hashes[0]);
    const percentsEqual = percentages.every(p => p === percentages[0]);
    
    console.log(`  ${mpn}:`);
    console.log(`    Run 1: ${percentages[0]}% (${hashes[0]})`);
    console.log(`    Run 2: ${percentages[1]}% (${hashes[1]})`);
    console.log(`    Run 3: ${percentages[2]}% (${hashes[2]})`);
    console.log(`    Equal: ${hashesEqual && percentsEqual ? '✅ YES' : '❌ NO'}`);
    
    if (!hashesEqual || !percentsEqual) {
      allEqual = false;
    }
  }
  
  // Save proof
  const proof = {
    testDate: new Date().toISOString(),
    verdict: allEqual ? 'PASS' : 'FAIL',
    products: mpns.length,
    runs: runs.length,
    conclusion: allEqual 
      ? 'All 3 runs produced identical results for all products. Evaluator is deterministic.'
      : 'Runs produced different results. Non-determinism detected.',
    details: runs
  };
  
  const proofPath = path.join(__dirname, 'stability_equality_proof_after.txt');
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log(`\n✅ Saved proof: ${proofPath}`);
  
  if (allEqual) {
    console.log('\n✅ STABILITY TEST PASSED: All runs identical');
    process.exit(0);
  } else {
    console.log('\n❌ STABILITY TEST FAILED: Runs differ');
    process.exit(1);
  }
}

runStabilityTest();
