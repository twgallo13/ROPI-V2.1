<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1hFbULNom3fWIEBSJApaLTznU4KZBZl7F

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Set up your Firebase configuration in `.env.local`:
   ```
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_APP_ID=your-app-id
   ```
4. Run the app:
   `npm run dev`

## Seeding Firestore Data

To seed initial settings data to Firestore:

1. Set up Firebase Admin credentials:
   - Option A: Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account JSON path
   - Option B: Place your service account JSON file at the project root as `service-account.json`
   - Option C: The script will fall back to using the project ID from your environment variables

2. Run the seed script:
   ```bash
   npm run seed
   ```

This will create the following documents in Firestore:
- `/settings/ai` - AI model configuration (model, temperature, tone, etc.)
- `/settings/vocab` - Vocabulary settings (banned words, synonyms)

You only need to run this once to initialize your Firestore database with default settings.
