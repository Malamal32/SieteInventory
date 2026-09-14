/* Siete Parts Locator — offline shell.
   Static files: served from cache, refreshed in the background, so the app opens
   instantly and picks up a new deploy on the next launch.
   /api/*: never cached. Shared stock data must always come from the server. */

const CACHE = "siete-parts-v1";
const SHELL = [
  "./",
  "./index.html",
  "./support.js",
  "./inventory-data.js",
  "./siete-logo.png",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./_ds/broadsheet-5cf537c0-7156-4ddf-8ced-4f5856ab98e3/styles.css",
  "./_ds/broadsheet-5cf537c0-7156-4ddf-8ced-4f5856ab98e3/_ds_bundle.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return; // straight to the network

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => {
        const fresh = fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);

        if (hit) return hit;
        return fresh.then(res => res || (
          req.mode === "navigate"
            ? cache.match("./index.html")
            : new Response("Offline", { status: 503 })
        ));
      })
    )
  );
});
