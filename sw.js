const CACHE_NAME = "study-helper-sa-tablet-v3";
const APP_ROOT = new URL("./", self.location.href);
const INDEX_URL = new URL("index.html", APP_ROOT).pathname;
const CORE_ASSETS = ["", "index.html", "styles.css", "app.js", "manifest.webmanifest", "favicon.svg"].map(
  (relativePath) => new URL(relativePath, APP_ROOT).pathname
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || (!response.ok && response.type !== "opaque")) {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => (event.request.mode === "navigate" ? caches.match(INDEX_URL) : undefined));
    })
  );
});
