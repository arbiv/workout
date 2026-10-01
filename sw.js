/* =============================================================
   Workout Player service worker.

   Makes the installed app usable without a connection:
   - the app shell (HTML/JS/icons) is precached on install,
   - the published-sheet CSV is left alone, so a failed fetch still
     falls through to the app's own localStorage copy of the program.

   Bump CACHE_VERSION whenever a shell file changes so old caches are
   dropped on activation.
   ============================================================= */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `workout-shell-${CACHE_VERSION}`;
const FONT_CACHE = `workout-fonts-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, FONT_CACHE];

// Relative to the service worker's scope, so the app works from a
// project subpath (GitHub Pages) as well as from a domain root.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./workout-engine.js",
  "./manifest.json",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const SHELL_URLS = new Set(SHELL_FILES.map(f => new URL(f, self.registration.scope).href));
const INDEX_URL = new URL("./index.html", self.registration.scope).href;
// The page and the engine ship as one unit, so both go network-first: a
// deploy never leaves new HTML running against a cached older engine.
const ENGINE_URL = new URL("./workout-engine.js", self.registration.scope).href;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(SHELL_FILES.map(f => new Request(f, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => !CURRENT_CACHES.includes(n)).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // The page itself: fresh when online, cached shell when not.
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, SHELL_CACHE, INDEX_URL));
    return;
  }

  if (url.href === ENGINE_URL) {
    event.respondWith(networkFirst(req, SHELL_CACHE));
    return;
  }

  // Remaining shell files (icons, manifest): cache first, refresh behind it.
  if (url.origin === self.location.origin && SHELL_URLS.has(url.href)) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }

  // Webfonts: immutable, so cache-first keeps the typography offline.
  if (FONT_HOSTS.includes(url.host)) {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  // Everything else (the sheet CSV above all) goes straight to the network.
});

// Fresh copy when the network answers, cached copy when it fails or crawls
// (a gym with one bar of signal shouldn't mean a blank screen).
async function networkFirst(req, cacheName, cacheKey, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  const key = cacheKey || req;
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  const cached = await cache.match(key);
  if (!cached) return network;
  try {
    return await withTimeout(network, timeoutMs);
  } catch (e) {
    return cached;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network timeout")), ms);
    promise.then(
      res => { clearTimeout(timer); resolve(res); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  if (cached) {
    network.catch(() => {});
    return cached;
  }
  return network;
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
