#!/usr/bin/env bash
# Median-friendly Lighthouse comparison: N mobile runs for each "name=url" argument, same machine, same flags.
#   scripts/lh-runs.sh 3 legacy=http://127.0.0.1:8801/ new=http://127.0.0.1:8803/
set -euo pipefail
RUNS="$1"; shift
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$(mktemp -d)"
for run in $(seq 1 "$RUNS"); do
  for target in "$@"; do
    name="${target%%=*}"; url="${target#*=}"
    npx lighthouse "$url" --quiet --chrome-flags="--headless=new" --output=json \
      --output-path="$OUT/${name}_${run}.json" --only-categories=performance >/dev/null 2>&1
    node -e "const r=require('$OUT/${name}_${run}.json');const a=r.audits;console.log('${name} run${run}'.padEnd(12),'perf',Math.round(r.categories.performance.score*100),'| FCP',a['first-contentful-paint'].displayValue,'| LCP',a['largest-contentful-paint'].displayValue,'| TBT',a['total-blocking-time'].displayValue,'| CLS',a['cumulative-layout-shift'].displayValue)"
  done
done
