# 13 — Partner round avatars (hover-expand) + Tahoe frosted splash

> **Superseded (partners UI):** Current hero uses `.partner-pill` (logo + visible name). See
> `15-agent-context-partner-pill-revert.md`. Loader splash section below remains valid.

Two hero/splash refinements.

## 1. Hero "Worked with" partners — round glossy avatars, hover-expand name
Earlier iterations (neutral logo strip; before that, rainbow-tinted circles) missed. Final direction (confirmed):
**style like the "What I build" icon tiles (shiny/glossy), round like an avatar, and expand on hover to reveal the
company name like the stack pills.**

- Reuses the existing `.brand-pill` machinery (`styles.css:1481`) — a round glossy pill that already collapses to a
  perfect circle and hover-expands its `.brand-pill__label` (grid `0fr→1fr`) with a sheen sweep + lift. So partners
  get the avatar shape + stack-style hover-expand for free.
- Markup (`public/index.html`): `<span class="brand-pill brand-pill--partner spec" :title="p.name">` with a
  `brand-pill__badge` (logo `img`) + `brand-pill__label` (company name). No per-partner rainbow `--brand`.
- CSS: `.brand-pill--partner` sets a **neutral cool shine** (`--pill-top:#fff; --pill-bot:#eef1f6; --brand:#8494a8`)
  so the real coloured logos read; logo sized `1.3rem`. Replaces the interim `.partner-tile`.
- Result: a row of clean glossy round logo avatars; hover/focus expands one into a capsule showing the company name.

## 2. Splash / loader — macOS Tahoe frosted glass
The intro loader already blurs the site behind it (`.loader` `backdrop-filter: blur(22px)`). Made it more premium
**without a second backdrop-filter** (PageSpeed-safe — the panel is a translucent overlay on the already-blurred bg):
- `.loader__panel` — a new wrapper around the brand/tagline + progress (`public/index.html`), styled as a Tahoe glass
  card: translucent white gradient, hairline border, inset top highlight, deep soft shadow, rounded `1.9rem`.
- `.loader::before` aurora enriched to the Tahoe system hues (cyan/teal/copper/indigo orbs) with a gentle
  `loaderAurora` drift, disabled under `prefers-reduced-motion`.

## Constraints honoured
- No inline `style=""`; custom classes + tokens → **no Tailwind rebuild**. No new network requests (no assets/fonts).
  The loader is a removed overlay (not LCP) and adds no extra backdrop-filter → **Google PageSpeed unaffected**.
  CSP/Worker untouched; light-only; reduced-motion + responsive preserved.

## Verify
Serve + hard-refresh (⌘⇧R): partners are round glossy avatars that expand to the company name on hover/focus; the
loader shows a frosted Tahoe glass card over a softly drifting aurora, then slides up. Lighthouse Perf/SEO/BP/A11y
unchanged-or-better; no new requests; CSS braces balanced.
