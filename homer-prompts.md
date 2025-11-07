# ROPI v2 — Homer (Codespaces Copilot) Prompt Pack

> Purpose: Give you copy‑paste prompts for GitHub Codespaces + Copilot Chat (aka “Homer”) so you can drive setup, coding, testing, and deploy without being a developer.

---

## How to use Homer (2-minute guide)

1) Open the repo in **GitHub Codespaces** (green “Code” button → Codespaces → New with devcontainer).  
2) In VS Code (web or desktop), open **Copilot Chat** (icon on the Activity Bar).  
3) Paste any prompt below into the chat.  
   - You can prepend **@workspace** to make Homer search the whole repo.  
   - You can **select files** in the editor and ask Homer to modify/refactor them.  
4) Homer suggests changes → click **“Insert into new file”** or **“Apply in [file]”**.  
5) Use the integrated terminal for commands Homer suggests (it will include them inline).  
6) Always **commit via PR**, and ask Homer to **generate a test plan** in the PR description.

> Tip: Keep this file in the repo root as `.homer-prompts.md` so everyone can reuse it.

---

## 0) Project context (paste first)
```
Homer, this Codespace is for **ROPI v2**, a Shiekh internal product-copy platform.
Stack: React (Vite) + TypeScript + Firebase (Auth, Firestore, Storage, Functions) + Gemini.
It ingests RetailOps CSVs → enriches/creates product copy → exports RetailOps CSV back.
Please read the repository, list the main folders, and summarize the Functions routes.
```

---

## 1) Bring-up (run & verify)
```
Homer, start local dev and confirm both parts are reachable:
- Run: firebase emulators:start
- In another terminal: cd web && npm run dev
Tell me the URLs (Vite app, Functions emulator). If emulators require Java, install it in the Codespace.
```

---

## 2) Firestore schema & indexes
```
Homer, from the codebase, list all Firestore collections and subcollections used:
products, products/{id}/variants, work_items, settings, audit, errors, exports.
Generate a firestore.indexes.json section for:
- work_items: status ASC, createdAt DESC
- products: brand ASC, status ASC, updatedAt DESC
Check firebase.json references it.
```

---

## 3) CSV importer validation
```
Homer, review functions/src/routes/import.ts.
- Confirm header synonym mapping matches our spec: product_id/style/style_id/parent_sku/style_code → product_id; sku/variant_id/child_sku/upc → sku; images/image_urls → images, etc.
- Implement Levenshtein fuzzy match (≤ 2) for unknown headers and mark them suggested-low.
- Add unit tests covering: blank strings → null, TRUE/FALSE → booleans, price coercion ($1,299.00 → 1299), multi-value images split on | or ,.
- Provide a sample CSV (10 rows) and a command to run the tests.
```

---

## 4) AI describe endpoint
```
Homer, improve functions/src/routes/describe.ts:
- Build the prompt from product.title, brand, context.keywords, context.features, variant color/size.
- Use Gemini model from process.env.GEMINI_MODEL with default gemini-1.5-flash.
- Write results to products/{productId}.ai and append a short history item with timestamp.
- Add a dry-run query param (?dryRun=1) that returns the prompt without calling the model.
- Provide an example curl to test.
```

---

## 5) Admin Settings UI (Prompts/Vocab/CSV/Variants)
```
Homer, scaffold Settings pages under /web/src/pages/settings:
- Routes: /settings/prompts, /settings/vocab, /settings/csv, /settings/variants
- Each page: basic form with load/save from Firestore (/settings/*).
- Add a left-nav and tabs. Use existing Vite/React stack. Keep styles minimal.
- Add optimistic save + toast notifications.
Provide file paths you created and how to wire routes in main.tsx.
```

---

## 6) Visual audit vs. blueprint
```
Homer, compare our UI against this checklist:
- Routes: /import, /ai, /settings, /launch
- ProductEditorDrawer: tabs Basics, Variants, Media, AI Context, SEO, Audit
- CSV Import UI: upload zone, auto-map preview, conflict resolver, sample rows
- AI panel: model/temperature/tone, preview/history, gating when context missing
- Admin Settings UI: Prompts/Vocab/CSV/Variants
Return a Present / Partial / Missing report with file and line references and prioritized fixes.
```

---

## 7) Exporter to RetailOps CSV
```
Homer, enhance functions/src/routes/exporter.ts:
- Filter products with status=Active and collect variants.
- Emit CSV columns: product_id, sku, title, brand, category, price, images (| separated)
- Upload to Firebase Storage at /exports/{id}.csv and write /exports/{id} with file URL and status.
- Return {ok, exportId, storagePath, fileUrl}.
Add a small unit test for CSV generation.
```

---

## 8) Access & auth checks
```
Homer, ensure front-end enforces Google sign-in restricted to @shiekhshoes.org after login.
Add a guard HOC that checks domain and role claim (viewer/editor/admin) before entering /settings or /launch.
Explain where to set custom claims (Firebase Admin) and produce a one-time script.
```

---

## 9) CI/CD via GitHub Actions
```
Homer, create .github/workflows/deploy.yml to deploy Hosting + Functions on push to main.
Use secrets: FIREBASE_CI_TOKEN and FIREBASE_PROJECT_ID.
Build web (vite), build functions (tsc), then firebase deploy --only hosting,functions.
Return the full workflow file and any required commands to generate FIREBASE_CI_TOKEN.
```

---

## 10) PR hygiene & test plan
```
Homer, add .github/pull_request_template.md with:
- Summary
- Acceptance checks (CSV/AI/Export not regressed, telemetry /audit present)
- Manual test notes
Also, when I open a PR, generate a test plan (unit + manual) and list risks/blast radius.
```

---

## 11) Troubleshooting prompts
```
Homer, fix: Emulators not starting due to missing Java. Install Temurin JDK 21 in the Codespace and retry.
```
```
Homer, fix: Firebase Auth domain mismatch. Add current preview domain to Authorized domains and show steps in Firebase Console.
```
```
Homer, fix: Vite env not loading. Verify .env.local at /web and that keys start with VITE_.
```

---

## 12) One-click recap
```
Homer, run a readiness check:
- TS type-check for web & functions
- Build both
- Emulators up
- Lint and unit tests
Then summarize outstanding TODOs to reach MVP for import → AI → review → export.
```
