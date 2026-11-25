# 67 — Cleanup: dead code, dead data, duplicates, stale files

**Date:** 2026-11-25 · **Status:** applied (uncommitted until the owner says so)

Method (no extra tooling installed): TypeScript `noUnusedLocals`/ESLint, plus local scripts that scan `src/`, `scripts/` and `tests/` for
exports never referenced elsewhere, files never imported, `package.json` dependencies never mentioned, JSON keys never read, and repeated
7-line blocks.

## Removed
| What | Why |
|---|---|
| `public/_headers` | Stale Cloudflare Pages-style fallback (still listed `'unsafe-eval'` and old GA hosts). The Worker runs first (`run_worker_first = true`) and sets every security header itself. Verified with `wrangler dev`: response headers for `/`, a CSS asset, a font and an error page are **identical with and without** the file (CSP, COOP, HSTS, X-Frame-Options, Permissions-Policy, Cache-Control). |
| `errors.json` / schema: `terminal.{windowTitle,userName,hostName,promptSymbol,labels,unknownValue,footer}`, per page `event, actor, reason, hint, command`, per action `description` | Left over from the first shell-terminal design; nothing in the code, markup or tests reads them. The strict schema would have kept demanding them. |
| `.actions .desc { display:none }` | Styled an element that no longer exists. |
| `forceReflowWidth` (client DOM helper) | Never called. |
| Types `BotSignature`, `NavItem`, `Partner`, `SkillGroup`, `BrandEntry`, `ErrorPage` | Declared, never imported. |
| `export` on file-private constants (`ROLE_*_ID_PREFIX`, `EMPTY_TENURE`, `GUARD_STATUS`, `CHROME_PATH`, `PUBLIC`) | Smaller public surface; no behaviour change. |
| Duplicate `FORCE_VISIBLE_CSS` in `measure-gaps.ts` and `section-heights.ts` | One shared constant in `scripts/lib/browser.ts`. |

## Checked and kept
- No other duplicated blocks (≥ 7 lines) exist in `src/`, `scripts/`, `tests/`; the earlier reduced-motion / action-name / status-code
  duplication was removed in docs 62–66.
- Every `devDependency` is used (`@astrojs/check`, `prettier*` by npm scripts, `lighthouse` by `scripts/lh-*.sh`, fonts by `setup-fonts.sh`).
- CSS coverage of `styles.min.css` on desktop (scroll + modal open, one viewport, no hover): **62 %** used, inline critical CSS 77 %. The rest is
  mobile breakpoints, hover/focus states and the outage-only rules, so it is not removable without a risky purge; left alone.
- Worker bundle 65 KiB / 18.5 KiB gzip; client JS 11 bundles ≈ 53 KB total.

## Removed after the owner's go-ahead
- `docs/REBUILD-PLAN.md` and `docs/template-prompt-getlayers.ai-lumora-template.md` (46 KB): old planning/prompt files nothing used; the two
  mentions in `docs/design.md` now say the originals were removed. Both stay in git history.
- Local, gitignored (not in git, so not recoverable): `legacy/` (136 KB old template copy) and `bin/tailwindcss` (46 MB standalone binary from
  before the npm Tailwind CLI).
