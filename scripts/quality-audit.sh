#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-$ROOT/quality-audit-results/$STAMP}"
mkdir -p "$OUT_DIR"
LOG="$OUT_DIR/quality-audit.log"
SUMMARY="$OUT_DIR/summary.md"
COMMAND_COPY="$OUT_DIR/agent-command.md"

exec > >(tee -a "$LOG") 2>&1

run_step() {
  local name="$1"
  shift
  echo ""
  echo "== $name =="
  echo "+ $*"
  if "$@"; then
    echo "PASS: $name" >> "$SUMMARY"
  else
    local code=$?
    echo "WARN: $name exited with $code" >> "$SUMMARY"
  fi
}

has_npm_script() {
  local script_name="$1"
  [ -f package.json ] || return 1
  command -v node >/dev/null 2>&1 || return 1
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$script_name'] ? 0 : 1)" 2>/dev/null
}

pick_node_runner() {
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
    echo "pnpm"
  elif [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
    echo "yarn"
  elif command -v npm >/dev/null 2>&1; then
    echo "npm"
  else
    echo ""
  fi
}

cat > "$SUMMARY" <<EOF
# Quality Audit Summary

Repo: $(basename "$ROOT")
Generated: $STAMP

## Steps
EOF

cat > "$COMMAND_COPY" <<'EOF'
# Agent Command

Optimize this repo for SEO, performance, and accessibility.

Make safe code changes where the improvement is clear. Prioritize mobile-first UX, fast loading, readable structure, semantic HTML, useful metadata, alt text, keyboard navigation, color contrast, form labels, chart/table summaries, and clean page titles/descriptions.

Start by inspecting the repo structure and running available checks. If this repo has `scripts/quality-audit.sh`, run it first. Then identify the highest-impact fixes and implement them in small, reviewable changes.

Rules:
- Do not expose secrets or modify credentials.
- Do not add paid services or large dependencies without explicit approval.
- Do not rewrite the whole app unless needed.
- Prefer static/edge-friendly pages where practical.
- Keep changes mobile-first and simple.
- If a change is risky, create a TODO/issue note instead of forcing it.

Deliverables:
1. Summary of code/docs changed.
2. Checks run and results.
3. SEO fixes completed.
4. Performance fixes completed.
5. Accessibility fixes completed.
6. Remaining issues that need human review.
EOF

echo "Quality audit output: $OUT_DIR"
echo ""
echo "Repo files snapshot:"
find . -maxdepth 2 -type f \
  ! -path './.git/*' \
  ! -path './node_modules/*' \
  ! -path './quality-audit-results/*' \
  | sort | sed 's#^./##' | head -200

NODE_RUNNER="$(pick_node_runner)"
if [ -n "$NODE_RUNNER" ] && [ -f package.json ]; then
  echo "" >> "$SUMMARY"
  echo "## Node project checks" >> "$SUMMARY"
  for script_name in lint typecheck test build check; do
    if has_npm_script "$script_name"; then
      run_step "npm script: $script_name" "$NODE_RUNNER" run "$script_name"
    fi
  done
else
  echo "" >> "$SUMMARY"
  echo "## Node project checks" >> "$SUMMARY"
  echo "No package.json or package runner found." >> "$SUMMARY"
fi

if [ -f DESCRIPTION ] && command -v R >/dev/null 2>&1; then
  echo "" >> "$SUMMARY"
  echo "## R project checks" >> "$SUMMARY"
  run_step "R package check" R CMD check . --no-manual --no-build-vignettes
fi

if command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1; then
  PY="$(command -v python3 || command -v python)"
  if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
    echo "" >> "$SUMMARY"
    echo "## Python project checks" >> "$SUMMARY"
    if [ -d tests ]; then
      if command -v pytest >/dev/null 2>&1; then
        run_step "pytest" pytest
      else
        echo "pytest not installed; skipped." >> "$SUMMARY"
      fi
    fi
    "$PY" -m compileall . >/dev/null 2>&1 || echo "WARN: python compileall found issues" >> "$SUMMARY"
  fi
fi

SCAN_DIRS=()
for d in src app pages components public docs; do
  [ -d "$d" ] && SCAN_DIRS+=("$d")
done

if [ "${#SCAN_DIRS[@]}" -gt 0 ]; then
  echo "" >> "$SUMMARY"
  echo "## Lightweight static scan" >> "$SUMMARY"
  echo "Scanned dirs: ${SCAN_DIRS[*]}" >> "$SUMMARY"

  {
    echo "# Static Scan Notes"
    echo ""
    echo "## Image tags/components to review for alt text"
    grep -RIn --include='*.html' --include='*.jsx' --include='*.tsx' --include='*.vue' --include='*.svelte' '<img\|<Image' "${SCAN_DIRS[@]}" 2>/dev/null | head -100 || true
    echo ""
    echo "## Buttons/links to review for accessible names"
    grep -RIn --include='*.html' --include='*.jsx' --include='*.tsx' --include='*.vue' --include='*.svelte' '<button\|<a ' "${SCAN_DIRS[@]}" 2>/dev/null | head -100 || true
    echo ""
    echo "## Metadata/head usage to review"
    grep -RIn --include='*.html' --include='*.jsx' --include='*.tsx' --include='*.vue' --include='*.svelte' 'title\|description\|metadata\|Head\|meta name' "${SCAN_DIRS[@]}" 2>/dev/null | head -100 || true
  } > "$OUT_DIR/static-scan-notes.md"

  echo "Static scan notes written to static-scan-notes.md" >> "$SUMMARY"
else
  echo "" >> "$SUMMARY"
  echo "## Lightweight static scan" >> "$SUMMARY"
  echo "No common frontend directories found." >> "$SUMMARY"
fi

cat >> "$SUMMARY" <<'EOF'

## Manual review checklist

- SEO: titles, descriptions, headings, canonical/sitemap, meaningful URLs, source/last-updated notes.
- Performance: mobile load, images, maps/charts, table size, bundle size, expensive client-side work.
- Accessibility: semantic HTML, alt text, labels, keyboard flow, contrast, readable text, chart/table summaries.

## Next command

Use `agent-command.md` as the pullable command for Codex/ChatGPT.
EOF

echo ""
echo "Done. Review:"
echo "- $SUMMARY"
echo "- $COMMAND_COPY"
echo "- $LOG"
