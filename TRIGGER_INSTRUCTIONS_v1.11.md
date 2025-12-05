# TRIGGER INSTRUCTIONS - PROMPT_019A_v1.11

## Status: Ready to Trigger ✅

**PR #179 Merged**: Workflow is now configured with `environment: staging`

---

## Step 1: Verify Secret Configuration

**Navigate to**: https://github.com/twgallo13/ROPI-V2.1/settings/environments

1. Click on `staging` environment
2. Check if secret `GCP_SA_KEY_BASE64` exists
3. If missing, add it:
   - Name: `GCP_SA_KEY_BASE64`
   - Value: Base64-encoded service account JSON (single line, no wrapping)
   
   ```bash
   # Generate from service account file:
   cat your-service-account.json | base64 -w 0
   ```

---

## Step 2: Trigger the Workflow

**Navigate to**: https://github.com/twgallo13/ROPI-V2.1/actions/workflows/set-admin-claim.yml

1. Click **"Run workflow"** button (green, top right)
2. Select branch: **`aoss-main`**
3. Enter email: **`theo@shiekhshoes.org`** (or use default)
4. Click **"Run workflow"** to start

---

## Step 3: Approve Staging (if prompted)

- GitHub may show "Waiting for approval" banner
- Click **"Review deployments"**
- Select `staging` environment
- Click **"Approve and deploy"**

---

## Step 4: Monitor Execution

**Actions Tab**: https://github.com/twgallo13/ROPI-V2.1/actions

- Watch the "Ops — Set Admin Custom Claim" run
- Wait for completion (~1-2 minutes)

### Expected Success Output:

**Decode step**:
```
Decoded service account JSON present at /tmp/sa.json (validated)
```

**Set admin script**:
```
Custom claim set for theo@shiekhshoes.org
```

**Verify step**:
```
customClaims: { role: 'admin' }
```

---

## Step 5: Verify in Browser (After Success)

1. Open staging site: https://your-staging-site.web.app
2. Sign out and sign back in as `theo@shiekhshoes.org`
3. Open browser console (F12)
4. Run:
   ```javascript
   firebase.auth().currentUser.getIdToken(true)
     .then(() => firebase.auth().currentUser.getIdTokenResult())
     .then(t => {
       console.log('Token claims:', t.claims);
       if (t.claims.role === 'admin') {
         console.log('✅ Admin claim verified!');
       }
     });
   ```

---

## Step 6: Report Back

After successful run, provide:
- Run URL (e.g., `https://github.com/twgallo13/ROPI-V2.1/actions/runs/XXXXXX`)
- Screenshot or copy of "Decode" step logs
- Screenshot or copy of "Set admin script" output
- Screenshot or copy of "Verify claim" output

Homer will update the audit file with these details.

---

## Troubleshooting

### If workflow fails:

**"GCP_SA_KEY_BASE64 is empty"**
→ Secret not configured in staging environment

**"base64 decode failed"**
→ Secret has invalid base64 encoding (check for newlines/formatting)

**"JSON validation failed"**
→ Decoded content is not valid JSON (re-encode the service account file)

**"Permission denied"**
→ Service account lacks IAM permissions for Firebase Admin SDK

---

**Ready to proceed!** 🚀
