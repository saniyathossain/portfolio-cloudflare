#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
npm run build

# Ship-gate: catch broken HTML/CSS structure (e.g. an unbalanced brace in the inlined critical
# <style>) before it goes to production, not after a user reports it.
node scripts/preflight-check.ts

# Cloudflare Workers Builds (WORKERS_CI=1) and other CI run their own deploy command after this build command, so deploying here
# would upload everything twice. In CI this script is build + preflight only; locally it also deploys.
if [[ "${WORKERS_CI:-}" == "1" || "${CI:-}" == "true" ]]; then
  echo "CI detected: build and preflight passed; the platform deploy step publishes the Worker."
  exit 0
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found"
  exit 1
fi

# Fail fast with an actionable message instead of wrangler's generic non-interactive-auth error.
if ! npx wrangler whoami >/dev/null 2>&1; then
  echo ""
  echo "ERROR: not authenticated with Cloudflare."
  echo "Run 'npx wrangler login' interactively, or set CLOUDFLARE_API_TOKEN, then re-run ./deploy.sh."
  exit 1
fi

npx wrangler deploy
echo ""
echo "Deployed. Verify (incognito, both form factors):"
echo "  https://pagespeed.web.dev/analysis?url=https://saniyat.com&form_factor=mobile"
echo "  https://pagespeed.web.dev/analysis?url=https://saniyat.com&form_factor=desktop"
