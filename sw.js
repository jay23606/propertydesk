const CACHE_NAME = 'propertydesk-shell-v25';
const SHELL_FILES = ['./', './index.html', './styles.css', './overrides.css', './import-utils.js', './import-workflows.js', './email-utils.js', './ledger-utils.js', './zip-utils.js', './app.js', './propertydesk.webmanifest', './icons/propertydesk.svg'];
const SHELL_URLS = new Set(SHELL_FILES.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cache only this static app shell. Never cache API, auth, user records, or config.js responses.
  if (!SHELL_URLS.has(url.href.split('?')[0])) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone())));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())));
      return response;
    });
    return cached || network;
  }));
});
