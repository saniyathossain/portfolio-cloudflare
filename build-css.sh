#!/usr/bin/env bash
# Build Tailwind CSS using the standalone CLI binary (no npm/node_modules).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/public/assets/css/tailwind.css"

# Pick the standalone CLI for the CURRENT OS + arch. Detecting the OS matters: local dev may be macOS
# or Windows (Git Bash), but CI (Cloudflare Workers Builds) runs on Linux x64 — a mismatched binary
# fails with "cannot execute binary file: Exec format error".
EXT=""
case "$(uname -s)" in
  Darwin) PLAT="macos" ;;
  Linux)  PLAT="linux" ;;
  MINGW*|MSYS*|CYGWIN*) PLAT="windows"; EXT=".exe" ;;
  *) echo "build-css: unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64|aarch64) CPU="arm64" ;;
  x86_64|amd64)  CPU="x64" ;;
  *) echo "build-css: unsupported arch $(uname -m)" >&2; exit 1 ;;
esac
BIN="$ROOT/bin/tailwindcss${EXT}"

# -s: exists and non-empty (cross-platform; avoids relying on the executable bit under Git Bash).
if [[ ! -s "$BIN" ]]; then
  mkdir -p "$ROOT/bin"
  curl -fsSL -o "$BIN" \
    "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.19/tailwindcss-${PLAT}-${CPU}${EXT}"
  chmod +x "$BIN" 2>/dev/null || true
fi

"$BIN" -i "$ROOT/tailwind.input.css" -o "$OUT" --minify -c "$ROOT/tailwind.config.js"
echo "Built $OUT"
