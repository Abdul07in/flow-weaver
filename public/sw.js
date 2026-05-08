/* Flow Weaver service worker — versioned, safe caching strategies. */
const VERSION = "v1.0.0";
const STATIC_CACHE = `static-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const HTML_CACHE = `html-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/", "/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(PRECACHE.map((u) => cache.add(u).catch(() => null)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, ASSET_CACHE, IMAGE_CACHE, HTML_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

const isImage = (req) =>
  req.destination === "image" || /\.(png|jpg|jpeg|webp|avif|gif|svg|ico)$/i.test(new URL(req.url).pathname);
const isAsset = (url) => url.pathname.startsWith("/assets/") || url.pathname.startsWith("/_build/");
const isApi = (url) =>
  url.pathname.startsWith("/api/") ||
  url.pathname.startsWith("/_serverFn") ||
  url.pathname.startsWith("/_server");

async function networkFirst(req, cacheName, timeoutMs = 3500) {
  const cache = await caches.open(cacheName);
  try {
    const net = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    if (net && net.ok && req.method === "GET") cache.put(req, net.clone());
    return net;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.mode === "navigate") {
      const offline = await caches.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw new Error("offline");
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const net = await fetch(req);
  if (net && net.ok) cache.put(req, net.clone());
  return net;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache APIs / server functions — always network, no SW interference.
  if (isApi(url)) return;

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }
  if (isAsset(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
  if (isImage(req)) {
    event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE));
    return;
  }
  event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
});
