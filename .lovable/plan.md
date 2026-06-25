# HVAC Field Copilot Demo — Build Plan

Your spec is huge (16 pages, ~30 data models, dozens of screens). To ship a *working, phone-testable, share-ready prototype this turn*, I'm scoping to the **Final Priority Order** you listed and deferring the long tail. Everything below is functional, not mocked-out marketing.

## Scope shipped in V1 (this build)

**Auth / entry**
- Demo landing with "Enter as Technician", "Enter as Owner", "Sign In" (email/password stub), 3-screen first-run tour, Reset Demo, Share Demo.
- Guest demo mode (no signup) using seeded local state.

**Design system**
- Mobile-first, dark navy / white / cool gray / safety amber tokens in `index.css` + `tailwind.config.ts`.
- Bottom nav (Jobs / Scan / Copilot / Equipment / More), 48px+ targets, sticky Next Step, source badges, sync badge, voice-input button (Web Speech API with simulated fallback), autosave "Saved" toast.

**Technician flow (the 30-second demo path)**
- Today's jobs list (3 seeded, 1 On Site = the Goodman no-cooling job).
- Equipment Scanner with simulated "Scan data plate" that recognizes the seeded `GSXN3N2410A*`.
- Equipment Profile with verified specs (all values from your SS-GSXN3 list), grouped Capacity/Compressor/Fan/Refrigeration/Electrical/Physical/Certifications, "Ask about this equipment" deterministic Q&A, source badges + "View source" → Goodman PDF link.
- Guided Diagnostics: full branching No Cooling flow A→N with the two alternate branches (no incoming voltage; no 24V at contactor). Capacitor step clearly labeled *Technician observation*. Tolerance math shown.
- Customer Approval screen with signature pad + demo quote.
- Auto-generated Service Report (print/PDF-ready) pulling job, specs, measurements, reasoning, parts, signature.

**Owner flow**
- Dashboard: first-time fix rate, callback rate, avg diagnostic time, open jobs, revenue, gross margin, utilization, top failure modes, est. monthly savings — all labeled "Demo data", with date/tech/brand/job-type filters.

**Supporting pages (functional, lighter depth)**
- Jobs CRUD list + detail.
- Document Library with Goodman product page + SS-GSXN3 PDF seeded; upload UI with simulated Uploaded→Processing→Needs Review→Approved status.
- Manual/Spec Viewer (tabbed on mobile) with Ask Document deterministic responses.
- Copilot Chat with context awareness (active job/equipment/step) and seeded deterministic responses + suggested prompts.
- Parts & Inventory list with seeded generic dual-run capacitor (labeled "Compatibility must be verified"), contactor, drier, truck stock.
- Knowledge Base with 3 seeded demo cases.
- Settings/Admin shell (company profile, users, labor rates, report branding read-only-ish).

**Safety**
- Electrical and refrigerant acknowledgment gates before the relevant steps.
- Red "Stop and escalate" on every diagnostic step.
- Persistent disclaimer in More menu.

**Data / persistence**
- **localStorage-backed seed store** (not Supabase Cloud) so the prototype is instantly shareable, works offline, and `Reset Demo` truly resets. Trade-off: no cross-device sync, no real auth.
- All ~30 entities you listed are modeled as TS types; the V1 store hydrates the subset the UI reads/writes (Company, User, Customer, Property, Equipment, EquipmentSpec, Document, Job, DiagnosticSession, DiagnosticStepResult, Measurement, Part, InventoryItem, JobPart, Authorization, ServiceReport, KnowledgeCase). Others are stubbed for V2.

**Source/trust rules**
- Every spec card and Copilot answer carries one of the 5 badges, source title + page, and "View source" link. Goodman values cite *SS-GSXN3, Product Specifications, p.3*. "Not found in current documents" used where data is absent. No invented manufacturer specs. Capacitor µF never shown as a Goodman spec.

## Deferred to V2 (call out in More → Roadmap)
- Real Supabase Cloud backend + email/password auth + RLS + role-based permissions enforcement server-side (V1 simulates roles in client state).
- True offline sync / service worker (V1 shows the offline visual state but uses localStorage).
- Real OCR on data-plate photos (V1 uses the simulated recognizer).
- Real AI provider for Copilot (V1 uses deterministic seeded responses; settings page reserves the integration slot, no client-side keys).
- Training Mode scoring, full Audit Log UI, Document admin approval workflow UI beyond status badges, Follow-Up + Escalation workboards, full CRUD for every entity.

## Tech notes
- React 18 + Vite + Tailwind + shadcn (already scaffolded).
- New routes via React Router under `src/pages/`. Bottom nav layout component wraps the technician/owner shells.
- Goodman PDF + product page linked, not re-hosted.
- Print-friendly CSS for the Service Report route.

## Confirm or adjust
This is ~1 large build. If you want me to **add Lovable Cloud + real auth + DB persistence now** instead of localStorage, say so — it'll be a second pass after V1 is on screen. Otherwise I'll proceed with the plan above.
