const CACHE_NAME = 'propertydesk-shell-v125';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './overrides.css',
  './reminders.css',
  './features/app-state.js',
  './features/backend-client.js',
  './import-utils.js',
  './import-workflows.js',
  './email-utils.js',
  './workspace-data.js',
  './features/workspace-refresh.js',
  './ledger-utils.js',
  './zip-utils.js',
  './features/profile-display.js',
  './features/profile-settings.js',
  './features/overview.js',
  './features/overview-events.js',
  './features/property-portfolio-table.js',
  './features/property-portfolio-model.js',
  './features/property-views.js',
  './features/property-view-events.js',
  './features/transaction-views.js',
  './features/transaction-view-events.js',
  './features/report-views.js',
  './features/report-export.js',
  './features/app-utils.js',
  './features/ledger-context.js',
  './features/property-form.js',
  './features/account-form.js',
  './features/property-account-forms.js',
  './features/payment-entry-form.js',
  './features/expense-entry-form.js',
  './features/ledger-entry-forms.js',
  './features/create-actions.js',
  './features/import-preview-rendering.js',
  './features/import-preview.js',
  './features/import-preview-events.js',
  './features/account-import.js',
  './features/payment-import.js',
  './features/expense-import.js',
  './features/transaction-imports.js',
  './features/imports.js',
  './features/property-activity-details.js',
  './features/property-details.js',
  './features/property-detail-events.js',
  './features/deposit-details.js',
  './features/deposit-detail-events.js',
  './features/account-history-details.js',
  './features/account-details.js',
  './features/account-detail-events.js',
  './features/documents.js',
  './features/exports.js',
  './features/auth-recovery.js',
  './features/auth-session.js',
  './features/auth.js',
  './features/reminder-activity-view.js',
  './features/workspace-members.js',
  './features/workspace.js',
  './features/property-quick-note.js',
  './features/property-management.js',
  './features/account-maintenance.js',
  './features/deposit-maintenance.js',
  './features/transaction-correction-form.js',
  './features/transaction-maintenance.js',
  './features/transaction-corrections.js',
  './features/reminder-preview.js',
  './features/modal-controller.js',
  './features/navigation.js',
  './features/theme-controller.js',
  './features/notifications.js',
  './features/pwa-registration.js',
  './features/app-lifecycle.js',
  './app.js',
  './propertydesk.webmanifest',
  './icons/propertydesk.svg',
  './icons/propertydesk-192.png',
  './icons/propertydesk-512.png',
];
const SHELL_URLS = new Set(
  SHELL_FILES.map((path) => new URL(path, self.registration.scope).href),
);

async function fetchAndCache(request, cacheKey = request) {
  const response = await fetch(request);
  if (!response.ok) return response;

  // Clone before caching or returning the network response to the browser.
  const cachedResponse = response.clone();
  const cache = await caches.open(CACHE_NAME);
  await cache.put(cacheKey, cachedResponse);
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Cache only this static app shell. Never cache API, auth, user records, or config.js responses.
  if (!SHELL_URLS.has(url.href.split('?')[0])) {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchAndCache(request, './index.html').catch(() =>
        caches.match('./index.html'),
      ),
    );
    return;
  }

  const network = fetchAndCache(request).catch(async (error) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  });
  // Extend the fetch event from its synchronous handler; do not call waitUntil
  // from a later promise callback after the event dispatch has completed.
  event.waitUntil(network.then(() => undefined).catch(() => undefined));
  event.respondWith(caches.match(request).then((cached) => cached || network));
});
