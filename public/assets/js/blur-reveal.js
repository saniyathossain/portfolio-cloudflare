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
(function () {
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

  function splitWords(el) {
    const raw = el.getAttribute("data-blur-reveal") || el.getAttribute("data-text") || el.textContent;
    el.textContent = "";
    el.classList.add("blur-reveal");
    const speed = parseFloat(el.getAttribute("data-blur-speed") || "1");
    const seg = parseFloat(el.getAttribute("data-blur-segment") || "0.06");
    const words = raw.trim().split(/\s+/);
    // Optional keyword emphasis: `|`-delimited literal phrases (plain text only — matched against
    // the words above, never parsed as HTML, so this can't introduce markup injection). Each phrase
    // may carry an optional `:colorkey` suffix (e.g. "quiet precision:rose") selecting a distinct
    // .blur-reveal__word--hl-<key> treatment; omitting the suffix falls back to the original single
    // shared --hl class, so a plain phrase with no colon behaves exactly as before. Multi-word
    // phrases are themselves whitespace-split so they can match across consecutive word-spans.
    // Comparison strips leading/trailing punctuation (e.g. the sentence-ending period stuck to a
    // tokenized word like "precision.") — only for matching, never for what's actually displayed.
    const bare = (s) => s.replace(/^[^\w]+|[^\w]+$/g, "");
    const hlSpecs = (el.getAttribute("data-blur-highlight") || "")
      .split("|").map((p) => p.trim()).filter(Boolean)
      .map((spec) => {
        const m = spec.match(/^(.*?)(?::([\w-]+))?$/);
        return { phrase: (m[1] || spec).trim().split(/\s+/).map(bare), key: m[2] || "" };
      });
    const hlFlags = new Array(words.length).fill(null);
    hlSpecs.forEach(({ phrase, key }) => {
      for (let i = 0; i <= words.length - phrase.length; i++) {
        let match = true;
        for (let j = 0; j < phrase.length; j++) {
          if (bare(words[i + j]).toLowerCase() !== phrase[j].toLowerCase()) { match = false; break; }
        }
        if (match) for (let j = 0; j < phrase.length; j++) hlFlags[i + j] = key;
      }
    });
    // Group words into segment-spans. Headings stay one-word-per-segment (groupSize 1) so the
    // per-word wave is preserved; long copy uses LONG_COPY_GROUP words per segment (overridable via
    // data-blur-max-segments) so far fewer filter layers animate at once. A segment always holds a
    // single highlight key, so keyword coloring still lands exactly — highlighted runs are never
    // merged into a plain neighbour.
    const maxSeg = parseInt(el.getAttribute("data-blur-max-segments") || "0", 10);
    const groupSize =
      maxSeg > 0 ? Math.max(1, Math.ceil(words.length / maxSeg))
      : words.length <= MAX_WORDS_PER_WORD ? 1 : LONG_COPY_GROUP;

    const segments = [];
    let cur = null;
    for (let i = 0; i < words.length; i++) {
      const key = hlFlags[i];
      // New segment on a highlight-key change or once the current run is full.
      if (!cur || cur.key !== key || cur.words.length >= groupSize) {
        cur = { key, words: [] };
        segments.push(cur);
      }
      cur.words.push(words[i]);
    }

    const dur = `${(seg * 6 * speed).toFixed(3)}s`; // smooth per-segment fade (~0.36s headings)
    segments.forEach((sgm, idx) => {
      const text = sgm.words.join(" ");
      const delay = `${Math.min(idx * seg * speed, 0.5).toFixed(3)}s`; // cap stagger so long copy isn't sluggish
      const s = document.createElement("span");
      const hlClass = sgm.key === null ? "" : ` blur-reveal__word--hl${sgm.key ? `-${sgm.key}` : ""}`;
      s.className = `blur-reveal__word${hlClass}`;
      s.textContent = text; // sharp copy, stays in flow and sizes the box
      s.style.transitionDuration = dur;
      s.style.transitionDelay = delay;
      // Static pre-blurred overlay — the reveal crossfades THIS out (opacity only). The blur value
      // never animates, so WebKit paints it once instead of re-running the blur shader every frame.
      const b = document.createElement("span");
      b.className = "brw__blur";
      b.setAttribute("aria-hidden", "true");
      b.textContent = text;
      b.style.transitionDuration = dur;
      b.style.transitionDelay = delay;
      s.appendChild(b);
      el.appendChild(s);
      if (idx < segments.length - 1) el.appendChild(document.createTextNode(" "));
    });
  }

  // Reveal a split element: promote each word for the life of its (opacity + transform) transition,
  // then release it — a lingering `will-change` keeps the compositor layer and its memory alive
  // forever. Only compositor-only properties animate here, so this is smooth in every browser.
  function reveal(el) {
    const delay = parseInt(el.getAttribute("data-delay") || "0", 10);
    if (delay) el.style.setProperty("--blur-delay", `${delay}ms`);

    const spans = el.querySelectorAll(".blur-reveal__word");
    spans.forEach((s) => {
      s.style.willChange = "opacity, transform";
      const done = (ev) => {
        if (ev.target !== s || (ev.propertyName !== "opacity" && ev.propertyName !== "transform")) return;
        s.style.willChange = "";
        s.removeEventListener("transitionend", done);
      };
      s.addEventListener("transitionend", done);
    });

    el.classList.add("is-visible");
    window.setTimeout(() => {
      spans.forEach((s) => { s.style.willChange = ""; });
    }, PROMOTE_MAX_MS);
  }

  function init() {
    const els = document.querySelectorAll("[data-blur-reveal]");
    if (!els.length) return;

    // Always split into word-spans, even under reduced motion — this used to bail out to plain
    // textContent instead, which silently dropped keyword-highlight coloring entirely for anyone
    // with reduced motion on (confirmed via direct DOM inspection, not assumed: the highlighted
    // phrases rendered as plain unstyled text, not just un-animated). Reduced motion should skip
    // the *animation*, not the highlight styling itself — the CSS reduced-motion override on
    // .blur-reveal__word (below) handles making the words appear instantly with no transition.
    els.forEach(splitWords);

    if (reduced) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          reveal(e.target);
          io.unobserve(e.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();

  // Exposed so other components (e.g. editorial.js's per-row title cascade) can reuse the exact same
  // split/crossfade technique on elements rendered after portfolio-ready — the IntersectionObserver
  // above only ever scans the DOM once, so late/dynamically-rendered elements need direct calls.
  window.blurReveal = { split: splitWords, reveal, reduced };
})();
