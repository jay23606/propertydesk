const CACHE_NAME = 'propertydesk-shell-v516';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './overrides.css',
  './reminders.css',
  './features/app-state.js',
  './features/backend-client.js',
  './features/domain-options.js',
  './features/transaction-options.js',
  './features/expense-account-policy.js',
  './csv-parser.js',
  './import-utils.js',
  './features/account-import-validation.js',
  './features/expense-import-validation.js',
  './features/payment-import-validation.js',
  './import-workflows.js',
  './email-utils.js',
  './workspace-table-catalog.js',
  './workspace-query.js',
  './workspace-data.js',
  './features/workspace-refresh.js',
  './features/workspace-runtime.js',
  './ledger-schedule-utils.js',
  './loan-amortization-utils.js',
  './features/deposit-ledger-utils.js',
  './ledger-utils.js',
  './features/account-financial-summary.js',
  './features/repository-query-utils.js',
  './features/repository-write-feedback.js',
  './backup-utils.js',
  './zip-utils.js',
  './features/profile-display.js',
  './features/profile-settings-view.js',
  './features/profile-settings.js',
  './features/property-account-index.js',
  './features/overview-property-summary-model.js',
  './features/overview-activity-model.js',
  './features/overview-model.js',
  './features/overview.js',
  './features/overview-events.js',
  './features/overview-workflow.js',
  './features/property-portfolio-table.js',
  './features/property-portfolio-reminder-model.js',
  './features/property-portfolio-account-row-model.js',
  './features/property-portfolio-filter-model.js',
  './features/property-portfolio-model.js',
  './features/property-views.js',
  './features/property-view-events.js',
  './features/property-quick-note.js',
  './features/property-portfolio-workflow.js',
  './features/transaction-list-filter-model.js',
  './features/transaction-list-model.js',
  './features/transaction-summary-model.js',
  './features/transaction-row-view.js',
  './features/transaction-views.js',
  './features/transaction-view-events.js',
  './features/report-model.js',
  './features/download-utils.js',
  './features/report-views.js',
  './features/report-export.js',
  './features/report-workflow.js',
  './features/date-utils.js',
  './features/display-utils.js',
  './features/money-input-utils.js',
  './features/property-address-utils.js',
  './features/ledger-context.js',
  './features/deposit-context.js',
  './features/workspace-financial-context.js',
  './features/property-form-view.js',
  './features/property-repository.js',
  './features/property-maintenance.js',
  './features/property-form.js',
  './features/account-payload.js',
  './features/account-form-model.js',
  './features/account-form-view.js',
  './features/account-form.js',
  './features/payment-entry-view.js',
  './features/property-payment-action.js',
  './features/payment-entry-form.js',
  './features/expense-entry-view.js',
  './features/transaction-payloads.js',
  './features/transaction-repository.js',
  './features/transaction-inserts.js',
  './features/expense-entry-form.js',
  './features/ledger-entry-save-workflow.js',
  './features/ledger-entry-forms.js',
  './features/create-actions.js',
  './features/import-correction-view.js',
  './features/import-preview-rendering.js',
  './features/import-preview.js',
  './features/import-preview-events.js',
  './features/account-import-payload.js',
  './features/csv-import-file.js',
  './features/account-import.js',
  './features/import-review.js',
  './features/transaction-import-workflow.js',
  './features/payment-import.js',
  './features/expense-import.js',
  './features/import-repository.js',
  './features/import-commit.js',
  './features/imports.js',
  './features/property-activity-details.js',
  './features/property-documents-view.js',
  './features/property-activity-model.js',
  './features/property-activity-view.js',
  './features/property-details.js',
  './features/property-details-model.js',
  './features/property-detail-content-workflow.js',
  './features/property-details-view.js',
  './features/property-details-account-table.js',
  './features/property-detail-events.js',
  './features/property-holder-events.js',
  './features/property-detail-document-events.js',
  './features/property-detail-quick-actions.js',
  './features/deposit-details-model.js',
  './features/deposit-details-view.js',
  './features/deposit-detail-events.js',
  './features/account-history-repository.js',
  './features/account-loan-schedule-view.js',
  './features/account-detail-content-workflow.js',
  './features/account-details-model.js',
  './features/account-history-model.js',
  './features/account-history-view.js',
  './features/account-details.js',
  './features/account-details-view.js',
  './features/account-detail-events.js',
  './features/account-close-entry.js',
  './features/account-repository.js',
  './features/document-repository.js',
  './features/document-upload-policy.js',
  './features/document-upload.js',
  './features/document-delete.js',
  './features/document-open.js',
  './features/document-actions.js',
  './features/documents.js',
  './features/backup-agreement-files.js',
  './features/backup-records.js',
  './features/backup-archive.js',
  './features/backup-export.js',
  './features/auth-screens.js',
  './features/auth-recovery-view.js',
  './features/auth-reset-request.js',
  './features/auth-recovery.js',
  './features/auth-session.js',
  './features/auth-form-view.js',
  './features/auth-form.js',
  './features/auth.js',
  './features/reminder-activity-model.js',
  './features/reminder-activity-view.js',
  './features/workspace-members-view.js',
  './features/workspace-member-repository.js',
  './features/workspace-members.js',
  './features/workspace.js',
  './features/workspace-navigation-workflow.js',
  './features/property-holder-management.js',
  './features/property-holder-repository.js',
  './features/property-archive.js',
  './features/property-detail-management-workflow.js',
  './features/property-screen-workflow.js',
  './features/property-workspace-workflow.js',
  './features/account-maintenance.js',
  './features/account-close-maintenance.js',
  './features/deposit-adjustment-model.js',
  './features/deposit-adjustment-entry.js',
  './features/deposit-repository.js',
  './features/deposit-maintenance.js',
  './features/account-deposit-maintenance-workflow.js',
  './features/account-screen-workflow.js',
  './features/transaction-correction-view.js',
  './features/transaction-correction-model.js',
  './features/transaction-correction-form.js',
  './features/transaction-void-model.js',
  './features/transaction-void-entry.js',
  './features/transaction-maintenance.js',
  './features/transaction-corrections.js',
  './features/transaction-maintenance-workflow.js',
  './features/reminder-preview-model.js',
  './features/reminder-preview.js',
  './features/workspace-reminder-workflow.js',
  './features/workspace-shell-workflow.js',
  './features/form-options.js',
  './features/modal-controller.js',
  './features/navigation.js',
  './features/theme-controller.js',
  './features/notifications.js',
  './features/pwa-registration.js',
  './features/app-lifecycle.js',
  './features/app-startup-workflow.js',
  './features/property-account-action.js',
  './features/record-entry-workflow.js',
  './features/transaction-screen-workflow.js',
  './features/transaction-workspace-workflow.js',
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
