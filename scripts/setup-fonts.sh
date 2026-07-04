#!/usr/bin/env bash
# Vendor Inter variable woff2 (latin) for self-hosted, PageSpeed-friendly typography.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/assets/fonts"
OUT="$OUT_DIR/inter-latin.woff2"
URL="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.2.8/files/inter-latin-wght-normal.woff2"

mkdir -p "$OUT_DIR"
if [[ -f "$OUT" && -s "$OUT" ]]; then
  echo "Font exists: $OUT ($(wc -c < "$OUT") bytes)"
  exit 0
fi
echo "Downloading Inter woff2…"
curl -fsSL -o "$OUT" "$URL"
echo "Saved $OUT ($(wc -c < "$OUT") bytes)"
