# Plan: macOS Tahoe "Liquid Glass" refinement pass for the portfolio

## Context

`portfolio-cloudflare` is already a mature build of the **Lumora** template
([docs/template-prompt-getlayers.ai-lumora-template.md](../../app/host/www/p/portfolio-cloudflare/docs/template-prompt-getlayers.ai-lumora-template.md)),
filled with Saniyat Hossain's real CV content and deployed on Cloudflare Workers. It already
has a liquid-glass design system in [public/assets/css/styles.css](../../app/host/www/p/portfolio-cloudflare/public/assets/css/styles.css)
(aurora field, `.glass-panel`/`.glass-card`, pointer-tracked `.spec` specular, expand-on-hover
`.brand-pill`, glass header, liquid hero, experience timeline, SF Pro/SF Mono system fonts,
Alpine + Motion One).

The goal is **not** a rebuild. It is a targeted **refinement pass** that fuses the more
authentic macOS-Tahoe polish proven in the sibling project
`/Users/bs01616/app/host/www/bs23/cursor-presentation` (the "Liquid Glass" deck) into this
portfolio, **while keeping the Lumora template theme, the warm copper brand, all content, and
the existing DOM structure**. The felt outcome: softer/soothing "framer-grade" transitions,
frosted-glass depth with a proper top specular film, an Apple-authentic ambient palette, and
pills whose hover/focus feel calm and premium.

Decisions confirmed with the user:
- **Scope:** refinement in place (no structural/section changes, low risk).
- **Theme:** keep **light-only** (dark mode / toggle stays out of scope).
- **Experience:** keep the current glass timeline and polish it (it is richer than the
  template's "Selected Work" cards); reconcile the stale gaps doc.

### What cursor-presentation contributes (reference patterns)
- Authentic Tahoe deceleration curve `--ease-glass: cubic-bezier(.32,.72,0,1)` and
  `--ease-smooth: cubic-bezier(.22,.61,.36,1)`.
- A **soft-light top specular film** on glass (`::after`, `linear-gradient(180deg, sheen 0%,
  transparent ~22%)`, `mix-blend-mode: soft-light`) + GPU hints (`translateZ(0)`, `contain:paint`).
- The macOS Tahoe **system palette** (`--t-blue #0A84FF`, `--t-indigo #6E6CF0`,
  `--t-purple #BF5AF2`, `--t-pink #FF5C8A`, `--t-teal #3FD0E0`, `--t-cyan #64D2FF`,
  `--t-orange #FF9F0A`, `--t-mint #5FE0C6`).
- `.chip-link` pill hover: gentle `translateY(-2px)` + **colored glow** shadow + inset colored
  ring + an arrow that expands in — the "soothing pill" reference.
- Soft-spring Motion reveal (`visualDuration: 0.5, bounce: 0.18`, staggered).

## Approach (all in the portfolio repo)

### 1. Retune motion tokens — the highest-leverage change
File: `public/assets/css/styles.css` (`:root`).
- Set `--ease-glass: cubic-bezier(.32,.72,0,1)` (currently `.33,1,.38,1`). This single token
  already drives `.glass-card`, `.hero-card`, `.create-band__tile`, `.brand-pill`, so retuning
  it globally softens motion into the Tahoe "settle."
- Add `--ease-smooth: cubic-bezier(.22,.61,.36,1)`; use it (with `--ease-reveal`) for scroll
  reveals / stagger so entrances read soothing rather than snappy.
- Nudge reveal durations slightly longer where they currently feel quick; keep values in the
  existing `--dur-*` tokens so the change is centralized.

### 2. Frosted-glass material upgrade
File: `public/assets/css/styles.css` (glass primitives).
- Add a subtle **soft-light specular film** to `.glass-panel`, `.glass-card`, `.glass-pill`,
  `.hero-card` (a second pseudo-element or extend existing `::before`), matching the
  cursor-presentation top-down sheen — this is what gives the authentic frosted top edge.
- Retune `--glass-blur` toward `blur(24px) saturate(200%)` and `--glass-blur-lg` proportionally
  (currently 28/40px, 210/220%) for the Tahoe look; keep the reduced-blur mobile fallback.
- Add GPU hints (`transform: translateZ(0); contain: paint;`) to the glass primitives for
  smoother compositing.
- Optional: add a reusable `.sheen` sweep utility (skewed gradient sliding on hover) for CTAs
  and the hero card, mirroring cursor-presentation.

### 3. Pills — soothing hover/focus (explicit user focus)
File: `public/assets/css/styles.css` (`.brand-pill*`, `.pill-btn-*`, `.partner-pill`,
`.exp-row__type`, `.exp-group__tenure-badge`, nav pills).
- Re-time the existing expand-label + sheen-sweep + `.spec` specular + spring-lift to the new
  `--ease-glass`/`--ease-pill-expand` so the lift and label reveal feel calm, not jumpy.
- Introduce a soft **brand-colored glow** on hover consistent with `.chip-link`
  (`box-shadow: 0 8px 24px -8px color-mix(var(--brand)…)` + inset colored ring), building on the
  pill's current `color-mix` shadow.
- Ensure `:focus-visible` **fully mirrors** `:hover` (lift + label expand + glow + ring) so
  keyboard users get the same soothing motion — verify parity, not just the focus ring.
- Apply the same calm treatment to the CTA pills (`pill-btn-dark`, `pill-btn-glass`,
  `pill-btn-outline`) and the small status pills for consistency.
- Keep every hover/focus effect inside the existing `prefers-reduced-motion` guards.

### 4. Ambient palette → Tahoe-aligned (keep copper brand)
File: `public/assets/css/styles.css` (`:root` aurora tokens + `body::before`, `.stats-panel`,
`.hero__glow`).
- Shift the ambient aurora hues (`--c-violet/-blue/-cyan/-teal/-amber/-rose`) toward the Tahoe
  system palette values for a more Apple-authentic ambient light that the glass refracts.
- **Keep `--accent` copper (`#b15f2c`) as the brand anchor** and the warm gradient stops — this
  preserves the Lumora template theme; Tahoe hues stay as ambient light + tints only.

### 5. Soften the JS springs
File: `public/assets/js/motion.js`.
- Retune `springSnappy`/`springSoft` toward the cursor-presentation soft spring (lower
  stiffness, gentle bounce ~0.18) so magnetic CTAs, hero-card tilt, and pointer specular feel
  calmer. Keep the existing structure and the reduced-motion early-return.
- Optionally lower magnetic `strength` for a gentler pull. `.spec` tracking is unchanged.

### 6. Experience timeline polish (chosen option)
Files: `public/assets/css/styles.css` (`.exp-*`), `public/assets/js/app.js` (`toggleRole`).
- Apply `--ease-glass` to `.exp-row` hover-fill, `.exp-group` and the expand/collapse; align the
  hard-coded cubic-beziers in `toggleRole` height animation to the Tahoe curve so expand feels
  of a piece with the rest.
- Give the employment-type pills (`.exp-row__type`), tenure badges, and the in-role stack/AI
  `.brand-pill` rows the same refined soothing hover/focus from step 3.

### 7. Fonts (minor)
- Already the SF Pro / SF Mono system stack (Tahoe-native, zero network cost) — **keep, do not
  add a web font** (protects CSP/PageSpeed). Optionally fine-tune `letter-spacing`/optical sizing
  on display headings toward cursor-presentation values (`titles ~-0.025em`).

### 8. Reconcile stale docs
Files: `docs/aidlc/04-gaps.md` (+ note in `docs/aidlc/05-redesign-liquid-glass.md` /
`01-design-system.md`).
- Update the inaccurate lines ("Portfolio 4 dark cards | Implemented from projects.json",
  "Services section between Portfolio and Experience") to reflect reality: there is no
  `projects` data; the **Experience** timeline is the deliberate substitute for the template's
  "Selected Work" section, and current order is Hero → About → CreateBand → Services →
  Experience → Skills → Stats → Education.
- Document the new/retuned Tahoe tokens (easing, specular film, ambient palette) in the design
  system doc so future edits stay coherent.

## Constraints to honor (bake in)
- **No inline `style=""` in HTML** (project rule). JS `el.style.setProperty` and Alpine `:style`
  bindings are fine and already used — reuse those, don't author inline HTML styles.
- **CSP / Worker untouched.** No new external requests (no web fonts, no CDNs) — keep system
  fonts + local assets so PageSpeed and the CSP in `src/index.js` are unaffected.
- **Single content source:** `public/assets/data/portfolio.json` via `data.js` — no fabricated
  content, no new sections.
- **Responsiveness:** keep the rem/vw adaptive grid and the reduced-blur mobile fallback; verify
  hero, pills-wrap, and experience at 360 / 768 / 1024 / 1440+.
- **Reduced motion:** every new animation must sit inside the existing
  `@media (prefers-reduced-motion: reduce)` guards.
- Reuse existing helpers rather than adding new ones: `.spec` + `motion.js` `specular()` for
  pointer highlight, `reveal.js` IntersectionObserver reveal/stagger/count-up, `--reveal-delay`
  token, `brandOf()` for pill colors, `iconSvg()` for icons.

## Critical files
- `public/assets/css/styles.css` — **primary**: tokens, glass material, pills, palette,
  experience.
- `public/assets/js/motion.js` — soften spring configs.
- `public/assets/js/app.js` — align `toggleRole` expand easing (minor).
- `docs/aidlc/04-gaps.md` (+ `05-redesign-liquid-glass.md` / `01-design-system.md`) — reconcile
  + document tokens.
- `build-css.sh` — run only if any HTML **Tailwind utility** classes change (most work is in
  custom `styles.css` classes, so a rebuild is likely unnecessary).

## Verification
1. If any Tailwind utility classes in HTML changed: `./build-css.sh` (downloads the standalone
   CLI on first run).
2. Serve locally: `npx wrangler dev` (matches production) or
   `python3 -m http.server 8080 --directory public`; open the printed URL.
3. Manual QA:
   - Loader → hero line-reveal plays; hero liquid cursor-reveal works.
   - **Pills:** hover feels calm; `Tab` through pills confirms `:focus-visible` mirrors hover
     (lift + label expand + glow + ring). Check brand pills, CTA pills, employment/tenure pills.
   - Glass panels/cards show the frosted top specular film; experience rows expand/collapse
     smoothly with the new easing.
   - Toggle OS **Reduce Motion** → animations/orbs are disabled, content is fully visible.
   - Responsive at 360 / 768 / 1024 / 1440+ (DevTools) — nothing clips; blur reduced on mobile.
4. Regression: run Lighthouse / PageSpeed on the local build and confirm Performance, SEO, and
   Best-Practices scores are unchanged or better; confirm no new network requests and no CSP
   violations in the console.
