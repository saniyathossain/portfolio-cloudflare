#!/usr/bin/env bash
# Vendor the self-hosted woff2 fonts (latin, variable) used by the site and the outage pages.
#  - Inter: downloaded once from jsDelivr (fontsource).
#  - Geist + Geist Mono (outage pages, doc 64/66): copied from the pinned @fontsource-variable devDependencies.
# Files are committed, so this is a no-op once they exist.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/assets/fonts"
mkdir -p "$OUT_DIR"

INTER="$OUT_DIR/inter-latin.woff2"
INTER_URL="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.2.8/files/inter-latin-wght-normal.woff2"
if [[ -f "$INTER" && -s "$INTER" ]]; then
  echo "Font exists: $INTER ($(wc -c < "$INTER") bytes)"
else
  echo "Downloading Inter woff2…"
  curl -fsSL -o "$INTER" "$INTER_URL"
  echo "Saved $INTER ($(wc -c < "$INTER") bytes)"
fi

copy_font() { # <output file> <node_modules source>
  local out="$OUT_DIR/$1" source="$ROOT/node_modules/$2"
  if [[ -f "$out" && -s "$out" ]]; then
    echo "Font exists: $out ($(wc -c < "$out") bytes)"
  elif [[ -f "$source" ]]; then
    cp "$source" "$out"
    echo "Copied $out ($(wc -c < "$out") bytes)"
  else
    echo "Missing $source — run npm install" >&2
    exit 1
  fi
}
copy_font geist-latin.woff2 "@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"
copy_font geist-mono-latin.woff2 "@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"
