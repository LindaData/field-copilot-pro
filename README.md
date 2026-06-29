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
npm run lint
npm test
npm run preview
```

## Production Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
