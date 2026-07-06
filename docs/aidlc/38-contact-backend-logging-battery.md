# 38 — Contact backend (Email Routing + KV + Turnstile), structured logs, battery optimisation

Three pieces of work in one round.

## 1. Contact form is now real (was a stub)

`submitForm` used to fake a success after 900ms and send nothing. The Worker (`src/index.js`) now
exposes `POST /api/contact`:

1. Validate (required, length caps, email shape) — cheap rejects before any network call.
2. **Turnstile** verify server-side (only enforced when `TURNSTILE_SECRET` is set, so the form works
   pre-setup).
3. **Persist** the submission to **KV** (`CONTACT_KV`, 1-year TTL).
4. **Email** a notification via the Email Routing **`send_email` binding** (`CONTACT_EMAIL`), with
   `Reply-To` = the visitor so a reply goes straight back to them. MIME subject/body are
   base64/encoded-word so unicode survives.
5. Return JSON; the client shows a real success/error state.

Every backing service is **guarded** — missing binding/var ⇒ that step is skipped, not fatal — so it
deploys safely in stages. Email-send failure still returns 200 (the message is already in KV + logs)
rather than failing the visitor.

Client: `submitForm` (`app.js`) now `fetch`es `/api/contact`; the modal gained a Turnstile widget and
an error line. The Turnstile script is **lazy-loaded only when the modal opens and only if
`site.turnstileSiteKey` is set**, so initial-load PageSpeed is untouched. CSP allows
`challenges.cloudflare.com` (script/frame/connect).

**Admin read:** `GET /api/contact?token=<ADMIN_TOKEN>` returns the most recent stored submissions
(newest first). Returns 401 until `ADMIN_TOKEN` is set; not linked from the UI.

### One-time setup (all free tier)
- **Email Routing**: Dashboard → zone → Email → Email Routing → enable + **verify** the destination
  (`CONTACT_TO`). The `send_email` binding may only send to the verified address.
- **KV**: `npx wrangler kv namespace create CONTACT_KV` → paste the `id` into `wrangler.toml`.
- **Turnstile**: create a widget → Site key → `portfolio.json` `site.turnstileSiteKey` (rebuild);
  Secret → `npx wrangler secret put TURNSTILE_SECRET`.
- **Admin**: `npx wrangler secret put ADMIN_TOKEN`.
- Deploy: `./deploy.sh`. Verify: `npx wrangler tail` + submit; `GET /api/contact?token=…` to read.

## 2. Structured API logging

`logApi()` emits one single-line JSON log per API call: `{ log:"api", at, method, path, status, ms,
ip, country, ray, ua, referer, outcome, … }` plus per-route fields (`turnstile`, `kvStored`,
`emailed`, `name`, `email`, admin `count`). Greppable/filterable in `wrangler tail` and the Workers
Logs dashboard. The raw message body is never logged — only stored in KV.

## 3. Battery / resource optimisation (Safari)

The page ran several **always-on** animations that kept compositing even when the window was
backgrounded (a real laptop/Safari battery drain): the aurora canvas (~30fps), `body::before` aurora
drift, `.beam` rotations (×3), and the brand sheen.

- **aurora.js**: canvas loop dropped to ~24fps (`FRAME_MS 42`) — imperceptible for a slow drift — and
  now pauses on **window blur** as well as tab-hidden (previously only tab-hidden).
- **app.js `setupIdlePause()`**: toggles `html.is-idle` on `visibilitychange`/`blur`/`focus`.
- **styles.css**: `html.is-idle` sets `animation-play-state: paused` on `body::before`, the bismillah
  sheen, and `.beam::before`. The clock is intentionally excluded (pausing a phase-locked sweep would
  desync it; its cost is negligible).

All resume seamlessly on return — nothing visible changes, no new requests, PageSpeed unaffected;
it just stops burning GPU/battery while the user is elsewhere.
