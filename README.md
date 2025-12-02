# ROPI AOSS — Clean AOSS scaffold
This repository is the canonical implementation for Ropi AOSS.
Single source of truth lives in Notion: Section 1..14 (ROPI AOSS).

## Staging Environment (v0.2.1)

AOSS staging uses **Firebase Hosting preview channels** per AOSS Section 10.3.

- **Branch**: `aoss-main`
- **Preview channel**: `aoss-main-staging`
- **Project**: `ropi-bccee`
- **URL**: Firebase preview URL (format: `https://ropi-bccee--aoss-main-staging-<hash>.web.app`)

The staging environment deploys automatically on push to `aoss-main`. This uses a preview channel to avoid affecting the live production site at `https://ropi-bccee.firebaseapp.com/`, which continues to serve the legacy app until the migration plan in Section 12 is executed.

### Manual Deployment

```bash
# Deploy to staging preview channel
firebase hosting:channel:deploy aoss-main-staging --project ropi-bccee
```
