const CACHE_NAME = "oca-sistem-meteo-cache-v1";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/service-worker.js",
  "/oca-widget.js",
  "/app.py",
  "/icons/oca_192.png",
  "/icons/oca_512.png"
];

// INSTALACIÓN DEL SERVICE WORKER
self.addEventListener("install", event => {
  console.log("[ServiceWorker] Instalado");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[ServiceWorker] Archivos cacheados");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// ACTIVACIÓN
self.addEventListener("activate", event => {
  console.log("[ServiceWorker] Activado");
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Eliminando caché antigua:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// INTERCEPTA PETICIONES
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).catch(() =>
          caches.match("/index.html")
        )
      );
    })
  );
});
