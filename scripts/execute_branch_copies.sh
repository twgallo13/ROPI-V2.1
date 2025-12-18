#!/usr/bin/env bash
set -euo pipefail

# scripts/execute_branch_copies.sh
# This script will create new lisa/PVS-0.1.2 branches from existing branches and push them to origin.
# DO NOT RUN until Lisa approves and the appropriate PVS is assigned for each rename.

echo 'Creating branch lisa/PVS-0.1.2/from-origin from origin/origin'
git fetch origin origin:origin
git checkout -b lisa/PVS-0.1.2/from-origin origin/origin
git push origin lisa/PVS-0.1.2/from-origin

echo 'Creating branch lisa/PVS-0.1.2/from-aoss-main from origin/aoss-main'
git fetch origin aoss-main:aoss-main
git checkout -b lisa/PVS-0.1.2/from-aoss-main origin/aoss-main
git push origin lisa/PVS-0.1.2/from-aoss-main

echo 'Creating branch lisa/PVS-0.1.2/from-aoss-staging-integration from origin/aoss-staging-integration'
git fetch origin aoss-staging-integration:aoss-staging-integration
git checkout -b lisa/PVS-0.1.2/from-aoss-staging-integration origin/aoss-staging-integration
git push origin lisa/PVS-0.1.2/from-aoss-staging-integration

echo 'Creating branch lisa/PVS-0.1.2/from-archive-chore-add-secret-scan from origin/archive/chore/add-secret-scan'
git fetch origin archive/chore/add-secret-scan:archive/chore/add-secret-scan
git checkout -b lisa/PVS-0.1.2/from-archive-chore-add-secret-scan origin/archive/chore/add-secret-scan
git push origin lisa/PVS-0.1.2/from-archive-chore-add-secret-scan

echo 'Creating branch lisa/PVS-0.1.2/from-archive-feature-importer-dynamic-v2-2 from origin/archive/feature/importer-dynamic-v2.2'
git fetch origin archive/feature/importer-dynamic-v2.2:archive/feature/importer-dynamic-v2.2
git checkout -b lisa/PVS-0.1.2/from-archive-feature-importer-dynamic-v2-2 origin/archive/feature/importer-dynamic-v2.2
git push origin lisa/PVS-0.1.2/from-archive-feature-importer-dynamic-v2-2

echo 'Creating branch lisa/PVS-0.1.2/from-archive-fix-v3-3-test-descriptionpanel from origin/archive/fix/v3.3-test-descriptionpanel'
git fetch origin archive/fix/v3.3-test-descriptionpanel:archive/fix/v3.3-test-descriptionpanel
git checkout -b lisa/PVS-0.1.2/from-archive-fix-v3-3-test-descriptionpanel origin/archive/fix/v3.3-test-descriptionpanel
git push origin lisa/PVS-0.1.2/from-archive-fix-v3-3-test-descriptionpanel

echo 'Creating branch lisa/PVS-0.1.2/from-archive-fix-v3-3-tolower-guards from origin/archive/fix/v3.3-tolower-guards'
git fetch origin archive/fix/v3.3-tolower-guards:archive/fix/v3.3-tolower-guards
git checkout -b lisa/PVS-0.1.2/from-archive-fix-v3-3-tolower-guards origin/archive/fix/v3.3-tolower-guards
git push origin lisa/PVS-0.1.2/from-archive-fix-v3-3-tolower-guards

echo 'Creating branch lisa/PVS-0.1.2/from-archive-fix-v3-3-types-attribute-detail from origin/archive/fix/v3.3-types-attribute-detail'
git fetch origin archive/fix/v3.3-types-attribute-detail:archive/fix/v3.3-types-attribute-detail
git checkout -b lisa/PVS-0.1.2/from-archive-fix-v3-3-types-attribute-detail origin/archive/fix/v3.3-types-attribute-detail
git push origin lisa/PVS-0.1.2/from-archive-fix-v3-3-types-attribute-detail

echo 'Creating branch lisa/PVS-0.1.2/from-archive-fix-v3-3-ux-values-search-save from origin/archive/fix/v3.3-ux-values-search-save'
git fetch origin archive/fix/v3.3-ux-values-search-save:archive/fix/v3.3-ux-values-search-save
git checkout -b lisa/PVS-0.1.2/from-archive-fix-v3-3-ux-values-search-save origin/archive/fix/v3.3-ux-values-search-save
git push origin lisa/PVS-0.1.2/from-archive-fix-v3-3-ux-values-search-save

echo 'Creating branch lisa/PVS-0.1.2/from-archive-main from origin/archive/main'
git fetch origin archive/main:archive/main
git checkout -b lisa/PVS-0.1.2/from-archive-main origin/archive/main
git push origin lisa/PVS-0.1.2/from-archive-main

echo 'Creating branch lisa/PVS-0.1.2/pr256-report-attribute-inspection-staging-unkn from origin/chore/attribute-inspection-20251210'
git fetch origin chore/attribute-inspection-20251210:chore/attribute-inspection-20251210
git checkout -b lisa/PVS-0.1.2/pr256-report-attribute-inspection-staging-unkn origin/chore/attribute-inspection-20251210
git push origin lisa/PVS-0.1.2/pr256-report-attribute-inspection-staging-unkn

echo 'Creating branch lisa/PVS-0.1.2/from-chore-ci-seed-emulator from origin/chore/ci-seed-emulator'
git fetch origin chore/ci-seed-emulator:chore/ci-seed-emulator
git checkout -b lisa/PVS-0.1.2/from-chore-ci-seed-emulator origin/chore/ci-seed-emulator
git push origin lisa/PVS-0.1.2/from-chore-ci-seed-emulator

echo 'Creating branch lisa/PVS-0.1.2/pr223-ci-increase-e2e-timeout-to-60min-tempora from origin/chore/e2e-timeout-60'
git fetch origin chore/e2e-timeout-60:chore/e2e-timeout-60
git checkout -b lisa/PVS-0.1.2/pr223-ci-increase-e2e-timeout-to-60min-tempora origin/chore/e2e-timeout-60
git push origin lisa/PVS-0.1.2/pr223-ci-increase-e2e-timeout-to-60min-tempora

echo 'Creating branch lisa/PVS-0.1.2/pr226-ci-increase-e2e-timeout-to-60min-tempora from origin/chore/e2e-timeout-60-v2'
git fetch origin chore/e2e-timeout-60-v2:chore/e2e-timeout-60-v2
git checkout -b lisa/PVS-0.1.2/pr226-ci-increase-e2e-timeout-to-60min-tempora origin/chore/e2e-timeout-60-v2
git push origin lisa/PVS-0.1.2/pr226-ci-increase-e2e-timeout-to-60min-tempora

echo 'Creating branch lisa/PVS-0.1.2/from-chore-fix-deploy-public-path-v1-0 from origin/chore/fix-deploy-public-path-v1-0'
git fetch origin chore/fix-deploy-public-path-v1-0:chore/fix-deploy-public-path-v1-0
git checkout -b lisa/PVS-0.1.2/from-chore-fix-deploy-public-path-v1-0 origin/chore/fix-deploy-public-path-v1-0
git push origin lisa/PVS-0.1.2/from-chore-fix-deploy-public-path-v1-0

echo 'Creating branch lisa/PVS-0.1.2/from-chore-staging-verify-workflow-2025-12-10 from origin/chore/staging-verify-workflow-2025-12-10'
git fetch origin chore/staging-verify-workflow-2025-12-10:chore/staging-verify-workflow-2025-12-10
git checkout -b lisa/PVS-0.1.2/from-chore-staging-verify-workflow-2025-12-10 origin/chore/staging-verify-workflow-2025-12-10
git push origin lisa/PVS-0.1.2/from-chore-staging-verify-workflow-2025-12-10

echo 'Creating branch lisa/PVS-0.1.2/from-ci-api-emulator-tests from origin/ci/api-emulator-tests'
git fetch origin ci/api-emulator-tests:ci/api-emulator-tests
git checkout -b lisa/PVS-0.1.2/from-ci-api-emulator-tests origin/ci/api-emulator-tests
git push origin lisa/PVS-0.1.2/from-ci-api-emulator-tests

echo 'Creating branch lisa/PVS-0.1.2/from-ci-e2e-monitoring-prompt-018c-vc from origin/ci/e2e-monitoring_PROMPT_018C_vC'
git fetch origin ci/e2e-monitoring_PROMPT_018C_vC:ci/e2e-monitoring_PROMPT_018C_vC
git checkout -b lisa/PVS-0.1.2/from-ci-e2e-monitoring-prompt-018c-vc origin/ci/e2e-monitoring_PROMPT_018C_vC
git push origin lisa/PVS-0.1.2/from-ci-e2e-monitoring-prompt-018c-vc

echo 'Creating branch lisa/PVS-0.1.2/pr220-feat-admin-smartrules-aitemplate-persist from origin/feature/admin/settings-smartrules'
git fetch origin feature/admin/settings-smartrules:feature/admin/settings-smartrules
git checkout -b lisa/PVS-0.1.2/pr220-feat-admin-smartrules-aitemplate-persist origin/feature/admin/settings-smartrules
git push origin lisa/PVS-0.1.2/pr220-feat-admin-smartrules-aitemplate-persist

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-firestore-rules-v1-0 from origin/feature/aoss-firestore-rules-v1-0'
git fetch origin feature/aoss-firestore-rules-v1-0:feature/aoss-firestore-rules-v1-0
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-firestore-rules-v1-0 origin/feature/aoss-firestore-rules-v1-0
git push origin lisa/PVS-0.1.2/from-feature-aoss-firestore-rules-v1-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-frontend-nav-v1-0 from origin/feature/aoss-frontend-nav-v1-0'
git fetch origin feature/aoss-frontend-nav-v1-0:feature/aoss-frontend-nav-v1-0
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-frontend-nav-v1-0 origin/feature/aoss-frontend-nav-v1-0
git push origin lisa/PVS-0.1.2/from-feature-aoss-frontend-nav-v1-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-iam-launchsignup-prompt-018 from origin/feature/aoss-iam-launchsignup_PROMPT_018C_vB'
git fetch origin feature/aoss-iam-launchsignup_PROMPT_018C_vB:feature/aoss-iam-launchsignup_PROMPT_018C_vB
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-iam-launchsignup-prompt-018 origin/feature/aoss-iam-launchsignup_PROMPT_018C_vB
git push origin lisa/PVS-0.1.2/from-feature-aoss-iam-launchsignup-prompt-018

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-monorepo-scaffold-v0-1-0 from origin/feature/aoss-monorepo-scaffold-v0-1-0'
git fetch origin feature/aoss-monorepo-scaffold-v0-1-0:feature/aoss-monorepo-scaffold-v0-1-0
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-monorepo-scaffold-v0-1-0 origin/feature/aoss-monorepo-scaffold-v0-1-0
git push origin lisa/PVS-0.1.2/from-feature-aoss-monorepo-scaffold-v0-1-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-observations-firestore-v1-0 from origin/feature/aoss-observations-firestore-v1-0'
git fetch origin feature/aoss-observations-firestore-v1-0:feature/aoss-observations-firestore-v1-0
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-observations-firestore-v1-0 origin/feature/aoss-observations-firestore-v1-0
git push origin lisa/PVS-0.1.2/from-feature-aoss-observations-firestore-v1-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-observations-firestore-v1-0 from origin/feature/aoss-observations-firestore-v1-0-backup-20251202-1346'
git fetch origin feature/aoss-observations-firestore-v1-0-backup-20251202-1346:feature/aoss-observations-firestore-v1-0-backup-20251202-1346
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-observations-firestore-v1-0 origin/feature/aoss-observations-firestore-v1-0-backup-20251202-1346
git push origin lisa/PVS-0.1.2/from-feature-aoss-observations-firestore-v1-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-observations-wire-product-e from origin/feature/aoss-observations-wire-product-editor-v1-0'
git fetch origin feature/aoss-observations-wire-product-editor-v1-0:feature/aoss-observations-wire-product-editor-v1-0
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-observations-wire-product-e origin/feature/aoss-observations-wire-product-editor-v1-0
git push origin lisa/PVS-0.1.2/from-feature-aoss-observations-wire-product-e

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-pr-monitor-v1-0 from origin/feature/aoss-pr-monitor-v1-0'
git fetch origin feature/aoss-pr-monitor-v1-0:feature/aoss-pr-monitor-v1-0
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-pr-monitor-v1-0 origin/feature/aoss-pr-monitor-v1-0
git push origin lisa/PVS-0.1.2/from-feature-aoss-pr-monitor-v1-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-product-editor-layout-v1-1 from origin/feature/aoss-product-editor-layout-v1-1'
git fetch origin feature/aoss-product-editor-layout-v1-1:feature/aoss-product-editor-layout-v1-1
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-product-editor-layout-v1-1 origin/feature/aoss-product-editor-layout-v1-1
git push origin lisa/PVS-0.1.2/from-feature-aoss-product-editor-layout-v1-1

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-repo-audit-v1-1 from origin/feature/aoss-repo-audit-v1-1'
git fetch origin feature/aoss-repo-audit-v1-1:feature/aoss-repo-audit-v1-1
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-repo-audit-v1-1 origin/feature/aoss-repo-audit-v1-1
git push origin lisa/PVS-0.1.2/from-feature-aoss-repo-audit-v1-1

echo 'Creating branch lisa/PVS-0.1.2/from-feature-aoss-staging-hosting-v0-2-1 from origin/feature/aoss-staging-hosting-v0-2-1'
git fetch origin feature/aoss-staging-hosting-v0-2-1:feature/aoss-staging-hosting-v0-2-1
git checkout -b lisa/PVS-0.1.2/from-feature-aoss-staging-hosting-v0-2-1 origin/feature/aoss-staging-hosting-v0-2-1
git push origin lisa/PVS-0.1.2/from-feature-aoss-staging-hosting-v0-2-1

echo 'Creating branch lisa/PVS-0.1.2/from-feature-ci-sa-test-trigger-v0-4-1 from origin/feature/ci-sa-test-trigger-v0-4-1'
git fetch origin feature/ci-sa-test-trigger-v0-4-1:feature/ci-sa-test-trigger-v0-4-1
git checkout -b lisa/PVS-0.1.2/from-feature-ci-sa-test-trigger-v0-4-1 origin/feature/ci-sa-test-trigger-v0-4-1
git push origin lisa/PVS-0.1.2/from-feature-ci-sa-test-trigger-v0-4-1

echo 'Creating branch lisa/PVS-0.1.2/from-feature-cli-api-retailops-pipeline from origin/feature/cli-api/retailops-pipeline'
git fetch origin feature/cli-api/retailops-pipeline:feature/cli-api/retailops-pipeline
git checkout -b lisa/PVS-0.1.2/from-feature-cli-api-retailops-pipeline origin/feature/cli-api/retailops-pipeline
git push origin lisa/PVS-0.1.2/from-feature-cli-api-retailops-pipeline

echo 'Creating branch lisa/PVS-0.1.2/from-feature-import-manager-ui-prompt-019a-vb from origin/feature/import-manager-ui_PROMPT_019A_vB'
git fetch origin feature/import-manager-ui_PROMPT_019A_vB:feature/import-manager-ui_PROMPT_019A_vB
git checkout -b lisa/PVS-0.1.2/from-feature-import-manager-ui-prompt-019a-vb origin/feature/import-manager-ui_PROMPT_019A_vB
git push origin lisa/PVS-0.1.2/from-feature-import-manager-ui-prompt-019a-vb

echo 'Creating branch lisa/PVS-0.1.2/from-feature-import-w2-export-bridge-prompt-0 from origin/feature/import-w2-export-bridge_PROMPT_019A_vC'
git fetch origin feature/import-w2-export-bridge_PROMPT_019A_vC:feature/import-w2-export-bridge_PROMPT_019A_vC
git checkout -b lisa/PVS-0.1.2/from-feature-import-w2-export-bridge-prompt-0 origin/feature/import-w2-export-bridge_PROMPT_019A_vC
git push origin lisa/PVS-0.1.2/from-feature-import-w2-export-bridge-prompt-0

echo 'Creating branch lisa/PVS-0.1.2/from-feature-products-list-aoss from origin/feature/products-list-aoss'
git fetch origin feature/products-list-aoss:feature/products-list-aoss
git checkout -b lisa/PVS-0.1.2/from-feature-products-list-aoss origin/feature/products-list-aoss
git push origin lisa/PVS-0.1.2/from-feature-products-list-aoss

echo 'Creating branch lisa/PVS-0.1.2/from-feature-users-admin from origin/feature/users-admin'
git fetch origin feature/users-admin:feature/users-admin
git checkout -b lisa/PVS-0.1.2/from-feature-users-admin origin/feature/users-admin
git push origin lisa/PVS-0.1.2/from-feature-users-admin

echo 'Creating branch lisa/PVS-0.1.2/pr173-fix-ci-018c-conflict-e2e-cleanup from origin/fix/018c_conflict_hotfix'
git fetch origin fix/018c_conflict_hotfix:fix/018c_conflict_hotfix
git checkout -b lisa/PVS-0.1.2/pr173-fix-ci-018c-conflict-e2e-cleanup origin/fix/018c_conflict_hotfix
git push origin lisa/PVS-0.1.2/pr173-fix-ci-018c-conflict-e2e-cleanup

echo 'Creating branch lisa/PVS-0.1.2/pr243-feat-auth-admin-auth-debugging-and-e2e-u from origin/fix/admin-auth-debug'
git fetch origin fix/admin-auth-debug:fix/admin-auth-debug
git checkout -b lisa/PVS-0.1.2/pr243-feat-auth-admin-auth-debugging-and-e2e-u origin/fix/admin-auth-debug
git push origin lisa/PVS-0.1.2/pr243-feat-auth-admin-auth-debugging-and-e2e-u

echo 'Creating branch lisa/PVS-0.1.2/from-fix-attribute-testids from origin/fix/attribute-testids'
git fetch origin fix/attribute-testids:fix/attribute-testids
git checkout -b lisa/PVS-0.1.2/from-fix-attribute-testids origin/fix/attribute-testids
git push origin lisa/PVS-0.1.2/from-fix-attribute-testids

echo 'Creating branch lisa/PVS-0.1.2/from-fix-build-output-prompt-018c-va from origin/fix/build-output_PROMPT_018C_vA'
git fetch origin fix/build-output_PROMPT_018C_vA:fix/build-output_PROMPT_018C_vA
git checkout -b lisa/PVS-0.1.2/from-fix-build-output-prompt-018c-va origin/fix/build-output_PROMPT_018C_vA
git push origin lisa/PVS-0.1.2/from-fix-build-output-prompt-018c-va

echo 'Creating branch lisa/PVS-0.1.2/pr240-fix-api-use-req-params-listid-in-lists-h from origin/fix/lists-param-name'
git fetch origin fix/lists-param-name:fix/lists-param-name
git checkout -b lisa/PVS-0.1.2/pr240-fix-api-use-req-params-listid-in-lists-h origin/fix/lists-param-name
git push origin lisa/PVS-0.1.2/pr240-fix-api-use-req-params-listid-in-lists-h

echo 'Creating branch lisa/PVS-0.1.2/from-fix-pr261-attr-data-20251216 from origin/fix/pr261-attr-data-20251216'
git fetch origin fix/pr261-attr-data-20251216:fix/pr261-attr-data-20251216
git checkout -b lisa/PVS-0.1.2/from-fix-pr261-attr-data-20251216 origin/fix/pr261-attr-data-20251216
git push origin lisa/PVS-0.1.2/from-fix-pr261-attr-data-20251216

echo 'Creating branch lisa/PVS-0.1.2/from-fix-pr261-test-mock-20251216 from origin/fix/pr261-test-mock-20251216'
git fetch origin fix/pr261-test-mock-20251216:fix/pr261-test-mock-20251216
git checkout -b lisa/PVS-0.1.2/from-fix-pr261-test-mock-20251216 origin/fix/pr261-test-mock-20251216
git push origin lisa/PVS-0.1.2/from-fix-pr261-test-mock-20251216

echo 'Creating branch lisa/PVS-0.1.2/from-fix-preview-deploy-option-a-prompt-018b- from origin/fix/preview-deploy-option-a_PROMPT_018B_v1.1'
git fetch origin fix/preview-deploy-option-a_PROMPT_018B_v1.1:fix/preview-deploy-option-a_PROMPT_018B_v1.1
git checkout -b lisa/PVS-0.1.2/from-fix-preview-deploy-option-a-prompt-018b- origin/fix/preview-deploy-option-a_PROMPT_018B_v1.1
git push origin lisa/PVS-0.1.2/from-fix-preview-deploy-option-a-prompt-018b-

echo 'Creating branch lisa/PVS-0.1.2/from-fix-product-editor-missing-id-debug from origin/fix/product-editor-missing-id-debug'
git fetch origin fix/product-editor-missing-id-debug:fix/product-editor-missing-id-debug
git checkout -b lisa/PVS-0.1.2/from-fix-product-editor-missing-id-debug origin/fix/product-editor-missing-id-debug
git push origin lisa/PVS-0.1.2/from-fix-product-editor-missing-id-debug

echo 'Creating branch lisa/PVS-0.1.2/from-fix-set-admin-activate-account-prompt-01 from origin/fix/set-admin-activate-account_PROMPT_019A_v1.14'
git fetch origin fix/set-admin-activate-account_PROMPT_019A_v1.14:fix/set-admin-activate-account_PROMPT_019A_v1.14
git checkout -b lisa/PVS-0.1.2/from-fix-set-admin-activate-account-prompt-01 origin/fix/set-admin-activate-account_PROMPT_019A_v1.14
git push origin lisa/PVS-0.1.2/from-fix-set-admin-activate-account-prompt-01

echo 'Creating branch lisa/PVS-0.1.2/from-fix-set-admin-decode-final-prompt-019a-v from origin/fix/set-admin-decode-final_PROMPT_019A_v1.11'
git fetch origin fix/set-admin-decode-final_PROMPT_019A_v1.11:fix/set-admin-decode-final_PROMPT_019A_v1.11
git checkout -b lisa/PVS-0.1.2/from-fix-set-admin-decode-final-prompt-019a-v origin/fix/set-admin-decode-final_PROMPT_019A_v1.11
git push origin lisa/PVS-0.1.2/from-fix-set-admin-decode-final-prompt-019a-v

echo 'Creating branch lisa/PVS-0.1.2/from-fix-set-admin-decode-prompt-019a-v1-8 from origin/fix/set-admin-decode_PROMPT_019A_v1.8'
git fetch origin fix/set-admin-decode_PROMPT_019A_v1.8:fix/set-admin-decode_PROMPT_019A_v1.8
git checkout -b lisa/PVS-0.1.2/from-fix-set-admin-decode-prompt-019a-v1-8 origin/fix/set-admin-decode_PROMPT_019A_v1.8
git push origin lisa/PVS-0.1.2/from-fix-set-admin-decode-prompt-019a-v1-8

echo 'Creating branch lisa/PVS-0.1.2/from-fix-set-admin-gcloud-diagnostics-prompt- from origin/fix/set-admin-gcloud-diagnostics_PROMPT_019A_v1.15'
git fetch origin fix/set-admin-gcloud-diagnostics_PROMPT_019A_v1.15:fix/set-admin-gcloud-diagnostics_PROMPT_019A_v1.15
git checkout -b lisa/PVS-0.1.2/from-fix-set-admin-gcloud-diagnostics-prompt- origin/fix/set-admin-gcloud-diagnostics_PROMPT_019A_v1.15
git push origin lisa/PVS-0.1.2/from-fix-set-admin-gcloud-diagnostics-prompt-

echo 'Creating branch lisa/PVS-0.1.2/from-fix-set-admin-run-script-prompt-019a-v1- from origin/fix/set-admin-run-script_PROMPT_019A_v1.16'
git fetch origin fix/set-admin-run-script_PROMPT_019A_v1.16:fix/set-admin-run-script_PROMPT_019A_v1.16
git checkout -b lisa/PVS-0.1.2/from-fix-set-admin-run-script-prompt-019a-v1- origin/fix/set-admin-run-script_PROMPT_019A_v1.16
git push origin lisa/PVS-0.1.2/from-fix-set-admin-run-script-prompt-019a-v1-

echo 'Creating branch lisa/PVS-0.1.2/from-fix-users-roles-profile from origin/fix/users-roles-profile'
git fetch origin fix/users-roles-profile:fix/users-roles-profile
git checkout -b lisa/PVS-0.1.2/from-fix-users-roles-profile origin/fix/users-roles-profile
git push origin lisa/PVS-0.1.2/from-fix-users-roles-profile

echo 'Creating branch lisa/PVS-0.1.2/from-main from origin/main'
git fetch origin main:main
git checkout -b lisa/PVS-0.1.2/from-main origin/main
git push origin lisa/PVS-0.1.2/from-main

echo 'Creating branch lisa/PVS-0.1.2/pr262-revert-revert-regression-commit-27f41da- from origin/revert/27f41da-20251211'
git fetch origin revert/27f41da-20251211:revert/27f41da-20251211
git checkout -b lisa/PVS-0.1.2/pr262-revert-revert-regression-commit-27f41da- origin/revert/27f41da-20251211
git push origin lisa/PVS-0.1.2/pr262-revert-revert-regression-commit-27f41da-
