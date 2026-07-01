# Architecture

```
Browser → Cloudflare Worker (src/index.js)
       → Static Assets (public/)
       → index.html + CSS + JS + images
```

## Security
- CSP, HSTS, X-Frame-Options via Worker
- Cache headers via `public/_headers`
- No eval; external links use `rel="noopener"`

## Build pipeline
1. Edit `tailwind.input.css` / `styles.css`
2. Run `./build-css.sh`
3. `wrangler deploy`

## File conventions
- Zero inline CSS
- Alpine for UI state (menu, modal, expands)
- Vanilla JS for loader, reveals, liquid hero
