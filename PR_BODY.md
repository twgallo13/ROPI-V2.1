This workflow automates SmartRules staging log collection using the GCP service account secret stored in GCP_SA_KEY_BASE64.

It:
- Decodes and activates the service account (base64 secret)
- Enables verbose logging for importCSV/onProductWrite
- Triggers sample product writes
- Collects Cloud Logging events for smartrule.eval/apply/error
- Reverts verbose logging and uploads artifacts

Usage (trigger via GitHub Actions -> Run workflow):
- staging_host: staging host (e.g., staging-api.ropi-bccee.app)
- product_ids: comma-separated product IDs to test
- sample_count: number of patches per product (default 1)

Security:
- Uses GCP_SA_KEY_BASE64 (base64 encoded service account JSON)
- No secrets are printed in logs; service account key is only decoded on the runner.

After merge, run the workflow, attach artifacts, and update HES with VERIFIED SUCCESS.
