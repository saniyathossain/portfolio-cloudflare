#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
./build-css.sh
node scripts/minify-css.js
chmod +x scripts/setup-fonts.sh 2>/dev/null || true
./scripts/setup-fonts.sh
node scripts/optimize-images.js
node scripts/sync-head.js
node scripts/hash-sw.js
echo "Build complete."
