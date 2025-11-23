# Deployment Instructions — Lisa v3.3.0

**DO NOT deploy to production.** This release is for staging only.

---

## Prerequisites

1. Service account credentials at `/workspaces/ROPI-V2.1/service-account.json`
2. Firebase CLI authenticated for staging project
3. All tests passing (verified: ✅)
4. Code committed to `feature/v3.3-acc-vocab-preview` branch

---

## Step 1: Run Seeder (Dry Run)

```bash
cd /workspaces/ROPI-V2.1

export GOOGLE_APPLICATION_CREDENTIALS="$PWD/service-account.json"

npx tsx scripts/normalizeAndSeedAttributes.ts --dry-run \
  > operations/review-artifacts/v3.3-acc-vocab-preview/normalize-dryrun-v3.3.log 2>&1

echo "Dry run exit code: $?" \
  >> operations/review-artifacts/v3.3-acc-vocab-preview/normalize-dryrun-v3.3.log

cat operations/review-artifacts/v3.3-acc-vocab-preview/normalize-dryrun-v3.3.log
```

**Expected output:**
- `[DRY RUN] Would seed to Firestore settings/attributes/*`
- Total attributes count
- Sample attribute (e.g., `descriptive.sportsTeam`)
- No errors

---

## Step 2: Run Seeder (Actual Seed)

```bash
npx tsx scripts/normalizeAndSeedAttributes.ts --seed \
  > operations/review-artifacts/v3.3-acc-vocab-preview/normalize-seed-v3.3.log 2>&1

echo "Seed exit code: $?" \
  >> operations/review-artifacts/v3.3-acc-vocab-preview/normalize-seed-v3.3.log

cat operations/review-artifacts/v3.3-acc-vocab-preview/normalize-seed-v3.3.log
```

**Expected output:**
- `✓ Loaded N attributes from registry`
- `✓ Applied normalization rules`
- `✓ Saved normalized registry to scripts/attribute-registry-normalized.json`
- `✓ Seeded N attributes to Firestore settings/attributes/keys`
- `✓ Generated CSV report at scripts/attribute-registry.csv`
- `✅ Complete!`

---

## Step 3: Build Project

```bash
npm run build 2>&1 | tee operations/review-artifacts/v3.3-acc-vocab-preview/npm-build-v3.3.log

echo "Build exit code: ${PIPESTATUS[0]}" \
  >> operations/review-artifacts/v3.3-acc-vocab-preview/npm-build-v3.3.log
```

**Expected:**
- Build completes successfully
- No TypeScript errors
- Output in `dist/` directory

---

## Step 4: Deploy to Staging

```bash
firebase deploy --only hosting,functions \
  > operations/review-artifacts/v3.3-acc-vocab-preview/firebase-deploy-staging-v3.3.log 2>&1

echo "Deploy exit code: $?" \
  >> operations/review-artifacts/v3.3-acc-vocab-preview/firebase-deploy-staging-v3.3.log

cat operations/review-artifacts/v3.3-acc-vocab-preview/firebase-deploy-staging-v3.3.log
```

**Expected output:**
- `✔ Deploy complete!`
- Hosting URL: https://ropi-bccee.web.app
- Functions deployed successfully

---

## Step 5: Update Firestore lisaVersion

**Option A: Via Firebase Console**
1. Navigate to Firestore in Firebase Console
2. Go to `settings/meta/lisaVersion` document
3. Update `version` field to `v3.3.0`
4. Update `timestamp` to current time
5. Add `notes`: "ACC Vocabulary UX & Product-value Preview"

**Option B: Via Script** (if available)
```bash
# TODO: Add script for updating lisaVersion
# For now, use Firebase Console
```

---

## Step 6: Verify Staging

Open https://ropi-bccee.web.app/settings/attributes and verify:

1. **Page loads without errors**
2. **Grouping works:** Search "Gender" → see single grouped row
3. **Badges visible:** Core, Vendor, Legacy tags appear
4. **Vocab display:** Open attribute with vocab → see allowed values
5. **Product preview:** See value distribution (or "not available yet" message)

Use the full checklist in `THEO_VERIFICATION_CHECKLIST.md`.

---

## Step 7: Record Deployment Info

```bash
echo "Deployed at: $(date -Iseconds)" \
  > operations/review-artifacts/v3.3-acc-vocab-preview/deployment-timestamp.txt

git rev-parse HEAD \
  > operations/review-artifacts/v3.3-acc-vocab-preview/deployed-commit-sha.txt

echo "https://ropi-bccee.web.app/settings/attributes" \
  > operations/review-artifacts/v3.3-acc-vocab-preview/staging-url.txt
```

---

## Step 8: Commit Artifacts

```bash
git add operations/review-artifacts/v3.3-acc-vocab-preview/
git commit -m "v3.3.0: Add deployment artifacts"
```

---

## Step 9: Push Branch and Open PR

```bash
git push -u origin feature/v3.3-acc-vocab-preview

gh pr create \
  --base main \
  --head feature/v3.3-acc-vocab-preview \
  --title "v3.3.0 — ACC Vocabulary UX & Product-value Preview" \
  --body "Implements attribute grouping by canonical path, vocab UX, and minimal product-value preview. See OPERATIONS/HOMER_LOG.md and operations/review-artifacts/v3.3-acc-vocab-preview/ for details."
```

---

## Troubleshooting

### Seeder fails with "service-account.json not found"
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Check file exists and has valid JSON

### Build fails with TypeScript errors
- Run `npm test` to identify issues
- Fix any type errors in modified files

### Deploy fails with "permission denied"
- Ensure Firebase CLI is authenticated: `firebase login`
- Verify targeting correct project: `firebase use staging` (or equivalent)

### Attribute grouping not visible in staging
- Clear browser cache and reload
- Check browser console for errors
- Verify `attributeGrouping.ts` and `AttributesCommandCenter.tsx` changes are in deployed build

---

## Rollback (if needed)

If issues found in staging:

```bash
# Revert to previous deploy
firebase hosting:rollback

# Document the issue
echo "Reason for rollback: [describe issue]" \
  > operations/review-artifacts/v3.3-acc-vocab-preview/ROLLBACK.txt

# Fix issues and re-deploy
```

---

**End of Deployment Instructions**
