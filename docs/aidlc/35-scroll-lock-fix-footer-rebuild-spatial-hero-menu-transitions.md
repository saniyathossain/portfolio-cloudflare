# 35 — Scroll-lock root cause, footer rebuild, spatial hero, real menu/modal transitions

## Get in touch / menu click was scrolling the page to top

Root cause, found in three iterations rather than guessed at once:

1. `.scroll-lock { overflow: hidden !important; }` on `<html>` resets `scrollTop` to 0 in Chromium
   the instant it's applied — confirmed via direct `scrollY` inspection, not assumed. That's what
   made opening the modal or the menu snap the page to the top.
2. First fix captured `window.scrollY` **after** the scroll-lock classes were already added — always
   captured 0, a self-inflicted ordering bug caught via `Alpine.$data()` direct-state debugging, not
   screenshots.
3. Second fix (capture-before-lock, `position: fixed` + negative `top`, `requestAnimationFrame`-deferred
   restore on unlock) worked for simple open/close but failed for the chained menu → modal handoff
   (`navGo`'s `action: "modal"` path): the rAF-deferred restore might not have fired yet by the time
   the modal re-locked 60ms later and captured a stale `scrollY` of 0. Caught via a real click-through
   test, not inspection.

Final fix in `app.js`: force a **synchronous** reflow (`document.body.offsetHeight`) before calling
`scrollTo` on unlock instead of waiting on `requestAnimationFrame`, and restructured `navGo()`'s modal
branch to never actually unlock/relock scroll during the menu → modal handoff — both states want it
locked, so the flags (`menuOpen`/`modalOpen`) just toggle directly while the lock stays continuously
active. Removes the race outright instead of trying to win it. Verified with a dedicated chained
menu → Contact → modal → close test alongside the existing open/close cases, run repeatedly for
consistency.

## The menu and modal were never actually running their own CSS transitions

While chasing "make the menu feel more fluid," direct inline-style inspection during the open/close
window turned up something more fundamental than a timing tweak: `.nav-overlay` and `.modal-backdrop`
both carry `x-show="..." x-transition` in the markup, and Alpine's **default** `x-transition` (150ms
enter / 75ms leave, `scale(0.95)`, its own easing) was firing on every open/close — completely
overriding the hand-authored CSS (`opacity 0.45s`/`0.55s` with per-item stagger on the menu; `opacity
0.4s` + a `translateY(28px)` spring slide-up on the modal panel). Confirmed by reading the element's
live `style` attribute mid-transition: Alpine had written `transition-duration: 0.15s` inline, not the
authored values. The carefully-tuned motion had never actually been shipping.

Worse for the modal specifically: because `x-show` toggles `display: none` and Alpine's `:class`
binding adds `.is-open` in the same tick, `.modal-panel`'s `translateY(28px)` resting state was never
painted before the class flipped it to `transform: none` — there was no "before" frame to transition
from, so the slide-up-with-spring simply never played at all (confirmed via `getComputedStyle` reading
`transform: none` at every sampled point during "open," never the pre-transition offset).

Fix: removed `x-show`/`x-transition` from both elements. The CSS already fully described the hidden
state correctly (`opacity: 0; pointer-events: none`), driven purely by the existing `:class="X &&
'is-open'"` binding — nothing needed to change there. Replaced `x-show`'s display-toggle (which also
handled removing the hidden overlay from keyboard focus/AT) with `:inert="!menuOpen"` /
`:inert="!modalOpen"`, verified directly: closed state blocks `.focus()` from landing and hides the
subtree from the accessibility tree; open state restores both. Re-verified the whole existing
scroll-lock regression suite (T1/T2/T3 plus the chained handoff test) afterward — zero regressions,
and the modal's spring slide-up now genuinely animates (`translateY(28px) → ~0` confirmed via a
mid-transition computed-style sample, not just a screenshot).

**Testing note**: this session's headless sandbox doesn't advance `scroll-behavior: smooth`-driven
`window.scrollTo()` calls (and, it turns out, even direct `scrollTop` assignment) without interleaved
`page.screenshot()` calls forcing real compositor frames — confirmed repeatedly by capturing several
consecutive `getComputedStyle` reads frozen at the pre-transition value, then a single forced-frame
read showing a fully mid-transition, internally-consistent state. Several apparent "the fix didn't
work" moments this round were this artifact, not real regressions; each was re-verified with forced
frames before being ruled a non-issue.

## Footer rebuilt: four real sections, no revealed email, no watermark

- Contact column no longer prints the raw email as visible text — icon + "Email"/"Call" labels
  (`mailto:`/`tel:` still functional), plus a third row (location) so Contact reads as substantial as
  Navigate/Elsewhere instead of a single lonely link.
- Added a real `phone` icon (fetched actual Lucide SVG source, this project's established convention
  for new icons rather than approximating paths) since a call icon didn't exist yet; `profile.phoneHref`
  was already computed in `data.js`, just unused until now.
- Removed `.site-footer__wm` (the giant faint "SANIYAT" background watermark) entirely — markup, CSS,
  and the now-dead `data-parallax` usage that drove it.
- Removed the `#ico-spark` sprite `<symbol>` and its one remaining usage (the star/spark mark beside
  "Saniyat" in the footer) — confirmed via grep this was the *only* remaining instance sitewide before
  deleting the symbol definition as dead code.
- Copyright row simplified from `flex-col ... sm:flex-row justify-between` (which only centered on
  mobile) to a plain always-centered row, matching "keep footer copyright part in middle" literally
  rather than just at one breakpoint.
- Footer icon-chips upgraded from bare borderless glyphs (`.site-footer .icon-chip--sm` used to force
  `border: none; background: transparent`) to the same real shiny icon-chip tiles used in Services/
  Code-Ship-Scale, with their own hover lift — the old flattening rule would have silently cancelled
  the new `icon-chip--on-dark` treatment via a higher-specificity descendant selector, the same
  cascade-collision class this project keeps hitting, caught before shipping rather than after.

## Floating scroll-to-top

New `.back-to-top` button (bottom-right, same black+copper glass-tile recipe as `.menu-btn`), visible
past a 560px scroll threshold via a `showBackToTop` Alpine flag set from an rAF-coalesced scroll
listener (same idiom `reveal.js`'s scroll-progress bar already uses). Click reuses the existing
`_liquidWarp()` flourish and scrolls to 0, mirroring `scrollTo(id)`'s pattern. Hidden whenever
`body.scroll-lock` is active so it can't fight the menu/modal overlays for attention. `:tabindex`
bound to the same visibility flag so it's not keyboard-reachable while invisible.

## iOS-style spatial parallax on the hero image

Added pointer-driven depth to the hero image layer (`#heroLiquid`): it drifts a few px opposite the
cursor, independent of (but composed with) the existing scroll-linked `--hero-liquid-y`. Deliberately
**not** built with Motion One's `animate()` — that writes a competing inline `style.transform` that
would silently clobber the scroll transform's CSS custom property, the exact collision class this
project keeps finding elsewhere. Instead, a small hand-rolled spring (`motion.js`'s `heroSpatial()`)
only ever writes `--hero-spatial-x/y`, and the CSS combines both offsets in one `translate3d()` via
`calc()`. Gated behind the existing `canEnhance` (desktop, fine pointer, motion-enabled) check, so
mobile and reduced-motion render byte-identical to the plain scroll transform (both custom properties
default to `0px`). The existing scroll-linked parallax between the image (`~0.08×`) and glow
(`~0.14×`) layers already covered the "parallax" half of the ask; this adds the pointer/depth half
that was actually missing.

## Icon interactions, made livelier where they were flat

Audited every icon-chip/interactive icon sitewide; left the ones that already had real hover
treatment alone (`.partner-orb`, `.social-link`, `.service-row__icon`, `.nav-overlay__item .icon-chip`)
and added independent hover motion only where an icon was previously just riding along with its
parent's motion or doing nothing at all: nav-desktop icons scale on hover, `.exp-row__icon` now pops
independently of the row's own `translateX`, `.create-band__icon` pops an extra `scale(1.12)
rotate(-4deg)` beyond the tile's own hover-scale, and `.modal-close` gets a `scale(1.1) rotate(90deg)`
tactile spin. Left static, non-interactive bullet icons (`.point-chip`, `.stats-panel__icon`) alone —
animating list markers reads as noise, not polish. Every addition has a paired
`prefers-reduced-motion` override, matching this file's per-component convention throughout.

## Performance check

No new network requests, images, or fonts. Bundle delta for this entire round: `styles.min.css`
+3.3KB, `app.min.js` +0.6KB, `motion.min.js` +0.6KB, `icons.min.js` +0.25KB raw — roughly 4.8KB total
before gzip/brotli. All new animated properties are `transform`/`opacity` only. The floating
back-to-top button is `position: fixed`, so it can't contribute to layout shift. Full manual audit
done in place of a Lighthouse run (not installed in this sandbox, and not fetched without asking) —
user will confirm the actual PageSpeed number against their own deploy.

## Verification

Full asset-version chain (`minify-css.js` → `set-asset-version.js` → `minify-js.js` → `sync-head.js`
→ `hash-sw.js`) re-run after every CSS/JS edit, confirmed single consistent `?v=` hash each time —
this project's `minify-css.js` step is easy to skip by habit since only JS changes usually need the
matching minifier; skipping it for a CSS-only edit produces a silent no-op that this round caught
before it shipped. Regression suite: chained menu → modal scroll-lock handoff, back-to-top
appear/scroll/hide cycle, `:inert` focus gating on both overlays (closed blocks focus, open restores
it), footer render at 375/768/1024/1440 — zero console errors throughout.
