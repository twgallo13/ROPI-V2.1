# Manual Steps to Upload Prompt Templates

The prompt templates need to be manually added to Firestore due to security rules.

## Option 1: Use Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com/project/ropi-bccee/firestore
2. Navigate to Firestore Database
3. Create documents at these paths:
   - `settings/ai/prompts/default`
   - `settings/ai/prompts/mens`
   - `settings/ai/prompts/womens`
   - `settings/ai/prompts/gradeSchool`
   - `settings/ai/prompts/toddler`

4. Copy the data from `scripts/prompts-seed-data.json` for each document

## Option 2: Use the App's Settings Page

Once deployed, admin users can navigate to Settings → AI Prompts and manually create/edit the prompt templates there.

## Template Structure

Each prompt document should have:
```json
{
  "tone": "Clean",
  "length": "Medium",
  "template": "You are ROPI AI...",
  "rules": [
    "Use observation facts verbatim when present.",
    "Never invent performance claims."
  ]
}
```

See `scripts/prompts-seed-data.json` for the full templates.
