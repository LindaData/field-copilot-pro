# Field Copilot Pro

Field Copilot Pro is the Codex-managed baseline for the Caloosa Cooling HVAC Field Copilot prototype.

## Current Status

This application is a working prototype, not a production multi-user system.

- Authentication is a demo stub.
- Jobs, customers, equipment, diagnostics, reports, and owner metrics are generated from TypeScript seed data and persisted in browser `localStorage`.
- Production direction is now AWS-first.

## Live Demo

GitHub Pages deploys from `main` after CI passes:

- https://lindadata.github.io/field-copilot-pro/
- Owner equipment review route: https://lindadata.github.io/field-copilot-pro/app/owner/equipment

On iPhone, open the demo in Safari, tap Share, then tap **Add to Home Screen**. This installs the PWA-style demo shell while the native TestFlight build is prepared.

Phone test guide:

- https://lindadata.github.io/field-copilot-pro/phone-test.html

## Agent Company Operating System

This repo includes the LindaData agent-company structure for routing work through a CEO Commander, Chief of Staff, executive council, specialist pods, QA review, tool routing, and short user summaries.

Start here:

- [Agent Company Overview](docs/agent-company/README.md)
- [Org Chart](docs/agent-company/org-chart.md)
- [Role Roster](docs/agent-company/roles.yaml)
- [Workflows](docs/agent-company/workflows.yaml)
- [Message Contract](docs/agent-company/message-contract.schema.json)
- [Tool Registry](docs/agent-company/tool-registry.yaml)
- [Skills Matrix](docs/agent-company/skills-matrix.md)
- [Tool Use Policy](docs/agent-company/tool-use-policy.md)
- [Next Tools Roadmap](docs/agent-company/next-tools-roadmap.md)
- [Quality Gates](docs/agent-company/safety-gates.md)
- [Codex Bootstrap](docs/agent-company/codex-bootstrap.md)

Recommended Codex starting point:

```text
docs/agent-company/codex-bootstrap.md
```

## AWS Start

Use these docs next:

- [AWS Architecture Plan](docs/AWS_ARCHITECTURE.md)
- [AWS Start Guide](docs/AWS_START.md)
- [Roadmap](docs/ROADMAP.md)

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Development Commands

```bash
npm run dev
npm run build
npm run build:ios
npm run sync:ios
npm run lint
npm test
npm run preview
```

## iOS TestFlight Start

The current iOS path uses Capacitor to wrap the same React/Vite app that powers the website. The first iOS build is for smoke testing the mobile field workflow with demo/local state.

- Installable iPhone web shell: `public/manifest.webmanifest` and `public/icons/`
- Native config: `capacitor.config.ts`
- iOS project: `ios/App/App.xcodeproj`
- TestFlight handoff: [docs/IOS_TESTFLIGHT_START.md](docs/IOS_TESTFLIGHT_START.md)

Windows can build the web bundle and sync Capacitor assets. Signing, archiving, and TestFlight upload require Xcode on macOS or a cloud macOS build service.

## Production Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
