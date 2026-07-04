/** Blur-reveal text — Spell UI-inspired, vanilla (no React/npm) */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    words.forEach((w, i) => {
      const s = document.createElement("span");
      const hlClass = hlFlags[i] === null ? "" : " blur-reveal__word--hl" + (hlFlags[i] ? "-" + hlFlags[i] : "");
      s.className = "blur-reveal__word" + hlClass;
      s.textContent = w;
      s.style.transitionDuration = (seg * 6 * speed).toFixed(3) + "s";        // smooth per-word fade (~0.36s)
      s.style.transitionDelay = Math.min(i * seg * speed, 0.5).toFixed(3) + "s"; // cap stagger so long copy isn't sluggish
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
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
          const delay = parseInt(e.target.getAttribute("data-delay") || "0", 10);
          if (delay) e.target.style.setProperty("--blur-delay", delay + "ms");
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  window.addEventListener("portfolio-ready", init);
  if (window.__portfolioReady) init();
})();
