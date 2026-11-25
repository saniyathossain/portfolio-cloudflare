/**
 * Portfolio service worker — cache-first assets, network-first shell, offline page as the last resort.
 * Built by scripts/build-client.mjs straight to public/sw.js (the worker must live at the site root).
 *
 * Portfolio of Mohammad Saniyat Hossain — https://saniyat.com
 * @author  Mohammad Saniyat Hossain
 * @license Proprietary — all rights reserved.
 */

/** The few service-worker globals used here (the page tsconfig carries the DOM lib, not WebWorker). */
interface ExtendableEventLike extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEventLike extends ExtendableEventLike {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface WorkerScope {
  readonly location: Location;
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(type: "install" | "activate", listener: (event: ExtendableEventLike) => void): void;
  addEventListener(type: "fetch", listener: (event: FetchEventLike) => void): void;
}

const worker = self as unknown as WorkerScope;

const CACHE_VERSION = "a20cf4535c33"; // stamped by scripts/hash-sw.js on every ./build.sh — do not hand-edit
const OFFLINE_PAGE_URL = "/errors/offline/";
const SHELL_URLS = ["/", "/index.html", OFFLINE_PAGE_URL];
const SERVICE_UNAVAILABLE = 503;

function plainTextOffline(message: string): Response {
  return new Response(message, { status: SERVICE_UNAVAILABLE, statusText: "Service Unavailable", headers: { "Content-Type": "text/plain" } });
}

async function remember(request: Request, response: Response): Promise<void> {
  if (!response.ok) return;
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response.clone());
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  await remember(request, response);
  return response;
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    await remember(request, response);
    return response;
  } catch {
    const fallback = (await caches.match(request)) ?? (await caches.match("/index.html"));
    if (fallback) return fallback;
    // Nothing cached yet (the very first load happens offline, or this fetch raced an activate() that just wiped old
    // caches on a fresh CACHE_VERSION) — a fetch handler must never resolve to undefined; Chrome renders that as "This
    // site can't be reached" with no page to retry from. Serve the offline page (precached on install); plain text is
    // the last resort if even that was never cached.
    const offlinePage = await caches.match(OFFLINE_PAGE_URL);
    return offlinePage ?? plainTextOffline("Offline and nothing cached yet — reconnect and reload.");
  }
}

// Any other page navigation (a deep link, a typo): network first, then a previously visited copy, then the offline
// page — never the browser's generic "can't be reached" screen.
async function navigationWithOfflinePage(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    await remember(request, response);
    return response;
  } catch {
    const fallback = (await caches.match(request)) ?? (await caches.match(OFFLINE_PAGE_URL));
    return fallback ?? plainTextOffline("Offline — reconnect and reload.");
  }
}

type Strategy = (request: Request) => Promise<Response>;

/** Which strategy answers a same-origin GET, or undefined to let the browser handle it. */
function strategyFor(url: URL, request: Request): Strategy | undefined {
  const { pathname } = url;
  const isFirstPartyScript = pathname.startsWith("/assets/js/") && pathname.endsWith(".js") && !pathname.includes("/vendor/");
  if (isFirstPartyScript || pathname.startsWith("/assets/css/")) return networkFirst;
  // portfolio.json must stay fresh for feature-flag toggles — never cache-first under /assets/.
  if (pathname.endsWith("/portfolio.json")) return networkFirst;
  if (pathname.startsWith("/assets/")) return cacheFirst;
  if (pathname === "/" || pathname === "/index.html") return networkFirst;
  return request.mode === "navigate" ? navigationWithOfflinePage : undefined;
}

worker.addEventListener("install", (event) => {
  void worker.skipWaiting();
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)));
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== worker.location.origin) return;
  const strategy = strategyFor(url, event.request);
  if (strategy) event.respondWith(strategy(event.request));
});
