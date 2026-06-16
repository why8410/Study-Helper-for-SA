// 빌드 시 build_release_bundle.py 가 아래 CACHE_VERSION 값을 커밋해시/타임스탬프로 자동 교체합니다.
// (이 토큰을 매 배포마다 바꿔야 새 서비스워커가 설치되고 스테일 배포가 사라집니다.)
const CACHE_VERSION = "dev";
const CACHE_NAME = `study-helper-sa-tablet-${CACHE_VERSION}`;
const APP_ROOT = new URL("./", self.location.href);
const INDEX_URL = new URL("index.html", APP_ROOT).pathname;

// 앱 셸: 항상 최신을 우선(network-first)으로 받아 스테일 배포를 막는다.
const APP_SHELL = ["", "index.html", "styles.css", "app.js"].map(
  (relativePath) => new URL(relativePath, APP_ROOT).pathname
);
// 잘 안 바뀌는 정적 자산: 빠른 cache-first(+백그라운드 갱신).
const STATIC_ASSETS = ["manifest.webmanifest", "favicon.svg", "vendor/tesseract.min.js"].map(
  (relativePath) => new URL(relativePath, APP_ROOT).pathname
);
const PRECACHE_ASSETS = [...APP_SHELL, ...STATIC_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 개별 실패가 전체 설치를 막지 않도록 자산별로 캐시한다.
      Promise.all(
        PRECACHE_ASSETS.map((assetPath) =>
          cache.add(assetPath).catch(() => undefined)
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// 새 버전을 즉시 적용해 달라는 페이지 요청 처리(새로고침 토스트의 "지금 적용").
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isAppShellRequest(request, url) {
  if (request.mode === "navigate") return true;
  if (url.origin !== self.location.origin) return false;
  return APP_SHELL.includes(url.pathname);
}

// 네트워크 우선: 성공하면 캐시를 갱신하고, 실패(오프라인)하면 캐시로 폴백.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const fallback = await cache.match(INDEX_URL);
      if (fallback) return fallback;
    }
    throw error;
  }
}

// 캐시 우선 + 백그라운드 갱신(stale-while-revalidate): 정적 자산과 CDN(OCR) 자산용.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);
  return cached || (await networkFetch) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }

  if (isAppShellRequest(request, url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 정적 자산 + 외부 OCR 자산(worker/wasm/traineddata)은 캐시 후 오프라인에서도 동작.
  event.respondWith(staleWhileRevalidate(request));
});
