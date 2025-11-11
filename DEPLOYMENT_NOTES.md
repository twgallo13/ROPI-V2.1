# Deployment Notes: AI Verify Coach + SEO Meta (Prompt 5)

This update adds a guided Verify coach, strict JSON from the AI backend, SEO meta generation and editing, and a true rewrite flow.

## Pre-merge checklist

- Verify PR builds for both web and functions
- Manually QA two SKUs (Men vs Grade School) to validate audience tone
- Confirm Firestore security rules are in place (unchanged in this update)

## Required configuration

Set the Gemini API key in Cloud Functions config (preferred) or provide `GEMINI_API_KEY` as an env var at deploy-time.

Preferred (Functions config):

- firebase functions:config:set gemini.api_key="<YOUR_KEY>"
- firebase functions:config:get to verify

The backend reads the key from `functions.config().gemini.api_key || process.env.GEMINI_API_KEY`.

## Build and deploy

1. Install and build
	- npm ci
	- npm run install:functions
	- npm run build
	- npm run build:functions

2. Deploy Hosting + Functions
	- firebase deploy --only hosting,functions

Hosting rewrites (firebase.json) already route:

- /api/describe -> apiDescribe
- /api/import/** -> apiImport
- /api/exporter/** -> apiExporter

## Post-deploy QA

- Generate for two SKUs (Men vs Grade School): confirm template-specific voice
- Improve via coach chips: verify factual/clarity/overall score lifts
- SEO preview: title/description/keywords present, editable, and persisted
- Approval gate: locked below 8, unlocked at 8+
- Observations with “Velcro for easy-on”: appears verbatim in copy

## Data persistence

Saved at `products/{id}/descriptions/RetailOps`:

- text: string
- scores: { overall?, factual?, tone?, seo?, clarity? }
- coach: { reasons?, actions?, next_questions? }
- seo: { meta_title?, meta_description?, meta_keywords? }
- facts_used: string[]
- meta: { tone, length, temperature, generatedAt, title?, description?, keywords? }
- history: last 3 generations (array)

## Troubleshooting

- 502 from /api/describe: AI returned invalid JSON; prompt enforces JSON-only. Retry with reduced temperature.
- Missing key: ensure functions config or environment variable is set before deploy.
- Approve disabled: ensure overall >= 8 (client computes fallback if server omits).
