/* Siete Parts Locator — offline app shell.
   Static search files are cached for fast/offline access. API requests are
   always network-first because stock counts and edits are shared live data. */

const CACHE = "siete-parts-v2";
const SHELL = [
  "/",
  "/index.html",
  "/support.js",
  "/inventory-data.js",
  "/siete-logo.png",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/_ds/broadsheet-5cf537c0-7156-4ddf-8ced-4f5856ab98e3/styles.css",
  "/_ds/broadsheet-5cf537c0-7156-4ddf-8ced-4f5856ab98e3/_ds_bundle.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const fresh = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);

        if (cached) return cached;
        return fresh.then((res) => res || (
          req.mode === "navigate"
            ? cache.match("/index.html")
            : new Response("Offline", { status: 503 })
        ));
      })
    )
  );
});
