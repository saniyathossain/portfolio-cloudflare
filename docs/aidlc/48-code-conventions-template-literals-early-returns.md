# 48 — Code conventions: template literals, early returns, SOLID, no nested loops

## Why

The hand-written JS in `public/assets/js/` has grown across many design passes (docs 00–47) without a
written style baseline. Two patterns kept recurring during a full-codebase audit and are worth locking
in as project convention so future edits (by any agent or contributor) default to them.

## Rule 1 — template literals over string concatenation

Use template literals for any string built from more than one piece.

```js
// Avoid
const label = h + ":" + m + mer;
const hex = "#" + to(rgb.r) + to(rgb.g) + to(rgb.b);
const cls = "is-swapping-" + dir_;

// Prefer
const label = `${h}:${m}${mer}`;
const hex = `#${to(rgb.r)}${to(rgb.g)}${to(rgb.b)}`;
const cls = `is-swapping-${dir_}`;
```

Applies to hand-written `.js` files only — never hand-edit the generated `*.min.js` bundles
(`scripts/minify-js.js` regenerates them from source).

## Rule 2 — early returns, SOLID, simple readable code

- **Guard clauses first.** Return/continue as soon as a precondition fails instead of wrapping the
  remaining logic in a nested `if`.
- **Single responsibility per function.** A function that both computes and mutates DOM in a dozen
  branches should be split into a pure computation + a small apply step, when it doesn't cost real
  performance (rAF-coalesced hot paths are exempt — see `motion.js`'s scroll/pointer handlers).
- **Prefer the obvious solution over the clever one.** Optimize for the next reader, not for fewest
  characters. Comments explain *why*, never *what* (see project `CLAUDE.md`).
- **No speculative abstraction.** Don't generalize a one-off into a reusable helper until a second
  call site actually needs it.

```js
// Avoid
function apply(node, ok) {
  if (node) {
    if (ok) {
      // do the thing
    }
  }
}

// Prefer
function apply(node, ok) {
  if (!node || !ok) return;
  // do the thing
}
```

## Rule 3 — no nested loops over different collections

Don't inline a second loop inside the first when the inner loop iterates a *different* collection
than the outer one — extract the inner loop into a named helper function, or replace it with
`Array.some()`/`.find()`/an early `continue`, so the cross-product logic has a name and reads as one
level of nesting from the call site.

```js
// Avoid
hlSpecs.forEach(({ phrase, key }) => {
  for (let i = 0; i <= words.length - phrase.length; i++) {
    let match = true;
    for (let j = 0; j < phrase.length; j++) {
      if (words[i + j] !== phrase[j]) { match = false; break; }
    }
    if (match) /* ... */;
  }
});

// Prefer
function matchesPhraseAt(words, start, phrase) {
  for (let j = 0; j < phrase.length; j++) {
    if (words[start + j] !== phrase[j]) return false;
  }
  return true;
}
hlSpecs.forEach(({ phrase, key }) => {
  for (let i = 0; i <= words.length - phrase.length; i++) {
    if (!matchesPhraseAt(words, i, phrase)) continue;
    /* ... */
  }
});
```

**Exception — two independent sequential passes over the *same* array are fine, not a violation.**
`motion.js`'s `pillFlip()` runs a `pills.forEach()` to clear transforms, then a separate `pills.map()`
to read positions — that's two O(n) passes, not an O(n²) cross-product, and fusing them into one loop
would make the FLIP-animation phases (clear → measure → invert → play) harder to follow, not easier.
Only flatten a loop that's genuinely nested at *definition time* over two different collections.

## Scope

Applies to all hand-written files under `public/assets/js/` and `scripts/`. Existing hot loops that
are already structured for rAF-coalescing / performance (documented inline) are not rewritten purely
for style — behaviour and perf come first.
