/* ============================================================
   Austerra Agri Solutions POS - offline shell cache
   Only static files are cached. API responses are NEVER cached,
   because your stock, bills and customers live on the server.
   ============================================================ */

const CACHE = "austerra-pos-php-v6";

const ASSETS = [
  "./index.php",
  "./manifest.webmanifest",
  "./assets/img/austerra-logo.jpeg",
  "./assets/img/austerra-icon.png",
  "./assets/css/styles.css",
  "./assets/js/store.js",
  "./assets/js/ui.js",
  "./assets/js/views.js",
  "./assets/js/app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          ASSETS.map((url) =>
            cache.add(url).catch(() => {
              /* a missing optional asset must not break install */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isApi(url) {
  return (
    url.pathname.endsWith("/api.php") ||
    url.pathname.endsWith("/install.php") ||
    url.pathname.endsWith("/config.php")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache or intercept API traffic.
  if (isApi(url)) return;
  if (event.request.headers.get("accept") && event.request.headers.get("accept").includes("application/json")) return;

  // App shell: always try the network first so updates arrive immediately.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("./index.php", copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.php").then((hit) => hit || caches.match(event.request)))
    );
    return;
  }

  // Static assets: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(event.request).then((hit) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
