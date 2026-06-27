# Field Copilot Pro

Field Copilot Pro is the Codex-managed baseline for the Caloosa Cooling HVAC Field Copilot prototype. It preserves the Lovable-generated demo behavior while moving future development into an independent GitHub repository.

## Current Status

This application is a working prototype, not a production multi-user system.

- Authentication is a demo stub.
- Jobs, customers, equipment, diagnostics, reports, and owner metrics are generated from TypeScript seed data and persisted in browser `localStorage`.
- Supabase is configured as a client dependency, but the generated database types currently contain no application tables.
- Real database persistence, role-based permissions, file storage, and production authentication are not implemented yet.

## Technology Stack

- React 18 and TypeScript
- Vite
- React Router
- Tailwind CSS
- shadcn/Radix UI components
- TanStack React Query
- i18next with English and Spanish resources
- Vitest and Testing Library
- Supabase JavaScript client
- Browser `localStorage` for demo state

## Repository Remotes

This repository was cloned from the Lovable-controlled demo repository with history preserved. It is public so the static prototype can be published on GitHub Pages.

- `origin`: `https://github.com/LindaData/field-copilot-pro.git`
- `upstream-lovable`: `https://github.com/LindaData/field-copilot-buddy.git`

`upstream-lovable` is read-only for Codex work. Do not push commits, branches, tags, issues, pull requests, workflow changes, or other modifications to `LindaData/field-copilot-buddy`.

## Required Software

- Node.js 22 LTS
- npm 10+
- Git

Bun is not required for this baseline. The committed npm lockfile is the package-manager source of truth.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

For a clean CI-style install after the lockfile is current:

```bash
npm ci
```

## Environment Variables

Create `.env` from `.env.example`.

```bash
VITE_SUPABASE_PROJECT_ID=your-supabase-project-id
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Only browser-safe `VITE_` values belong in this frontend. Do not commit `.env`, service-role keys, access tokens, passwords, or private credentials.

## Development Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run preview
```

TypeScript can be checked directly with:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

## Demo Data

The current operational data is seeded from TypeScript files under `src/lib`. The demo store writes state to browser `localStorage`, including job status changes, diagnostic progress, approvals, and report-related state.

The seed logic anchors active demo jobs to the current date so the Today view remains populated over time.

## English and Spanish

The app initializes i18next from `src/i18n`. English and Spanish resources are present under `src/i18n/locales`, and the shell includes a language selector. Some dynamic/demo strings remain partially translated and should be handled in a later localization pass.

## Main Routes

- `/`
- `/signin`
- `/app/today`
- `/app/jobs`
- `/app/jobs/:id`
- `/app/jobs/:id/diagnose`
- `/app/jobs/:id/approval`
- `/app/jobs/:id/report`
- `/app/jobs/:id/parts-request`
- `/app/scan`
- `/app/copilot`
- `/app/equipment`
- `/app/equipment/:id`
- `/app/documents`
- `/app/documents/:id`
- `/app/parts`
- `/app/knowledge`
- `/app/training`
- `/app/settings`
- `/app/more`
- `/app/feedback`
- `/app/owner`
- `/app/owner/jobs`
- `/app/owner/customers`
- `/app/owner/equipment`
- `/app/owner/integrations/aws`
- `/app/owner/more`
- `/app/owner/feedback`

## Deployment

The app builds to static files in `dist`.

GitHub Pages is published at:

`https://lindadata.github.io/field-copilot-pro/`

The Vite base path is `/field-copilot-pro/`, and the deployment workflow writes `dist/404.html` as an SPA fallback so direct refreshes of nested React Router routes return the app shell.

## Known Limitations

- Demo authentication only.
- No production role-based access control.
- No Supabase application tables or migrations yet.
- No server-side persistence for jobs, customers, equipment, diagnostics, approvals, or reports.
- AWS integration screens are placeholders and simulated.
- Some localization coverage is incomplete.
- Bundle size currently exceeds Vite's default chunk warning threshold.

## Security Warning

Do not enter real customer operational data, secrets, service-role keys, credentials, or production tokens into this prototype. The current app is browser-only and stores demo state locally.

## Production Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). The first production work should establish real authentication, database schema, row-level permissions, and a migration path from seeded demo data to Supabase-backed records.
