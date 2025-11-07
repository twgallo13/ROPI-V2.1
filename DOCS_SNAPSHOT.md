# ROPI v2 — Code Snapshot (Web)

This repository currently contains the Vite/React front-end for ROPI v2. No Firebase Functions are present in this workspace.

## Top-level

- `index.html`: Vite HTML entry.
- `index.tsx`: React bootstrap (mounts the App component).
- `vite.config.ts`: Vite config with React plugin.
- `tsconfig.json`: TypeScript configuration for the web app.
- `package.json`: Scripts (dev/build/preview), dependencies (React 19, React Router 6).
- `firebase.json`: Hosting + emulator boilerplate (hosting rewrites to SPA, ports for emulators).
- `firestore.indexes.json`: Composite index suggestions for `work_items` and `products`.
- `.devcontainer/devcontainer.json`: Port forwards and Node feature for Codespaces.

## App shell

- `src/App.tsx`
  - Purpose: Defines routes and auth guards. Admin-only routes for `/import`, `/settings`, and `/settings/prompts`.
  - Key imports: `react-router-dom`, `useAuth`, `MainLayout`, page components.
  - TODOs:
    - Add `/ai` route when the AI page is implemented.
    - Replace mock auth with Firebase Auth.

- `src/components/MainLayout.tsx`
  - Purpose: Two-pane layout with sidebar navigation and top bar.
  - Key imports: `react-router-dom`, `useAuth` for role-gated links.
  - TODOs:
    - Add link to `/settings/prompts` within Settings nav, or a nested Settings menu.

- `src/contexts/AuthContext.tsx`
  - Purpose: Simple mock auth provider with `admin`/`specialist` roles.
  - TODOs:
    - Replace with Firebase Auth and role claims.

## Pages

- `src/pages/LaunchPage.tsx`
  - Purpose: Public Launch Hub with mock featured launches and simple sign-in buttons (mock).
  - TODOs: Wire to real data source and Firebase Auth.

- `src/pages/IntakeQueuePage.tsx` / `src/pages/CompleteQueuePage.tsx`
  - Purpose: Placeholder queue pages (not read in this snapshot if absent).

- `src/pages/ImportPage.tsx`
  - Purpose: CSV import UI mock (upload zone, auto-map preview table, confirm button).
  - TODOs:
    - Wire to importer backend endpoint.
    - Implement file parsing and mapping preview in the client.

- `src/pages/SettingsPage.tsx`
  - Purpose: Admin settings with tabs (Vocab, Rules, placeholders for Prompts/Brands/AI/Export).
  - TODOs:
    - Split into dedicated subroutes.
    - Persist to Firestore.

- `src/pages/settings/Prompts.tsx`
  - Purpose: New AI Prompts editor with minimal Tabs (Templates/Preview/History) and textarea.
  - Persistence: Uses `localStorage` simulating Firestore path `/settings/ai/prompts`.
  - TODOs:
    - Replace with shadcn/ui Tabs; hook up to Firestore.

## Data and services

- `src/types.ts`
  - Purpose: Core `Product` and `Variant` types including AI context and marketing fields.

- `src/mockData.ts`
  - Purpose: Mock vocabulary, featured launches, and example products.

- `src/hooks/useMockData.ts`
  - Purpose: Additional mock data hooks (older variant). Consider consolidating with `mockData.ts`.
  - TODO: Remove duplication and normalize shapes against `types.ts`.

- `src/services/mockAIService.ts`
  - Purpose: Simulates AI generation call returning title, bullets, SEO and score.
  - TODOs:
    - Replace with Gemini client; accept prompt and context input.

## Missing (Functions)

No `functions/` directory detected; therefore no `functions/src/routes/*.ts` available to summarize. The prompt pack expects:

- `/routes/import.ts`: CSV ingestion and mapping
- `/routes/describe.ts`: AI description generation (Gemini)
- `/routes/exporter.ts`: RetailOps CSV export

These will need to be created in a Firebase Functions project.
