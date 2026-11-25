# 65 — Data source comparison: JSON vs YAML vs SQLite (D1)

**Date:** 2026-11-25 · **Status:** analysis (no migration done)

## Where data lives today
| Data | Where | Read when |
|---|---|---|
| CV / site content | `public/assets/data/portfolio.json` (30 KB) | **build time** (Astro renders static HTML) |
| UI copy, brands, icons, errors, security, logging, client signatures | `src/content/*.json` (≈ 55 KB total, `icons.json` 30 KB) | build time; the Worker bundles only `security`, `logging`, `errors`, `clientSignatures` |
| Contact submissions, logs, rate-limit counters | optional KV / D1 bindings (`CONTACT_KV`, `LOG_KV`, `LOG_DB`, `RATE_LIMITER`) | runtime |

Everything is validated by Zod in `src/repositories/ContentRepository.ts`. The deployed Worker is **65 KiB / 18.5 KiB gzip**
(`wrangler deploy --dry-run`); the content never loads at runtime on page views because pages are prerendered.

## Cloudflare Free-plan numbers used below
100 000 requests/day · 10 ms CPU per request · Worker size 3 MB (Free) · D1: 5 M rows read/day, 100 k rows written/day, 5 GB ·
KV: 100 k reads/day, **1 000 writes/day**, 1 GB. Source: Cloudflare Workers / D1 / KV limits docs (checked 2026-11-25; the docs
page showed two different Worker-size figures, so confirm before depending on it).

## Comparison
| Criterion | JSON (current) | YAML | SQLite (D1 / local `.sqlite`) |
|---|---|---|---|
| **Runtime performance** | Best: imported at build, inlined; zero parse cost on page views | Same if converted to JSON at build; a runtime YAML parser (≈ 25–40 KB) would burn Free-plan CPU | Query round-trip per read (≈ ms, network to D1); worst for content that never changes between deploys |
| **Build performance** | Instant | Parse at build: negligible | Needs a DB step in the build (seed + query); slower, more moving parts |
| **Worker bundle (Free 3 MB)** | +55 KB raw if bundled | +parser size if parsed at runtime | None for content, but needs a D1 binding |
| **Free-tier compatibility** | Fully compatible, no quota used | Compatible if converted at build; risky if parsed per request | Compatible (D1 5 M reads/day) but one more service to create, bind and migrate |
| **Editing / maintainability** | Good: Zod-validated, typed; no comments, no multi-line strings, trailing commas break | Best for humans: comments, multi-line text, less quoting; type quirks (`no`/`yes`, dates) | Poor for prose: rows + migrations; needs an admin UI or SQL to edit |
| **Diff / review in git** | Excellent (text diff) | Excellent | Poor (binary file) or migration scripts |
| **Schema safety** | Zod already in place | Same Zod after parse | Strong constraints in SQL, plus Zod at the edge |
| **Dynamic / relational data** (logs, submissions, counters) | Not suitable | Not suitable | **Best fit**; D1 write quota (100 k/day) far above KV (1 k/day) |
| **Local dev & tests** | Trivial | Trivial | Needs `wrangler d1 … --local` or a seed script |
| **Static-site / SEO fit** | Perfect (content rendered at build) | Perfect | Adds a build dependency for no benefit |
| **Migration effort from today** | None | Low (convert files, add build step) | High (schema, seed, queries, repositories) |

## Recommendation
1. **Keep JSON for content and config.** It is the fastest, simplest, Free-plan-safe option and already typed and validated.
2. **Optional: YAML as an authoring format** only if comments and multi-line copy matter; convert to JSON in a build step so runtime
   cost stays zero (the `ContentRepository` already isolates the format).
3. **Use D1 (SQLite) only for runtime, write-heavy, queryable data**: logs and contact submissions. Prefer it over KV for logs
   because KV's 1 000 writes/day on Free is easy to exhaust under attack traffic. The repository layer (doc 66) makes this a binding swap.
4. Do not move portfolio content into SQLite: it adds latency, a binding and migrations for data that changes a few times a year.
