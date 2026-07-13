/** Portfolio service worker — cache-first assets, network-first shell */
const CACHE_VERSION = "2d0285daa22e";
const SHELL_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_URLS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match("/index.html");
    if (shell) return shell;
    // Nothing cached yet (e.g. the very first load happens offline, or this fetch raced a SW
    // activate() that just wiped old caches on a fresh CACHE_VERSION) — a fetch handler must never
    // resolve to undefined; Chrome renders that as "This site can't be reached" with no page to
    // even retry from. An explicit response at least renders as a real, reloadable page.
    return new Response("Offline and nothing cached yet — reconnect and reload.", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/assets/js/") && url.pathname.endsWith(".js") && !url.pathname.includes("/vendor/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (url.pathname.startsWith("/assets/css/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  // portfolio.json must stay fresh for local feature-flag toggles — never cache-first under /assets/.
  if (url.pathname.endsWith("/portfolio.json")) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  if (url.pathname === "/" || url.pathname === "/index.html") {
    event.respondWith(networkFirst(event.request));
  }
});
