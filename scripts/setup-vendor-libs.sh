#!/usr/bin/env bash
# Vendor Alpine.js + Motion (self-hosted, no CDN at runtime — PageSpeed/CSP-friendly).
# Mirrors setup-fonts.sh's pattern: pin an exact version here, fetch once, skip if present.
# To bump a version: edit the URL below, delete the matching file in vendor/, re-run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/assets/js/vendor"
mkdir -p "$OUT_DIR"

fetch() {
  local url="$1" out="$2"
  if [[ -f "$out" && -s "$out" ]]; then
    echo "Exists: $out ($(wc -c <"$out") bytes) — delete to re-fetch"
    return 0
  fi
  echo "Downloading $(basename "$out")…"
  curl -fsSL -o "$out" "$url"
  echo "Saved $out ($(wc -c <"$out") bytes)"
}

# Alpine "cdn" build: self-initializes via queueMicrotask(Alpine.start()) — required since this
# project loads it with a plain <script> tag, not an ESM import (see boot.js's loadScript order).
fetch "https://cdn.jsdelivr.net/npm/alpinejs@3.15.12/dist/cdn.min.js" "$OUT_DIR/alpine.min.js"

# Motion: pinned to the 11.x line, NOT latest (12.x roughly doubles this bundle's size — 140KB vs
# 63KB — for gesture-callback changes this project's motion.js never uses; only animate() with
# spring configs is called). Re-evaluate the size trade-off before ever moving to a 12.x major.
fetch "https://cdn.jsdelivr.net/npm/motion@11.18.2/dist/motion.min.js" "$OUT_DIR/motion.min.js"
