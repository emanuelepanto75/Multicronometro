const CACHE_NAME = "simega-304-v4";
const CORE_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
];
const SPONSOR_FILES = [
  "./sponsors/sponsor-1.png",
  "./sponsors/sponsor-2.png",
  "./sponsors/sponsor-3.png",
  "./sponsors/sponsor-4.png",
  "./sponsors/sponsor-5.png",
  "./sponsors/sponsor-6.png",
  "./sponsors/sponsor-7.png",
  "./sponsors/sponsor-8.png",
  "./sponsors/sponsor-9.png",
  "./sponsors/sponsor-10.png",
  "./sponsors/sponsor-11.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => (
      cache.addAll(CORE_FILES).then(() => (
        Promise.all(SPONSOR_FILES.map((file) => cache.add(file).catch(() => {})))
      ))
    )),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => (
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    )),
  );
});
