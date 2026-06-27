# Contributing

## Branch Naming

Use short, descriptive branch names:

- `codex/<area>-<change>`
- `fix/<area>-<bug>`
- `docs/<topic>`
- `test/<area>`

## Pull Requests

Pull requests should include:

- A concise summary of what changed.
- The reason for the change.
- Screenshots or notes for visible UI changes.
- The checks run locally.
- Any known follow-up work.

Keep PRs focused. Do not combine unrelated refactors with migration, bug fix, or feature work.

## Testing Requirements

Before opening or merging a PR, run:

```bash
npm run lint
npm test
npm run build
```

Run TypeScript checks when touching shared types, routing, config, or data-store behavior:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

## Lovable Upstream

Do not push to `upstream-lovable`.

The Lovable-controlled repository `LindaData/field-copilot-buddy` is read-only for Codex development. All future Codex work belongs in `LindaData/field-copilot-pro`.

## Secret Handling

- Do not commit `.env`.
- Do not commit service-role keys.
- Do not commit access tokens, passwords, private certificates, or GitHub credentials.
- Use `.env.example` for variable names and safe placeholders only.
- Treat browser-safe publishable keys as configuration, not as authorization for server-side actions.
