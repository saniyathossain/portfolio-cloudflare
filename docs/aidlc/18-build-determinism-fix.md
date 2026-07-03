# 18 — Build determinism: stop per-build git churn + JPEG generation loss

## Problem
Every `./build.sh` dirtied the same files even with no source change — `tailwind.css`, the 3 PNG icons,
`saniyat-hossain.jpg`, `saniyat-hossain.webp`, `sw.js` — and one of the causes was **destroying image quality**.

Root causes (verified):
1. **Time-based SW version.** `hash-sw.js` set `CACHE_VERSION = sha256(Date.now())` → changed every build
   unconditionally, and needlessly re-invalidated every user's cache.
2. **In-place JPEG re-encode.** `optimize-images.js` ran `sips -Z 1600 … formatOptions 82` on
   `saniyat-hossain.jpg`, which is both source and output. Re-encoding the same file twice produced different bytes
   (`f732fdec…` → `94960fa8…`) → git churn **and cumulative generation loss** (690 KB initial commit → 422 KB now).
   The WebP + PNG icons derive from that JPEG, compounding the loss.
3. `tailwind.css` — deterministic (pinned Tailwind v3.4.17 `--minify`); only changes on real class changes. Benign.

**Quality answer:** before, YES it degraded every build. After this fix, NO — the JPEG is an immutable master, and
each derivative is a single lossy step from it, regenerated only when the master changes.

## Decisions (user)
- **Minimal patch**, keep committing generated assets.
- `public/assets/img/saniyat-hossain.jpg` **is the original/master** — never write to it.

## Changes
### `scripts/hash-sw.js` — content hash, not `Date.now()`
`CACHE_VERSION` is now a sha256 over the bytes of all shipped assets (`public/` walked in sorted path order, skipping
`sw.js` and `*.map`), first 12 hex. Changes only when a served asset actually changes → correct cache-busting, no
spurious diff.

### `scripts/optimize-images.js` — never mutate the master; regenerate only on change
- Removed the in-place JPEG re-encode.
- Added an idempotent guard via a gitignored cache `scripts/.img-cache.json`: each derivative
  (`saniyat-hossain.jpg → .webp` + 3 icons, `og-image.jpg → og-image.webp`) is regenerated only if the **source
  content-hash** changed or the output is missing. Unchanged master → nothing written.

### `.gitignore`
Ignore `scripts/.img-cache.json`.

## Verify
Run `./build.sh` twice; after the 2nd run `git status --short` shows no modified assets. `shasum` of
`saniyat-hossain.jpg` is identical before/after any build (zero generation loss). Editing a class or the JPEG changes
only the affected outputs + `CACHE_VERSION`; a subsequent rebuild is clean again.
