// Subí el número cuando cambien íconos o manifest: activate borra las cachés viejas.
// v2: descarta el worker de pdf.js que quedó cacheado como text/plain.
const CACHE = 'pdfimgtools-v2';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(['/manifest.webmanifest']))
            .catch(() => {}),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    // Cache-first solo para /build/: los nombres llevan hash de contenido.
    if (new URL(request.url).pathname.startsWith('/build/')) {
        event.respondWith(
            caches.match(request).then(
                (hit) =>
                    hit ||
                    fetch(request).then((res) => {
                        if (res.ok) {
                            const copy = res.clone();
                            caches.open(CACHE).then((cache) => cache.put(request, copy));
                        }
                        return res;
                    }),
            ),
        );
        return;
    }

    // Navegaciones: red primero, la última copia como respaldo sin conexión.
    // Los pedidos de Inertia (misma URL, pero JSON) no pasan por acá: si se
    // mezclaran con el HTML guardado, aparece el JSON crudo en pantalla.
    if (request.mode !== 'navigate') return;

    event.respondWith(
        fetch(request)
            .then((res) => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                }
                return res;
            })
            .catch(() => caches.match(request).then((hit) => hit || Response.error())),
    );
});
