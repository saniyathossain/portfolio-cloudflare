#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
# Invoke shell steps via `bash` (not ./) so a missing git execute-bit can't break CI builds.
node scripts/fetch-articles.js
bash "$ROOT/build-css.sh"
node scripts/minify-css.js
bash "$ROOT/scripts/setup-fonts.sh"
node scripts/optimize-images.js
node scripts/build-client.mjs
node scripts/set-asset-version.js
node scripts/build-client.mjs   # rebuild so boot picks up the freshly stamped ASSET_V
node scripts/sync-head.js
node scripts/hash-sw.js
node scripts/build-client.mjs   # final pass: bundles sw.ts with its stamped cache version
echo "Build complete."
