#!/usr/bin/env bash
# Build Tailwind CSS using the standalone CLI binary (no npm/node_modules).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BIN="$ROOT/bin/tailwindcss"
OUT="$ROOT/public/assets/css/tailwind.css"

if [[ ! -x "$BIN" ]]; then
  ARCH="$(uname -m)"
  mkdir -p "$ROOT/bin"
  if [[ "$ARCH" == "arm64" ]]; then
    curl -fsSL -o "$BIN" "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.19/tailwindcss-macos-arm64"
  else
    curl -fsSL -o "$BIN" "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.19/tailwindcss-macos-x64"
  fi
  chmod +x "$BIN"
fi

"$BIN" -i "$ROOT/tailwind.input.css" -o "$OUT" --minify -c "$ROOT/tailwind.config.js"
echo "Built $OUT"
