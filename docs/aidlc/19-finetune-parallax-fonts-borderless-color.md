# AIDLC 19 — Fine-tune: Parallax, Cross-platform Fonts, Borderless Glass, Color/Contrast/Depth, Richer Reveals

Follow-on polish pass after doc 18. Same hard constraints: **PageSpeed 100 (mobile+web)**, Tahoe theme, no new network, `styles.css`-only visual work (no new Tailwind classes), everything `prefers-reduced-motion` + `fine-pointer` gated, no fabricated content.

## Requests (from user) → workstreams

- **Parallax not visible** → decouple parallax from Motion One (it was disabled whenever Motion was absent), amplify the hero parallax, and add a generic `[data-parallax]` depth layer (footer watermark, decorative accents). "Incredible animations everywhere, no heavy resource" = transform-only, rAF-throttled, in-view-only, desktop-gated.
- **Borderless boxes** → drop the white `1px` borders on glass panels/cards/pills; keep edge definition via the tinted inset `--glass-highlight` + refined shadows.
- **Fonts identical on every platform (Mac/Win/Android/iOS/Linux)** → switch from system-first (SF Pro on Apple, Inter elsewhere → *different* per OS) to **self-hosted Inter as the primary face everywhere** (SIL-licensed; SF-Pro-adjacent). Preload the woff2, `font-display: swap`, add `size-adjust`/metric fallback to avoid CLS. (Reverses the doc-10 system-first optimization *by explicit request* for cross-platform consistency.)
- **More color / contrast / shadow / inset** → lift muted grays to section `--tint-deep` where legible, add tinted depth (inset + soft colored shadow) to cards/chips, more per-section color identity.
- **Richer, smooth text reveals** → extend blur/line/word reveals to more headings & lead copy; tune timing so it's silky, never sluggish (short durations, ease-out, small stagger).
- **More components (see how they fit)** → AnimatedLink underline, a thin scroll-progress bar, refined dividers/badges — tasteful, reversible experiments.
- **Responsive** → re-verify 360/390/768/1024/1440 after each change.

## Tranches

- **T1 — Parallax + Borderless** *(this pass)*: motion.js decouple+amplify+generic `[data-parallax]`; remove white borders on `.glass-panel`/`.glass-card`/`.hero-card`/`.partner-pill`/`.pill-btn-glass`/create-band light.
- **T2 — Cross-platform fonts**: Inter-first `--font-sans`, preload + `size-adjust` fallback, verify no CLS.
- **T3 — Color / contrast / depth**: tint-lifted text, tinted inset/shadow, per-section identity.
- **T4 — Reveals + components**: extend blur/line/word reveals; AnimatedLink underline; scroll-progress hairline.
- **T5 — Packaging**: one `?v=` cache-bust across changed CSS/JS (so returning users get it) **+** wire a safe CSS-minify build step (macOS Tailwind CLI, source→minified). Done last so it captures every change.

## Guardrails / verification (per tranche)

- Transform/opacity/filter only; parallax rAF-throttled, in-view-only, `finePointer && !reduced`.
- No `backdrop-filter` on scrolling surfaces (stays fixed-chrome only).
- Reduced-motion disables all; content fully visible.
- No new Tailwind classes in HTML → no `tailwind.css` rebuild.
- JS `node --check` + CSS brace balance after each tranche.
- Lighthouse (mobile+web) re-verified by user post-deploy; **run in Incognito** (extensions inflate "unused JS").
