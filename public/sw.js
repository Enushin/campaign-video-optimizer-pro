const CACHE_NAME = "video-optimizer-v1";
const STATIC_ASSETS = ["/", "/index.html", "/favicon.svg", "/manifest.json"];

// FFmpeg関連のCDNキャッシュ
const FFMPEG_CDN_PATTERNS = [
  "unpkg.com/@ffmpeg",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "api.fontshare.com",
];

// インストール時に静的アセットをキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// ネットワークファースト、フォールバックでキャッシュ
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // FFmpegやフォントなどのCDNリソースはキャッシュファースト
  const isCdnResource = FFMPEG_CDN_PATTERNS.some((pattern) =>
    event.request.url.includes(pattern),
  );

  if (isCdnResource) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          // バックグラウンドで更新
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, response);
                });
              }
            })
            .catch(() => {});
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // 通常のリクエストはネットワークファースト
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したらキャッシュに保存
        if (response.ok && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから
        return caches.match(event.request);
      }),
  );
});
