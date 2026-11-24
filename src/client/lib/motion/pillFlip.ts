/**
 * Icon→label hover reveal, smoothed with FLIP (First, Last, Invert, Play). The label is an IN-FLOW grid column that
 * flips 0fr→1fr the instant a pill gets .is-open, so the flex row reflows to its final layout in a single frame (no
 * per-frame line-break juggle); flipRow() then animates that reflow — snapshot EVERY pill's position First, toggle
 * .is-open and read Last, Invert each moved pill back with a transform, and Play to identity next frame, so neighbours
 * (and the opening pill itself, if it wraps) glide to their new spots instead of teleporting.
 *
 * CRITICAL — anti-oscillation. Open/switch is driven ONLY by real pointer *movement* (pointermove), never by
 * pointerover/pointerout. At narrow widths a growing pill can wrap to the next line and relocate out from under a
 * STATIONARY cursor; Chromium then fires pointerout on that layout-induced hit-target change, and a pointerout-driven
 * close would collapse→return→reopen→wrap forever (the Chrome "juggle"). A relocating pill under a still cursor fires NO
 * pointermove, so it can never open or close anything — the loop is impossible by construction, in every browser.
 *
 * Close policy (hybrid, tuned for 3-row skills-flat wrap):
 *  - elementFromPoint(clientX, clientY) — not event.target — so FLIP transforms don't mis-hit.
 *  - Stay open while the pointer is inside the open pill's bounds (expanded label included).
 *  - Leave the .pill-row entirely → close immediately.
 *  - Row gap / trailing whitespace → debounced close, deferred while a FLIP is still running.
 * Desktop-pointer-only via canEnhance; touch / reduced-motion show the static in-flow labels from CSS.
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */
import { motionEnvironment } from "./environment";
import type { ReflowPanelController } from "./pillReflow";

const GAP_CLOSE_MS = 180;
const POINTER_PADDING_PX = 10;
const FALLBACK_EASE = "cubic-bezier(0.23, 0.84, 0.35, 1)";

function readSeconds(style: CSSStyleDeclaration, name: string, fallback: number): number {
  const seconds = parseFloat(style.getPropertyValue(name));
  return Number.isFinite(seconds) ? seconds : fallback;
}

function pillAt(clientX: number, clientY: number): HTMLElement | null {
  return document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(".brand-pill") ?? null;
}

function rowAt(clientX: number, clientY: number): HTMLElement | null {
  return document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(".pill-row") ?? null;
}

function pointInRect(clientX: number, clientY: number, rect: DOMRect, padding: number): boolean {
  return (
    clientX >= rect.left - padding &&
    clientX <= rect.right + padding &&
    clientY >= rect.top - padding &&
    clientY <= rect.bottom + padding
  );
}

function pillsIn(row: HTMLElement): HTMLElement[] {
  const pills: HTMLElement[] = [];
  for (let child = row.firstElementChild; child; child = child.nextElementSibling) {
    if (child instanceof HTMLElement && child.classList.contains("brand-pill")) pills.push(child);
  }
  return pills;
}

function inPillRow(element: HTMLElement): boolean {
  return element.parentElement?.classList.contains("pill-row") ?? false;
}

/**
 * The row's own [data-stagger] scroll-reveal drives each pill's transform via a CSS transition (styles.css
 * .pill-row[data-stagger] .brand-pill). flipRow() ALSO writes pill.style.transform directly (inline style always wins
 * over a CSS transition), so opening a pill mid-reveal would clobber the stagger-in animation — visible stutter, worse
 * on slow devices where the reveal window stays open longer relative to how fast a pointer can reach the row. Skip FLIP
 * entirely while the row hasn't finished revealing; the pointer can still re-trigger it once settled.
 */
function stillRevealing(row: HTMLElement): boolean {
  return row.hasAttribute("data-stagger") && !row.classList.contains("is-visible");
}

class PillFlipController {
  private readonly openMs: number;
  private readonly closeMs: number;
  private readonly ease: string;
  private readonly rowTimers = new WeakMap<HTMLElement, number>(); // row -> cleanup timeout id
  private openPill: HTMLElement | null = null;
  private gapCloseTimer = 0;
  private flipBusyUntil = 0;
  private moveFrame = 0;
  private lastX = 0;
  private lastY = 0;

  constructor(private readonly reflowPanel: ReflowPanelController) {
    const rootStyle = getComputedStyle(document.documentElement);
    this.openMs = Math.round(readSeconds(rootStyle, "--dur-pill-flip-open", 0.52) * 1000);
    this.closeMs = Math.round(readSeconds(rootStyle, "--dur-pill-flip-close", 0.38) * 1000);
    this.ease = rootStyle.getPropertyValue("--ease-pill-flip").trim() || FALLBACK_EASE;
  }

  bind(): void {
    document.addEventListener("pointermove", (event) => {
      this.onMove(event);
    }, { passive: true });

    // Keyboard: focus opens, blur closes. Focus never moves under a stationary cursor, so no loop.
    document.addEventListener("focusin", (event) => {
      const pill = event.target instanceof Element ? event.target.closest<HTMLElement>(".brand-pill") : null;
      if (pill && inPillRow(pill)) this.setOpen(pill);
      else this.clearOpen();
    });
    document.addEventListener("focusout", (event) => {
      this.onFocusOut(event);
    });
  }

  private onFocusOut(event: FocusEvent): void {
    const open = this.openPill;
    if (!open) return;
    const leaving = event.target instanceof Element ? event.target.closest<HTMLElement>(".brand-pill") : null;
    if (leaving !== open) return;
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !open.contains(next)) this.clearOpen();
  }

  private cancelGapClose(): void {
    if (!this.gapCloseTimer) return;
    clearTimeout(this.gapCloseTimer);
    this.gapCloseTimer = 0;
  }

  private scheduleGapClose(): void {
    this.cancelGapClose();
    this.gapCloseTimer = window.setTimeout(() => {
      this.gapCloseTimer = 0;
      this.clearOpen();
    }, GAP_CLOSE_MS);
  }

  /** FLIP every pill in `row` across the layout change `mutate()` makes. */
  private flipRow(row: HTMLElement, mutate: () => void, durationMs: number): void {
    const pills = pillsIn(row);
    this.flipBusyUntil = performance.now() + durationMs + 80;
    row.classList.add("is-pill-moving");
    // FIRST — current visual positions (include any in-flight transforms from a prior interrupt).
    const first = pills.map((pill) => pill.getBoundingClientRect());
    // Clear in-flight transforms so LAST is measured against the clean final layout. No paint happens between here and
    // the Invert below (all synchronous), so this never flashes.
    pills.forEach((pill) => {
      pill.style.transition = "none";
      pill.style.transform = "none";
    });
    this.reflowPanel.lock(row);
    mutate();
    this.reflowPanel.reflow(row, durationMs, this.reflowPanel.measureTarget(row));
    // LAST — reading a rect forces the synchronous layout we need.
    const last = pills.map((pill) => pill.getBoundingClientRect());
    this.growClip(pills, first, last, durationMs);
    const movers = this.invert(pills, first, last);
    this.play(movers, durationMs);
    this.scheduleCleanup(row, durationMs);
  }

  /**
   * GROW — the shell reflows to its final width in one frame (that is what makes the FLIP cheap), so wipe it open from
   * its old right edge instead of letting it snap: a compositor-friendly clip-path that starts `grewBy` px short on the
   * right and ends unclipped (-24px keeps the soft shadow visible).
   */
  private growClip(pills: HTMLElement[], first: DOMRect[], last: DOMRect[], durationMs: number): void {
    pills.forEach((pill, index) => {
      const firstRect = first[index];
      const lastRect = last[index];
      if (!firstRect || !lastRect) return;
      const grewBy = Math.round(lastRect.width - firstRect.width);
      if (grewBy <= 2 || !("animate" in pill)) return;
      pill.animate(
        [
          { clipPath: `inset(-24px ${grewBy}px -24px -24px)` },
          { clipPath: "inset(-24px -24px -24px -24px)" },
        ],
        { duration: durationMs, easing: this.ease },
      );
    });
  }

  /** INVERT — send each moved pill back to its old spot (transform only; layout stays final). */
  private invert(pills: HTMLElement[], first: DOMRect[], last: DOMRect[]): HTMLElement[] {
    const movers: HTMLElement[] = [];
    pills.forEach((pill, index) => {
      const firstRect = first[index];
      const lastRect = last[index];
      if (!firstRect || !lastRect) return;
      const deltaX = firstRect.left - lastRect.left;
      const deltaY = firstRect.top - lastRect.top;
      if (deltaX || deltaY) {
        pill.style.willChange = "transform";
        pill.style.transform = `translate3d(${deltaX}px,${deltaY}px,0)`;
        movers.push(pill);
      } else {
        pill.style.transition = "";
        pill.style.transform = "";
      }
    });
    return movers;
  }

  /** PLAY — two rAFs guarantee the Invert frame committed before we transition to identity. */
  private play(movers: HTMLElement[], durationMs: number): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        movers.forEach((pill) => {
          pill.style.transition = `transform ${durationMs}ms ${this.ease}`;
          pill.style.transform = "translate3d(0,0,0)";
        });
      });
    });
  }

  /** Strip inline transition/will-change once the glide settles so nothing lingers. */
  private scheduleCleanup(row: HTMLElement, durationMs: number): void {
    clearTimeout(this.rowTimers.get(row));
    this.rowTimers.set(
      row,
      window.setTimeout(() => {
        row.classList.remove("is-pill-moving");
        pillsIn(row).forEach((pill) => {
          pill.style.transition = "none";
          pill.style.willChange = "";
          pill.style.transform = "";
        });
        requestAnimationFrame(() => {
          pillsIn(row).forEach((pill) => {
            pill.style.transition = "";
          });
        });
      }, durationMs + 100),
    );
  }

  private setOpen(pill: HTMLElement): void {
    if (pill === this.openPill) return;
    this.cancelGapClose();
    const previous = this.openPill;
    const previousRow = previous ? previous.parentElement : null;
    const row = pill.parentElement;
    if (!row || stillRevealing(row)) return;
    // Different rows: collapse the old row separately (no conflict — disjoint pill sets).
    if (previous && previousRow && previousRow !== row) {
      this.flipRow(
        previousRow,
        () => {
          previous.classList.remove("is-open");
        },
        this.closeMs,
      );
    }
    this.openPill = pill;
    this.flipRow(
      row,
      () => {
        if (previous && previousRow === row) previous.classList.remove("is-open");
        pill.classList.add("is-open");
      },
      this.openMs,
    );
  }

  private clearOpen(): void {
    const pill = this.openPill;
    if (!pill) return;
    this.cancelGapClose();
    const row = pill.parentElement;
    this.openPill = null;
    if (row) {
      this.flipRow(
        row,
        () => {
          pill.classList.remove("is-open");
        },
        this.closeMs,
      );
    } else {
      pill.classList.remove("is-open");
    }
  }

  /** Real-movement-only open/switch; rAF-coalesced so a burst of pointermoves does at most one layout pass per frame. */
  private onMove(event: PointerEvent): void {
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    if (this.moveFrame) return;
    this.moveFrame = requestAnimationFrame(() => {
      this.moveFrame = 0;
      this.processMove(this.lastX, this.lastY);
    });
  }

  private isInsideOpenRow(open: HTMLElement, clientX: number, clientY: number): boolean {
    const row = open.parentElement;
    if (!row) return false;
    return rowAt(clientX, clientY) === row || pointInRect(clientX, clientY, row.getBoundingClientRect(), 0);
  }

  private processMove(clientX: number, clientY: number): void {
    const pill = pillAt(clientX, clientY);
    if (pill && inPillRow(pill)) {
      this.setOpen(pill);
      return;
    }
    const open = this.openPill;
    if (!open) return;

    // Label expansion can outpace hit-target during FLIP — keep open while inside pill bounds.
    if (pointInRect(clientX, clientY, open.getBoundingClientRect(), POINTER_PADDING_PX)) {
      this.cancelGapClose();
      return;
    }

    if (!this.isInsideOpenRow(open, clientX, clientY)) {
      this.clearOpen();
      return;
    }

    // Never arm a gap-close while FLIP is running — avoids cutting the glide short.
    if (performance.now() < this.flipBusyUntil) {
      this.cancelGapClose();
      return;
    }

    // Row gap / trailing whitespace — debounced close.
    this.scheduleGapClose();
  }
}

export function pillFlip(reflowPanel: ReflowPanelController): void {
  if (!motionEnvironment.canEnhance) return;
  new PillFlipController(reflowPanel).bind();
}
