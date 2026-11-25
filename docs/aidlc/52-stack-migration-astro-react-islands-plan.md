# 52 — Stack direction: package.json + TypeScript now, Astro + React islands + shadcn next (plan)

**Date:** 2026-11-24 · **Status:** decision record + plan — nothing executed yet

## Context

The owner asked whether the site should move to an npm/`package.json` toolchain, whether Rust is warranted on the
backend, whether TypeScript + React beat Alpine, and — key requirement — said they **may need shadcn and other
React-based libraries**. All of it must keep running on the **Cloudflare free tier** with the same Worker.

Current facts this plan rests on (measured/read this session):
- Build pulls tools three ways: unpinned `npx esbuild` / `npx wrangler`, a curl-downloaded Tailwind v3.4.19 binary
  in `bin/`, and macOS-only image tools (`sips`, `cwebp`, ImageMagick) in `optimize-images.js`.
- A full page load makes **63 same-origin requests**; `run_worker_first = true` routes every one through the Worker
  (each counts toward the free 100k/day).
- Worker CPU per request is well under 1 ms (static passthrough + headers + small JSON merge + contact form).
- Last live Lighthouse (doc 50): mobile **69**, desktop **92**; bottleneck is Alpine's init walk + style/layout on
  mobile, not network or server.

## Decisions

| Question | Decision | Why |
|----------|----------|-----|
| `package.json`? | **Yes — dev tooling only** | Pinned, reproducible builds (`npm ci`), standard scripts, Dependabot. Zero runtime/PageSpeed effect. |
| Rust backend? | **No** | Worker is I/O-trivial; Rust → WASM adds bundle size/cold start and build complexity for no user-visible gain. Rust/Go already help as *tools* (esbuild, Tailwind v4 Oxide). |
| React SPA / Next.js? | **No** | Whole-page hydration + ~45 KB gz runtime: same or worse mobile PageSpeed than Alpine for a content site. |
| TypeScript? | **Yes** | Maintainability (typed `portfolio.json`, safer refactors). Types are stripped at build — no runtime cost. |
| shadcn / React libs? | **Astro + React islands** | Astro renders static HTML at build time (no JS by default); React loads only inside islands (`client:idle` / `client:visible`). shadcn has an official Astro setup. |

## Target architecture

```
astro build  ─►  dist/  (static HTML/CSS/JS/images)  ─►  Workers Static Assets
                                                     └─►  src/index.js Worker (unchanged role:
                                                           CSP/security headers, /api/contact,
                                                           MAINTENANCE_MODE, flag merge)
```

- **Static (no JS):** hero copy, About, skills strip, education, footer — `.astro` components fed by
  `portfolio.json` at build time (replaces `data.js` runtime fetch and `scripts/sync-head.js`).
- **React islands (shadcn):** contact modal (Dialog), menu drawer (Sheet), editorial tabs, experience accordion,
  tooltips/popovers.
- **Kept:** `styles.css` Liquid Glass tokens/classes, motion/aurora/reveal scripts (as plain TS modules), local
  fonts/icons, no new runtime network requests, `prefers-reduced-motion` gating.
- **No Cloudflare adapter** — static output only. `wrangler.toml`: `assets.directory = "./dist"`.
- **`run_worker_first`** → `["/", "/api/*"]` (or equivalent) so asset requests bypass the Worker (free + unlimited);
  move asset cache/security headers to `_headers`.
- **Images:** Astro `astro:assets` (sharp) replaces macOS-only tooling — works on Linux CI.

## Phases

### Phase 0 — toolchain (low effort, do first)
- `package.json` with pinned devDependencies: `wrangler`, `esbuild`, `tailwindcss@3.4.19` (v4 later with shadcn),
  optional `sharp`; `package-lock.json` committed.
- npm scripts `dev` / `build` / `deploy` wrapping the existing steps; `build.sh`/`deploy.sh` become thin wrappers.
- Drop the curl Tailwind download; fix the stale `skills-scroll.js` entry in `scripts/minify-js.js`.
- Optional: `tsconfig.json` + `tsc --noEmit` with JSDoc/`.ts` adoption file by file; a `portfolio.json` type.

### Phase 1 — Astro shell (parallel, no behaviour change)
- Scaffold Astro + TypeScript in-repo; port `index.html` to `.astro` layout + section components fed by
  `portfolio.json`; port `<head>` generation from `sync-head.js`.
- Keep Alpine temporarily inside the Astro output to reach visual parity before swapping interactivity.

### Phase 2 — islands
- Tailwind v4 + shadcn init; restyle shadcn primitives with the Liquid Glass tokens (no stock shadcn look —
  shiny-chip/brand-pill language is non-negotiable per doc 15).
- Replace Alpine features one by one with React islands; remove Alpine when the last one lands.

### Phase 3 — deploy + verify
- Point `wrangler.toml` at `dist/`, narrow `run_worker_first`, `_headers` for assets.
- Workers Builds (if git-connected): build `npm run build`, deploy `npx wrangler deploy`.
- Lighthouse mobile/desktop vs doc 50 baseline; 360/768/1024/1440 sweep; CSP still strict (React islands need no
  `unsafe-eval`).

## Free-tier fit

| Limit (free) | Expected |
|--------------|----------|
| 100k Worker requests/day | Only `/` + `/api/*` hit the Worker after Phase 3; assets are free/unlimited |
| 10 ms CPU/request | < 1 ms |
| Static asset file ≤ 25 MiB | Site ≈ 4 MB total |
| Workers Builds 3,000 min/month | Astro build ≈ 1 min |

## Relationship to doc 50

Doc 50's Alpine-specific perf work (lazy-mount overlays, Alpine init cost) is **superseded** if Phase 1–2 go
ahead. Still valid regardless of stack: disable Cloudflare **AI Crawl Control** (dashboard; blocks SEO 100),
the colour-contrast fix, hero srcset fix, 768px tablet polish, the no-nested-loops convention (doc 48 rule 3).

## Agent skills installed for this work (2026-11-24)

| Skill | Source | Use |
|-------|--------|-----|
| `astro` | `astrolicious/agent-skills` | Astro components, islands, static deploy |
| `shadcn` | `shadcn-ui/ui` (official) | shadcn init/add, theming with Liquid Glass tokens |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | React island performance patterns |
| `workers-best-practices` | `cloudflare/skills` (official) | Worker config, static assets, `run_worker_first` |

Layout: folder in `.agents/skills/<name>`, symlink `.claude/skills/<name>`, entry in `skills-lock.json`. Only the
lock (plus vendored `impeccable`) is committed — the update pulled ~43 MB / 1.6k asset files into
`design-taste-frontend` alone, so third-party skill folders are gitignored and restored with
`npx skills experimental_install`.
The stale duplicate `agent/skills/` (old copies of 21 video skills already present in `.agents/skills/`) was removed.

## Open questions for the owner
- Go-ahead and timing for Phase 0 vs. Phase 1.
- Which shadcn components are actually wanted first (drives island order).
- Whether Workers Builds (git-connected auto-deploy) is in use, or deploys stay manual via `deploy.sh`.
