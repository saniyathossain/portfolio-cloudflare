/**
 * Blur-reveal text — Spell UI-inspired, vanilla (no React/npm).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 *
 * Reveals a heading/statement by de-blurring its words on scroll-into-view. Animating `filter:
 * blur()` is not compositor-accelerated in WebKit (it re-runs the blur shader every frame while the
 * radius changes — layer promotion can't fix that), so instead each word carries a STATIC
 * pre-blurred overlay copy that is crossfaded out with opacity while the sharp text slides up: only
 * opacity + transform animate, which are compositor-only and smooth in every browser (see
 * splitWords() for the overlay, the CSS `.brw__blur` rule, and reveal() for layer hygiene). Long
 * copy is grouped into a few segment-spans so the DOM stays light (see splitWords()).
 */

export {};

interface BlurRevealApi {
  split: (element: HTMLElement) => void;
  reveal: (element: HTMLElement) => void;
  reduced: boolean;
}

declare global {
  interface Window {
    __portfolioReady?: boolean;
    blurReveal?: BlurRevealApi;
  }
}

/** A `|`-delimited highlight phrase from `data-blur-highlight`, with its optional `:colorkey` suffix. */
interface HighlightSpec {
  phrase: string[];
  key: string;
}

/** A run of words that share one highlight key and animate as a single span. */
interface Segment {
  key: string | null;
  words: string[];
}

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// At/under this word count (every section heading) we keep one span per word for the staggered
// de-blur wave. Above it (the multi-sentence About statement) we group words into segments.
const MAX_WORDS_PER_WORD = 10;
// Words per segment-span when copy is long. Small enough that a segment (an atomic inline-block)
// never grows wide enough to force an awkward wrap at 360px.
const LONG_COPY_GROUP = 3;
// Safety net (ms): free any GPU layer whose `transitionend` was missed. Comfortably exceeds the
// worst case: max stagger (0.5s cap) + per-span duration (~0.43s) + buffer.
const PROMOTE_MAX_MS = 1600;
const MAX_STAGGER_SECONDS = 0.5;
const DURATION_SEGMENT_FACTOR = 6;

/** Attribute value, falling back to `fallback` when it is missing OR empty (matches the legacy `||` behaviour). */
function attributeOr(element: HTMLElement, name: string, fallback: string): string {
  const value = element.getAttribute(name);
  return value === null || value === "" ? fallback : value;
}

/** Strips leading/trailing punctuation (e.g. a sentence-ending period) — only for matching, never for display. */
function bare(word: string): string {
  return word.replace(/^[^\w]+|[^\w]+$/g, "");
}

// Does `phrase` (already bare-normalized) match the words array starting at index `start`? Pulled
// out of splitWords()'s highlight pass per docs/aidlc/48 Rule 3 (avoid nested loops over different
// collections) — a single loop over hlSpecs now calls this instead of inlining a second `for`.
function matchesPhraseAt(words: string[], start: number, phrase: string[]): boolean {
  return phrase.every((part, offset) => bare(words[start + offset] ?? "").toLowerCase() === part.toLowerCase());
}

// Optional keyword emphasis: `|`-delimited literal phrases (plain text only — matched against
// the words, never parsed as HTML, so this can't introduce markup injection). Each phrase
// may carry an optional `:colorkey` suffix (e.g. "quiet precision:rose") selecting a distinct
// .blur-reveal__word--hl-<key> treatment; omitting the suffix falls back to the original single
// shared --hl class. Multi-word phrases are themselves whitespace-split so they can match across
// consecutive word-spans.
function parseHighlightSpecs(attribute: string): HighlightSpec[] {
  return attribute
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((spec) => {
      const match = /^(.*?)(?::([\w-]+))?$/.exec(spec);
      const captured = match?.[1];
      const phraseText = captured === undefined || captured === "" ? spec : captured;
      return { phrase: phraseText.trim().split(/\s+/).map(bare), key: match?.[2] ?? "" };
    });
}

function computeHighlightFlags(words: string[], specs: HighlightSpec[]): (string | null)[] {
  const flags = new Array<string | null>(words.length).fill(null);
  for (const { phrase, key } of specs) {
    for (let start = 0; start <= words.length - phrase.length; start++) {
      if (!matchesPhraseAt(words, start, phrase)) continue;
      for (let offset = 0; offset < phrase.length; offset++) flags[start + offset] = key;
    }
  }
  return flags;
}

// Headings stay one-word-per-segment (groupSize 1) so the per-word wave is preserved; long copy
// uses LONG_COPY_GROUP words per segment (overridable via data-blur-max-segments) so far fewer
// filter layers animate at once.
function computeGroupSize(wordCount: number, maxSegments: number): number {
  if (maxSegments > 0) return Math.max(1, Math.ceil(wordCount / maxSegments));
  return wordCount <= MAX_WORDS_PER_WORD ? 1 : LONG_COPY_GROUP;
}

// A segment always holds a single highlight key, so keyword coloring still lands exactly —
// highlighted runs are never merged into a plain neighbour.
function groupSegments(words: string[], flags: (string | null)[], groupSize: number): Segment[] {
  const segments: Segment[] = [];
  words.forEach((word, index) => {
    const key = flags[index] ?? null;
    const current = segments[segments.length - 1];
    // New segment on a highlight-key change or once the current run is full.
    if (current?.key === key && current.words.length < groupSize) current.words.push(word);
    else segments.push({ key, words: [word] });
  });
  return segments;
}

function applyTransitionTiming(element: HTMLElement, duration: string, delay: string): void {
  element.style.transitionDuration = duration;
  element.style.transitionDelay = delay;
}

function buildSegmentSpan(segment: Segment, duration: string, delay: string): HTMLSpanElement {
  const text = segment.words.join(" ");
  const span = document.createElement("span");
  const highlightClass = segment.key === null ? "" : ` blur-reveal__word--hl${segment.key ? `-${segment.key}` : ""}`;
  span.className = `blur-reveal__word${highlightClass}`;
  span.textContent = text; // sharp copy, stays in flow and sizes the box
  applyTransitionTiming(span, duration, delay);
  // Static pre-blurred overlay — the reveal crossfades THIS out (opacity only). The blur value
  // never animates, so WebKit paints it once instead of re-running the blur shader every frame.
  const overlay = document.createElement("span");
  overlay.className = "brw__blur";
  overlay.setAttribute("aria-hidden", "true");
  overlay.textContent = text;
  applyTransitionTiming(overlay, duration, delay);
  span.appendChild(overlay);
  return span;
}

function splitWords(element: HTMLElement): void {
  const raw = attributeOr(element, "data-blur-reveal", attributeOr(element, "data-text", element.textContent));
  element.textContent = "";
  element.classList.add("blur-reveal");
  const speed = parseFloat(attributeOr(element, "data-blur-speed", "1"));
  // 0.075, not the original 0.06: both the per-word duration and the inter-word stagger below
  // scale off this one constant, so bumping it softens the whole cascade at once (~0.36s -> 0.45s
  // per word, 60ms -> 75ms stagger) — reads as a graceful wave instead of a rapid-fire typewriter,
  // without decoupling duration and stagger into two constants that could drift out of sync.
  const step = parseFloat(attributeOr(element, "data-blur-segment", "0.075"));
  const words = raw.trim().split(/\s+/);
  const flags = computeHighlightFlags(words, parseHighlightSpecs(element.getAttribute("data-blur-highlight") ?? ""));
  const maxSegments = parseInt(element.getAttribute("data-blur-max-segments") ?? "0", 10);
  const segments = groupSegments(words, flags, computeGroupSize(words.length, maxSegments));

  const duration = `${(step * DURATION_SEGMENT_FACTOR * speed).toFixed(3)}s`; // smooth per-segment fade (~0.36s headings)
  segments.forEach((segment, index) => {
    // Cap stagger so long copy isn't sluggish.
    const delay = `${Math.min(index * step * speed, MAX_STAGGER_SECONDS).toFixed(3)}s`;
    element.appendChild(buildSegmentSpan(segment, duration, delay));
    if (index < segments.length - 1) element.appendChild(document.createTextNode(" "));
  });
}

// Promote one word for the life of its (opacity + transform) transition, then release it.
function promoteUntilTransitionEnds(span: HTMLElement): void {
  span.style.willChange = "opacity, transform";
  const done = (event: TransitionEvent): void => {
    if (event.target !== span || (event.propertyName !== "opacity" && event.propertyName !== "transform")) return;
    span.style.willChange = "";
    span.removeEventListener("transitionend", done);
  };
  span.addEventListener("transitionend", done);
}

// Reveal a split element: promote each word for the life of its (opacity + transform) transition,
// then release it — a lingering `will-change` keeps the compositor layer and its memory alive
// forever. Only compositor-only properties animate here, so this is smooth in every browser.
function reveal(element: HTMLElement): void {
  const delay = parseInt(element.getAttribute("data-delay") ?? "0", 10);
  if (delay) element.style.setProperty("--blur-delay", `${delay}ms`);

  const spans = element.querySelectorAll<HTMLElement>(".blur-reveal__word");
  spans.forEach(promoteUntilTransitionEnds);

  // Double-rAF, not a synchronous class-add: setting will-change and starting the crossfade
  // transition in the SAME tick doesn't guarantee the browser has actually established/painted
  // the promoted compositor layer before the transition begins (Safari in particular can start
  // animating on the non-promoted layer and only pick up the promotion mid-transition, reading as
  // a stuck/heavy first frame — same root cause already found and fixed in the experience
  // accordion's height transition). One rAF lets the will-change writes above actually paint;
  // the second starts the crossfade on the now-promoted layer.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.add("is-visible");
    });
  });
  window.setTimeout(() => {
    spans.forEach((span) => {
      span.style.willChange = "";
    });
  }, PROMOTE_MAX_MS);
}

function init(): void {
  const elements = document.querySelectorAll<HTMLElement>("[data-blur-reveal]");
  if (!elements.length) return;

  // Always split into word-spans, even under reduced motion — bailing out to plain textContent
  // silently dropped keyword-highlight coloring for anyone with reduced motion on. Reduced motion
  // should skip the *animation*, not the highlight styling itself — the CSS reduced-motion override
  // on .blur-reveal__word handles making the words appear instantly with no transition.
  elements.forEach(splitWords);

  if (reduced) {
    elements.forEach((element) => {
    element.classList.add("is-visible");
  });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
  );
  elements.forEach((element) => {
    observer.observe(element);
  });
}

window.addEventListener("portfolio-ready", init);
if (window.__portfolioReady) init();

// Exposed so other components (e.g. editorial.js's per-row title cascade) can reuse the exact same
// split/crossfade technique on elements rendered after portfolio-ready — the IntersectionObserver
// above only ever scans the DOM once, so late/dynamically-rendered elements need direct calls.
window.blurReveal = { split: splitWords, reveal, reduced };
