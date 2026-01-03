# Smart Rules Cleanup Recommendations

## Files to Keep (Documentation)
These files provide valuable audit trails and should be committed:

✅ **SMART_RULES_FINAL_AUDIT.md** - Comprehensive production audit with all fixes documented  
✅ **SMART_RULES_REMEDIATION_FINAL_SUMMARY.md** - Bug fix summary  
✅ **SMART_RULES_UI_FIXES.md** - UI-specific fixes  
✅ **EXPORT_GATE_IMPLEMENTATION_SUMMARY.md** - Export gate documentation  
✅ **EXPORT_GATE_ENFORCEMENT.md** - Export enforcement docs  
✅ **IMPLEMENTATION_COMPLETE_SUMMARY.md** - Overall implementation summary  
✅ **STEP3_COMPLETION_SUMMARY.md** - Phase 3 summary  
✅ **STEP4_IMPORT_ENGINE_FIX_SUMMARY.md** - Import engine fixes  
✅ **STEP4_VERIFICATION_GUIDE.md** - Verification guide  

## Files to Remove (Temporary Debug Scripts)
These were investigation/debug scripts and can be safely deleted:

❌ check_user_rule.js  
❌ check_user_rule_admin.js  
❌ debug_import_engine.js  
❌ debug_rule_matching.js  
❌ dump_test_rule.js  
❌ reproduce_test_console.js  
❌ step1_canonical_rule.js  
❌ step2_ui_fetch.js  
❌ step3_product_check.js  
❌ step4_server_eval.js  
❌ step6_test_console.js  
❌ svs_final_check.js  
❌ test_console_fix.js  
❌ test_engine_guardrail_verify.js  
❌ test_guardrail_integration.js  
❌ test_guardrail_integration.sh  
❌ test_import_pipeline.js  
❌ test_import_pipeline_partc.js  
❌ test_rule_payload.js  
❌ test_rule_server_validation.js  
❌ test_rule_server_validation.sh  
❌ test_rule_validation_deploy.sh  
❌ test_ui_requests.js  
❌ verify_part_a.js  
❌ verify_step3_testconsole.sh  

## Production Code (Keep)
All production code changes are essential and have been committed:

✅ packages/api/src/lib/smartEngineV2.ts - Core engine fixes  
✅ packages/api/src/functions/smartRulesCallables.ts - Apply function fixes  
✅ packages/api/src/lib/allowedTargetFields.ts - Whitelist dual format  
✅ packages/web/src/components/smartRules/RuleBuilder.tsx - UI fixes  
✅ packages/web/src/components/smartRules/RuleTestConsole.tsx - Test console  
✅ packages/web/src/services/smartRulesAdmin.ts - Admin service fixes  

## Test Files (Keep)
These are legitimate test files for export gate functionality:

✅ packages/api/src/controllers/ExportController.test.ts  
✅ packages/api/src/lib/export/ExportGateEnforcer.test.ts  

## Recommendation
Consider creating a `scripts/debug/` directory to archive debug scripts if needed for reference,
or simply delete them as the audit documents contain all necessary information.
