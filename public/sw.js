/** Portfolio service worker — cache-first assets, network-first shell */
const CACHE_VERSION = "fcae3f71530e";
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
    return caches.match("/index.html");
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
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  if (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname.endsWith("/portfolio.json")
  ) {
    event.respondWith(networkFirst(event.request));
  }
});
