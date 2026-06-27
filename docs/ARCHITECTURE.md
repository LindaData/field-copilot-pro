# Architecture

## Frontend Architecture

Field Copilot Pro is a single-page React application built with Vite and TypeScript. It uses React Router for route composition, Tailwind CSS for styling, shadcn/Radix UI components for UI primitives, TanStack React Query for client data-fetching infrastructure, and i18next for localization.

The app is currently a browser-only prototype. There is no server-rendering layer, API backend, production authentication service, or production database persistence in the active workflows.

## Routing Structure

Routes are declared in `src/App.tsx` using `BrowserRouter`, `Routes`, and nested route shells.

Technician routes live under `/app` and include Today, Jobs, Job Detail, Diagnostics, Approval, Report, Parts Request, Scan, Copilot, Equipment, Documents, Parts, Knowledge, Training, Settings, More, and Feedback.

Owner routes live under `/app/owner` and include Dashboard, Jobs, Customers, Equipment, AWS Integrations, More, and Feedback.

The active technician diagnostic route is `/app/jobs/:id/diagnose`.

## State Management

The current application state is managed through a React store in `src/lib/store.tsx`. It initializes seeded data, stores workflow changes in memory, and persists demo state to browser `localStorage`.

This store is the current source of truth for jobs, customers, equipment, diagnostics, authorizations, feedback, parts, documents, and owner metrics.

## Seed Data

Seed data is generated from TypeScript files under `src/lib`, especially `seed.ts`. The seed layer anchors active demo jobs to the current date so the Today page remains populated as time passes.

Reseeding is versioned. When the demo store version changes, the app can refresh stale local demo state back to seeded defaults.

## Translation Architecture

i18next is initialized in `src/i18n/index.ts`. English and Spanish resources live in `src/i18n/locales/en.json` and `src/i18n/locales/es.json`.

The language selector writes the selected language to `localStorage` using `fc.lang`. Some static and dynamic strings are translated; full coverage remains future work.

## Supabase Current State

The Supabase client is present in `src/integrations/supabase/client.ts`, configured by `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Generated database types in `src/integrations/supabase/types.ts` currently define no application tables. Supabase is not storing jobs, customers, equipment, diagnostics, approvals, reports, or owner metrics in the current prototype.

## Production Migration Direction

The recommended path is:

1. Keep the demo store stable as a reference behavior suite.
2. Design Supabase schema for companies, users, roles, customers, properties, equipment, jobs, diagnostic sessions, measurements, approvals, reports, documents, parts, and audit logs.
3. Add real authentication and row-level security before storing real data.
4. Introduce repository adapters behind the current store-facing contracts.
5. Migrate seeded workflows incrementally to server-backed data while preserving the demo mode for training and QA.
