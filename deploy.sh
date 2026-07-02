#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
./build.sh
if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx not found"
  exit 1
fi
npx wrangler deploy
echo ""
echo "Deployed. Verify: https://saniyat.com"
echo "PageSpeed: https://pagespeed.web.dev/analysis?url=https://saniyat.com"
