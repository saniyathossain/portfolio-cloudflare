#!/usr/bin/env bash
# Lighthouse mobile + desktop for several "name=url" targets, N runs each; prints one line per run and the medians.
#   scripts/lh-matrix.sh 3 legacy=http://127.0.0.1:8801/ new=http://127.0.0.1:8803/
set -euo pipefail
RUNS="$1"; shift
export CHROME_PATH="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$(mktemp -d)"
for form in mobile desktop; do
  extra=""; [ "$form" = desktop ] && extra="--preset=desktop"
  for run in $(seq 1 "$RUNS"); do
    for target in "$@"; do
      name="${target%%=*}"; url="${target#*=}"
      npx lighthouse "$url" --quiet $extra --chrome-flags="--headless=new" --output=json \
        --output-path="$OUT/${name}_${form}_${run}.json" >/dev/null 2>&1
    done
  done
done
node - "$OUT" "$@" <<'NODE'
const [dir, ...targets] = process.argv.slice(2);
const names = targets.map((t) => t.split("=")[0]);
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fs = require("node:fs");
for (const form of ["mobile", "desktop"]) {
  for (const name of names) {
    const runs = fs.readdirSync(dir).filter((f) => f.startsWith(`${name}_${form}_`)).map((f) => JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")));
    const pick = (fn) => median(runs.map(fn));
    const a = (r, id) => r.audits[id].numericValue;
    console.log(`${form.padEnd(8)} ${name.padEnd(8)}`,
      `perf ${pick((r) => Math.round(r.categories.performance.score * 100))}`,
      `a11y ${pick((r) => Math.round(r.categories.accessibility.score * 100))}`,
      `bp ${pick((r) => Math.round(r.categories["best-practices"].score * 100))}`,
      `seo ${pick((r) => Math.round(r.categories.seo.score * 100))}`,
      `| FCP ${(pick((r) => a(r, "first-contentful-paint")) / 1000).toFixed(2)}s`,
      `LCP ${(pick((r) => a(r, "largest-contentful-paint")) / 1000).toFixed(2)}s`,
      `TBT ${Math.round(pick((r) => a(r, "total-blocking-time")))}ms`,
      `CLS ${pick((r) => a(r, "cumulative-layout-shift")).toFixed(3)}`,
      `SI ${(pick((r) => a(r, "speed-index")) / 1000).toFixed(2)}s`,
      `bytes ${Math.round(pick((r) => a(r, "total-byte-weight")) / 1024)}KB`);
  }
}
NODE
