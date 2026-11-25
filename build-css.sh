#!/usr/bin/env bash
# Build Tailwind CSS with the pinned @tailwindcss/cli devDependency (v4). Run `npm ci` first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/public/assets/css/tailwind.css"

cd "$ROOT"
npx --no-install tailwindcss -i "$ROOT/tailwind.input.css" -o "$OUT" --minify
echo "Built $OUT"
