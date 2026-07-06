# 36 — Correction round: modal title bar, hero-card drawer frost + grow, wrong-button revert

## Reverted: leaf icon and grow-stem on "View experience"

Doc 34 applied a Dribbble reference's "growing button" idea to the wrong element — the "View
experience" button was never the intended target. Reverted it exactly to its pre-doc-34 state
(`git log -p` confirmed the original: plain `pill-btn pill-btn-glass beam sheen`, text only, no
icon), removed the now-dead `.grow-btn`/`.grow-btn__icon`/`.grow-btn__stem` CSS, restored
`.pill-btn-glass`'s symmetric `padding: 0.875rem 1.75rem` (it had gone asymmetric to make room for
the icon), and deleted the `leaf` icon from `icons.js` since nothing references it anymore. The
actual target — the hero-card's right-side drawer — gets its own growing-icon treatment below,
reusing the icon that's already there instead of introducing a new one.

## Modal — real macOS title bar

The close button was absolutely-positioned over the top of `.modal-header`, sharing space with the
eyebrow/heading rather than sitting in a dedicated bar. Rebuilt as an actual title-bar row:

- `.modal-titlebar` bleeds to the panel's edges (negative margins, clipped back to the panel's own
  rounded corners by its existing `overflow: hidden`) — a thin strip with a bottom divider,
  matching real macOS window chrome.
- Close control lives inside the bar (`.modal-titlebar > .modal-close`, small red-tinted circle,
  left-aligned like macOS's traffic lights) instead of floating over the content.
- A centered `.modal-titlebar__label` ("Get in touch") gives the bar an actual title — the eyebrow
  that used to carry this text was dropped from `.modal-header` since the bar now does that job;
  showing "Get in touch" twice in two different treatments would've been redundant.
- Content — heading, then form — starts completely fresh below the bar on its own line, no shared
  space with the close control at any width. Verified at 360/414/768/1024 via screenshot: zero
  overlap, bar and content cleanly separated by the divider.

## Hero-card drawer — the actual "right side drawer" — frosted + growing icon

Re-read the Dribbble URL again (`WebFetch` still returns empty content — confirmed a second time,
not re-guessing past that; this remains a client-rendered page nothing can be honestly fetched from).
Applied the *described* effects (frosted glass, an icon that grows) to the element the request was
actually about this time: the hero-card's existing collapsed-badge → hover-expand drawer (doc-25-era
mechanism — right-anchored, `clip-path`-driven, desktop/fine-pointer only).

- **Frosted glass, scoped to the open state only**: added real `backdrop-filter: blur(22px)
  saturate(160%)` to the `:hover`/`:focus-within` (open) rule, lightened the background further so
  there's something visible to blur. This project has an established faux-frost-only convention for
  glass that scrolls with the page (repainting a live blur every scroll frame is a real mobile
  PageSpeed cost) — but this blur only ever activates while a desktop pointer is deliberately
  holding the card open, never during scroll, so it doesn't touch that cost. Mobile has no hover at
  all, so the card there stays exactly as it was (always expanded, no blur) — confirmed via a
  touch-emulated context (`backdropFilter: none`, unchanged).
- **The icon grows from its own default state**: `.hero-card__badge-icon` (the same glyph already
  shown collapsed — whichever icon the active hero card uses, not a new one) scales to `1.3×` on the
  same hover/focus that opens the drawer, same duration/curve as the `clip-path` reveal so it reads
  as one continuous motion, not two separate effects. Composed with the existing JS-driven
  swap-pulse (`.is-pulsing`, added by `cardStep()` when the card content changes): a plain hover rule
  would have silently outranked the pulse by specificity, so added
  `.hero-card:hover .hero-card__badge-icon.is-pulsing` at higher specificity to give pulsing-while-
  hovering its own value (a smaller dip from the grown size) instead of the pulse disappearing
  whenever it happens mid-hover.
- Verified via computed style (not just a screenshot) mid-hover:
  `clip-path: inset(0px round 21.6px)` (fully open), `transform: matrix(1.3, 0, 0, 1.3, 0, 0)` on
  the icon, `backdrop-filter: blur(22px) saturate(1.6)` on the card — all three confirmed
  simultaneously, not just visually eyeballed.

**Sandbox note, again**: the first hover screenshot looked broken (badge and body text overlapping,
words cut off) — computed styles showed the badge's `translateX` mid-flight at ~42px instead of
settled at 0. Same headless frame-starvation pattern as prior rounds: forcing real compositor frames
via interleaved screenshots resolved it to a clean, fully-settled, non-overlapping state. Flagged as
what it was before treating it as a regression, not after shipping a "fix" for a non-bug.

## Verification

Full asset-version chain re-run after every edit. CSS brace balance 725/725. Zero console errors at
360/768/1024/1440 through a modal open/close cycle. Re-ran the existing scroll-lock regression suite
(T1/T2/T3) after these markup changes — unaffected, all still passing. Touch-emulated context
confirms the hero-card drawer enhancements are fully inert on mobile; `reducedMotion: 'reduce'`
context confirms the icon-grow and drawer-open still reach their end state instantly (consistent with
this mechanism's existing reduced-motion handling elsewhere in the file — transitions are stripped,
hover-triggered state changes still apply, matching how the drawer's own open/close already behaved
before this round).
