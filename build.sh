#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
# Invoke shell steps via `bash` (not ./) so a missing git execute-bit can't break CI builds.
node scripts/fetch-articles.ts
bash "$ROOT/build-css.sh"
node scripts/build-brand-css.ts
node scripts/minify-css.ts
bash "$ROOT/scripts/setup-fonts.sh"
node scripts/optimize-images.ts
node scripts/build-client.ts
node scripts/set-asset-version.ts
node scripts/build-client.ts   # rebuild so boot picks up the freshly stamped ASSET_V
node scripts/sync-head.ts
node scripts/hash-sw.ts
node scripts/build-client.ts   # final pass: bundles sw.ts with its stamped cache version
echo "Build complete."
