const CACHE_NAME = "simega-304-v5";
const CORE_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
];
const SPONSOR_FILES = [
  "./Sponsors/sponsor-1.png",
  "./Sponsors/sponsor-2.png",
  "./Sponsors/sponsor-3.png",
  "./Sponsors/sponsor-4.png",
  "./Sponsors/sponsor-5.png",
  "./Sponsors/sponsor-6.png",
  "./Sponsors/sponsor-7.png",
  "./Sponsors/sponsor-8.png",
  "./Sponsors/sponsor-9.png",
  "./Sponsors/sponsor-10.png",
  "./Sponsors/sponsor-11.png",
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
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => (
      caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
    )),
  );
});
