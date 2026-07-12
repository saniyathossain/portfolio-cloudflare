# 48 — Code conventions: template literals, early returns, SOLID

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

## Scope

Applies to all hand-written files under `public/assets/js/` and `scripts/`. Existing hot loops that
are already structured for rAF-coalescing / performance (documented inline) are not rewritten purely
for style — behaviour and perf come first.
