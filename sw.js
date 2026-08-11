// Eko-Reçete / Global Agro Doctor — basit uygulama kabuğu (app shell) önbellekleyicisi.
// Amaç: sinyal olmayan sahada dahi siteyi AÇILABİLİR tutmak. Google Apps Script'e
// (kayıt/AI yorumu) giden istekler ASLA önbellekten yanıtlanmaz — bu istekler her
// zaman gerçek ağ isteği olarak gider; site zaten kendi offline-kuyruk mantığıyla
// (sendToServer / IndexedDB veya localStorage kuyruğu) bunları yönetiyor.
const CACHE_NAME = 'eko-recete-shell-v2'; // v2: ikonlar güncellendi — eski önbellek temizlenir
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png?v=2',
  './icon-512.png?v=2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('Uygulama kabuğu önbelleklenemedi:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bu siteden başka bir yere (Google Apps Script, Gemini, Google Fonts vb.) giden
  // istekleri hiç önbelleğe alma/önbellekten sunma — her zaman canlı ağa bırak.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // ağ yoksa (saha/offline) önbelleğe düş

      // Önbellekte varsa hemen onu göster (hızlı açılış), arka planda ağdan güncelle.
      return cachedResponse || networkFetch;
    })
  );
});
