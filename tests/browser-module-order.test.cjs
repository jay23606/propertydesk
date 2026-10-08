const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("every feature module loads before app.js and every local script is precached", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const localScripts = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attributes]) => /\bdefer\b/i.test(attributes))
    .map(([, attributes]) => attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter((source) => source && !/^https?:\/\//i.test(source))
    .map((source) => source.split("?")[0].replace(/^\.\//, ""));
  const shellMatch = worker.match(/const SHELL_FILES\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(shellMatch, "service worker defines its shell file list");
  const shellFiles = new Set(
    [...shellMatch[1].matchAll(/["']([^"']+)["']/g)].map(([, source]) =>
      source.replace(/^\.\//, ""),
    ),
  );
  const appIndex = localScripts.indexOf("app.js");
  assert.notEqual(appIndex, -1, "app.js is loaded");
  assert.equal(
    appIndex,
    localScripts.length - 1,
    "app.js is the last local deferred script",
  );
  assert.ok(
    localScripts.indexOf("features/currency-utils.js") <
      localScripts.indexOf("features/csv-value-utils.js"),
  );
  const featureModules = fs
    .readdirSync(path.join(__dirname, "..", "features"))
    .filter((filename) => filename.endsWith(".js"))
    .map((filename) => `features/${filename}`);
  for (const featureModule of featureModules) {
    assert.ok(
      localScripts.includes(featureModule),
      `${featureModule} is loaded by index.html`,
    );
  }
  for (const source of localScripts) {
    assert.ok(
      shellFiles.has(source),
      `${source} is cached by the service worker`,
    );
  }
});

test("browser feature scripts load after their dependencies", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const scriptSources = [...html.matchAll(/<script\b([^>]*)>/gi)]
    .filter(([, attributes]) => /\bdefer\b/i.test(attributes))
    .map(([, attributes]) => attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1])
    .filter(Boolean)
    .map((source) => source.split("?")[0].replace(/^\.\//, ""));
  const dependencies = [
    ["features/currency-utils.js", "features/csv-value-utils.js"],
    ["features/currency-utils.js", "features/payment-import-allocation.js"],
    ["features/currency-utils.js", "features/ledger-schedule-utils.js"],
    ["features/currency-utils.js", "features/loan-amortization-utils.js"],
    ["features/currency-utils.js", "features/ledger-utils.js"],
    ["features/transaction-options.js", "features/display-utils.js"],
    ["features/display-utils.js", "features/payment-import-allocation.js"],
    ["features/account-status-utils.js", "features/ledger-schedule-utils.js"],
    ["features/account-status-utils.js", "features/overview-model.js"],
    [
      "features/account-status-utils.js",
      "features/overview-property-summary-model.js",
    ],
    [
      "features/account-status-utils.js",
      "features/property-portfolio-filter-model.js",
    ],
    [
      "features/account-status-utils.js",
      "features/property-portfolio-table.js",
    ],
    ["features/auth-client.js", "features/workspace-runtime.js"],
    ["features/repository-registry.js", "features/workspace-runtime.js"],
    ["features/auth-client.js", "features/profile-settings.js"],
    ["features/auth-client.js", "features/auth-reset-request.js"],
    ["features/auth-client.js", "features/auth-form.js"],
    ["features/auth-client.js", "features/auth-session.js"],
    ["features/auth-client.js", "features/app-lifecycle.js"],
    ["features/domain-options.js", "features/account-import-validation.js"],
    [
      "features/email-address-utils.js",
      "features/account-import-validation.js",
    ],
    ["features/email-address-utils.js", "features/account-form-model.js"],
    ["features/email-address-utils.js", "features/email-utils.js"],
    ["features/email-address-utils.js", "features/reminder-preview.js"],
    ["workspace-table-catalog.js", "features/backup-utils.js"],
    [
      "features/transaction-options.js",
      "features/expense-import-validation.js",
    ],
    ["features/account-repository.js", "features/account-close-maintenance.js"],
    [
      "features/repository-write-feedback.js",
      "features/account-close-maintenance.js",
    ],
    ["features/account-close-entry.js", "app.js"],
    ["features/account-close-maintenance.js", "app.js"],
    ["features/account-detail-events.js", "app.js"],
    ["features/account-details.js", "features/account-detail-events.js"],
    [
      "features/account-loan-schedule-view.js",
      "features/account-details-view.js",
    ],
    ["features/account-details-view.js", "features/account-details.js"],
    ["features/account-form-view.js", "features/account-form.js"],
    ["features/account-maintenance.js", "features/account-form.js"],
    ["features/account-payload.js", "features/account-form.js"],
    [
      "features/account-history-model.js",
      "features/account-detail-content-workflow.js",
    ],
    [
      "features/account-history-view.js",
      "features/account-detail-content-workflow.js",
    ],
    [
      "features/account-history-repository.js",
      "features/account-history-model.js",
    ],
    [
      "features/deposit-details-model.js",
      "features/deposit-details-workflow.js",
    ],
    [
      "features/deposit-details-view.js",
      "features/deposit-details-workflow.js",
    ],
    [
      "features/deposit-details-workflow.js",
      "features/deposit-workspace-workflow.js",
    ],
    [
      "features/account-detail-content-workflow.js",
      "features/account-screen-workflow.js",
    ],
    [
      "features/account-detail-action-workflow.js",
      "features/account-screen-workflow.js",
    ],
    [
      "features/deposit-adjustment-workflow.js",
      "features/deposit-workspace-workflow.js",
    ],
    [
      "features/deposit-workspace-workflow.js",
      "features/account-screen-workflow.js",
    ],
    ["features/report-model.js", "features/report-workflow.js"],
    ["features/report-views.js", "features/report-workflow.js"],
    ["features/report-export.js", "features/report-workflow.js"],
    ["features/import-review.js", "features/account-import.js"],
    ["features/account-repository.js", "features/account-maintenance.js"],
    [
      "features/repository-write-feedback.js",
      "features/account-maintenance.js",
    ],
    ["features/ledger-context.js", "app.js"],
    ["features/deposit-context.js", "app.js"],
    ["features/notifications.js", "app.js"],
    ["features/workspace-refresh.js", "app.js"],
    ["features/auth-form-view.js", "features/auth-form.js"],
    ["features/auth-recovery-view.js", "features/auth-recovery.js"],
    ["features/auth-reset-request.js", "features/auth-recovery.js"],
    ["features/auth-recovery.js", "features/auth-session.js"],
    ["features/auth-form.js", "features/auth.js"],
    ["features/auth-recovery.js", "features/auth.js"],
    ["features/auth-session.js", "features/auth.js"],
    ["features/document-repository.js", "features/backup-agreement-files.js"],
    ["features/backup-agreement-files.js", "features/backup-archive.js"],
    ["features/zip-utils.js", "app.js"],
    ["features/backup-records.js", "features/backup-archive.js"],
    ["features/backup-agreement-files.js", "features/backup-export.js"],
    ["features/backup-archive.js", "features/backup-export.js"],
    ["features/backup-export.js", "features/backup-workspace-workflow.js"],
    ["features/backup-utils.js", "features/backup-workspace-workflow.js"],
    ["features/backup-records.js", "features/backup-workspace-workflow.js"],
    ["features/backup-workspace-workflow.js", "app.js"],
    ["features/repository-registry.js", "app.js"],
    ["features/backup-utils.js", "features/backup-records.js"],
    ["workspace-query.js", "features/backup-records.js"],
    [
      "features/deposit-adjustment-model.js",
      "features/deposit-adjustment-entry.js",
    ],
    ["features/deposit-details-model.js", "app.js"],
    ["features/deposit-details-view.js", "app.js"],
    ["features/deposit-adjustment-entry.js", "app.js"],
    ["features/deposit-maintenance.js", "app.js"],
    ["features/deposit-detail-events.js", "app.js"],
    ["features/deposit-repository.js", "features/deposit-maintenance.js"],
    [
      "features/repository-write-feedback.js",
      "features/deposit-maintenance.js",
    ],
    ["features/repository-query-utils.js", "features/deposit-repository.js"],
    ["features/domain-options.js", "features/display-utils.js"],
    ["features/transaction-options.js", "features/display-utils.js"],
    ["features/transaction-options.js", "features/expense-account-policy.js"],
    [
      "features/expense-account-policy.js",
      "features/expense-import-validation.js",
    ],
    ["features/expense-account-policy.js", "features/expense-entry-view.js"],
    ["features/expense-account-policy.js", "features/expense-entry-form.js"],
    ["features/document-delete.js", "features/document-actions.js"],
    ["features/document-open.js", "features/document-actions.js"],
    ["features/document-repository.js", "features/document-delete.js"],
    ["features/document-repository.js", "features/document-upload.js"],
    ["features/document-upload-policy.js", "features/document-upload.js"],
    ["features/document-actions.js", "features/documents.js"],
    ["features/document-repository.js", "features/documents.js"],
    ["features/document-upload.js", "features/documents.js"],
    ["features/transaction-inserts.js", "features/expense-entry-form.js"],
    ["features/import-review.js", "features/expense-import.js"],
    ["features/domain-options.js", "features/form-options.js"],
    ["features/transaction-options.js", "features/form-options.js"],
    ["features/import-repository.js", "features/import-commit.js"],
    ["features/import-preview.js", "features/import-preview-events.js"],
    ["features/import-preview.js", "features/imports.js"],
    ["features/import-preview-events.js", "features/imports.js"],
    [
      "features/account-detail-events.js",
      "features/account-detail-action-workflow.js",
    ],
    [
      "features/account-close-entry.js",
      "features/account-detail-action-workflow.js",
    ],
    [
      "features/account-close-maintenance.js",
      "features/account-detail-action-workflow.js",
    ],
    [
      "features/deposit-adjustment-entry.js",
      "features/deposit-adjustment-workflow.js",
    ],
    [
      "features/deposit-detail-events.js",
      "features/deposit-adjustment-workflow.js",
    ],
    [
      "features/deposit-maintenance.js",
      "features/deposit-adjustment-workflow.js",
    ],
    [
      "features/transaction-corrections.js",
      "features/transaction-correction-workflow.js",
    ],
    [
      "features/transaction-correction-form.js",
      "features/transaction-correction-workflow.js",
    ],
    [
      "features/transaction-correction-workflow.js",
      "features/transaction-maintenance-workflow.js",
    ],
    [
      "features/transaction-void-maintenance.js",
      "features/transaction-maintenance-workflow.js",
    ],
    [
      "features/transaction-void-entry.js",
      "features/transaction-maintenance-workflow.js",
    ],
    [
      "features/transaction-view-events.js",
      "features/transaction-maintenance-workflow.js",
    ],
    [
      "features/property-archive.js",
      "features/property-detail-management-workflow.js",
    ],
    [
      "features/property-detail-events.js",
      "features/property-detail-management-workflow.js",
    ],
    [
      "features/property-detail-quick-actions.js",
      "features/property-detail-management-workflow.js",
    ],
    [
      "features/property-holder-management.js",
      "features/property-holder-workflow.js",
    ],
    [
      "features/property-holder-events.js",
      "features/property-holder-workflow.js",
    ],
    [
      "features/documents.js",
      "features/property-document-management-workflow.js",
    ],
    [
      "features/document-repository.js",
      "features/property-document-management-workflow.js",
    ],
    [
      "features/property-detail-document-events.js",
      "features/property-document-management-workflow.js",
    ],
    [
      "features/property-detail-content-workflow.js",
      "features/property-screen-workflow.js",
    ],
    [
      "features/property-detail-management-workflow.js",
      "features/property-screen-workflow.js",
    ],
    [
      "features/property-holder-workflow.js",
      "features/property-screen-workflow.js",
    ],
    [
      "features/property-document-management-workflow.js",
      "features/property-screen-workflow.js",
    ],
    [
      "features/property-screen-workflow.js",
      "features/property-workspace-workflow.js",
    ],
    [
      "features/overview-workflow.js",
      "features/property-workspace-workflow.js",
    ],
    [
      "features/property-portfolio-workflow.js",
      "features/property-workspace-workflow.js",
    ],
    ["features/property-workspace-workflow.js", "app.js"],
    [
      "features/reminder-activity-model.js",
      "features/workspace-shell-workflow.js",
    ],
    [
      "features/reminder-activity-view.js",
      "features/workspace-shell-workflow.js",
    ],
    [
      "features/reminder-preview-model.js",
      "features/workspace-shell-workflow.js",
    ],
    ["features/reminder-preview.js", "features/workspace-shell-workflow.js"],
    ["features/workspace.js", "features/workspace-shell-workflow.js"],
    ["features/navigation.js", "features/workspace-shell-workflow.js"],
    ["features/app-state.js", "features/workspace-runtime.js"],
    ["features/backend-client.js", "features/workspace-runtime.js"],
    ["features/workspace-refresh.js", "features/workspace-runtime.js"],
    ["workspace-data.js", "features/workspace-runtime.js"],
    ["features/ledger-context.js", "features/workspace-financial-context.js"],
    ["features/deposit-context.js", "features/workspace-financial-context.js"],
    ["features/transaction-maintenance-workflow.js", "app.js"],
    [
      "features/ledger-entry-forms.js",
      "features/transaction-workspace-workflow.js",
    ],
    [
      "features/transaction-screen-workflow.js",
      "features/transaction-workspace-workflow.js",
    ],
    ["features/auth.js", "features/app-startup-workflow.js"],
    ["features/app-lifecycle.js", "features/app-startup-workflow.js"],
    [
      "features/import-correction-view.js",
      "features/import-preview-rendering.js",
    ],
    ["features/import-preview-rendering.js", "features/import-preview.js"],
    ["features/import-preview.js", "app.js"],
    ["features/import-preview-events.js", "app.js"],
    ["features/csv-parser.js", "features/imports.js"],
    ["features/import-row-utils.js", "features/imports.js"],
    ["features/import-validation-api.js", "features/imports.js"],
    ["features/account-import.js", "features/imports.js"],
    ["features/expense-import.js", "features/imports.js"],
    ["features/payment-import.js", "features/imports.js"],
    ["features/payment-import.js", "features/transaction-import-feature.js"],
    ["features/expense-import.js", "features/transaction-import-feature.js"],
    ["features/transaction-import-feature.js", "features/imports.js"],
    ["features/expense-entry-form.js", "features/ledger-entry-forms.js"],
    [
      "features/ledger-entry-save-workflow.js",
      "features/ledger-entry-forms.js",
    ],
    ["features/payment-entry-form.js", "features/ledger-entry-forms.js"],
    ["features/property-payment-action.js", "features/payment-entry-form.js"],
    [
      "features/property-account-action.js",
      "features/property-account-entry-workflow.js",
    ],
    [
      "features/property-form.js",
      "features/property-account-entry-workflow.js",
    ],
    ["features/account-form.js", "features/property-account-entry-workflow.js"],
    ["features/property-account-entry-workflow.js", "app.js"],
    [
      "features/ledger-entry-forms.js",
      "features/transaction-workspace-workflow.js",
    ],
    ["features/create-actions.js", "app.js"],
    ["features/transaction-payloads.js", "features/ledger-entry-forms.js"],
    ["features/transaction-corrections.js", "app.js"],
    ["features/transaction-views.js", "app.js"],
    [
      "features/transaction-views.js",
      "features/transaction-screen-workflow.js",
    ],
    [
      "features/transaction-maintenance-workflow.js",
      "features/transaction-screen-workflow.js",
    ],
    [
      "features/overview-property-summary-model.js",
      "features/overview-model.js",
    ],
    ["features/property-account-index.js", "features/overview-model.js"],
    [
      "features/account-financial-summary.js",
      "features/overview-property-summary-model.js",
    ],
    ["features/overview-events.js", "features/overview-workflow.js"],
    ["features/overview-model.js", "features/overview.js"],
    ["features/overview-view.js", "features/overview.js"],
    ["features/transaction-inserts.js", "features/payment-entry-form.js"],
    ["features/import-review.js", "features/payment-import.js"],
    ["features/transaction-import-workflow.js", "features/payment-import.js"],
    [
      "features/property-activity-model.js",
      "features/property-activity-details.js",
    ],
    [
      "features/property-activity-view.js",
      "features/property-activity-details.js",
    ],
    ["features/property-archive.js", "app.js"],
    ["features/property-detail-events.js", "app.js"],
    ["features/property-detail-quick-actions.js", "app.js"],
    [
      "features/property-quick-note.js",
      "features/property-portfolio-workflow.js",
    ],
    [
      "features/property-documents-view.js",
      "features/property-details-view.js",
    ],
    [
      "features/property-details-account-table.js",
      "features/property-details-view.js",
    ],
    [
      "features/property-details-account-table.js",
      "features/property-detail-content-workflow.js",
    ],
    ["features/property-activity-details.js", "features/property-details.js"],
    ["features/property-details-view.js", "features/property-details.js"],
    ["features/documents.js", "app.js"],
    ["features/document-repository.js", "app.js"],
    ["features/property-detail-document-events.js", "app.js"],
    ["features/property-maintenance.js", "features/property-form.js"],
    [
      "features/property-holder-repository.js",
      "features/property-holder-management.js",
    ],
    ["features/property-form-view.js", "features/property-maintenance.js"],
    ["features/property-repository.js", "features/property-maintenance.js"],
    [
      "features/repository-write-feedback.js",
      "features/property-maintenance.js",
    ],
    [
      "features/account-financial-summary.js",
      "features/property-portfolio-account-row-model.js",
    ],
    [
      "features/property-portfolio-reminder-model.js",
      "features/property-portfolio-workflow.js",
    ],
    [
      "features/property-portfolio-reminder-model.js",
      "features/property-portfolio-account-row-model.js",
    ],
    [
      "features/property-portfolio-filter-model.js",
      "features/property-portfolio-model.js",
    ],
    [
      "features/property-portfolio-filter-model.js",
      "features/property-portfolio-workflow.js",
    ],
    [
      "features/property-account-index.js",
      "features/property-portfolio-model.js",
    ],
    ["features/overview-activity-model.js", "features/overview-model.js"],
    ["features/overview-activity-model.js", "features/overview-workflow.js"],
    [
      "features/property-portfolio-table.js",
      "features/property-portfolio-model.js",
    ],
    [
      "features/property-quick-note.js",
      "features/property-portfolio-workflow.js",
    ],
    [
      "features/property-view-events.js",
      "features/property-portfolio-workflow.js",
    ],
    ["features/repository-query-utils.js", "features/property-repository.js"],
    ["features/overview.js", "features/property-views.js"],
    ["features/property-portfolio-model.js", "features/property-views.js"],
    ["features/property-portfolio-table.js", "features/property-views.js"],
    [
      "features/reminder-activity-model.js",
      "features/reminder-activity-view.js",
    ],
    ["features/reminder-activity-view.js", "app.js"],
    ["features/reminder-preview-model.js", "features/reminder-preview.js"],
    ["features/report-model.js", "features/report-views.js"],
    ["features/report-model.js", "app.js"],
    ["features/report-views.js", "app.js"],
    ["features/report-export.js", "app.js"],
    [
      "features/repository-query-utils.js",
      "features/repository-write-feedback.js",
    ],
    [
      "features/transaction-correction-view.js",
      "features/transaction-correction-form.js",
    ],
    [
      "features/transaction-repository.js",
      "features/transaction-corrections.js",
    ],
    ["features/import-review.js", "features/transaction-import-workflow.js"],
    [
      "features/repository-write-feedback.js",
      "features/transaction-inserts.js",
    ],
    ["features/transaction-repository.js", "features/transaction-inserts.js"],
    ["features/transaction-correction-form.js", "app.js"],
    ["features/transaction-void-maintenance.js", "app.js"],
    ["features/transaction-view-events.js", "app.js"],
    ["features/transaction-void-entry.js", "app.js"],
    [
      "features/repository-write-feedback.js",
      "features/transaction-void-maintenance.js",
    ],
    [
      "features/transaction-repository.js",
      "features/transaction-void-maintenance.js",
    ],
    [
      "features/repository-query-utils.js",
      "features/transaction-repository.js",
    ],
    ["features/transaction-list-model.js", "features/transaction-views.js"],
    [
      "features/transaction-list-filter-model.js",
      "features/transaction-list-model.js",
    ],
    [
      "features/transaction-list-filter-model.js",
      "features/transaction-views.js",
    ],
    ["features/transaction-row-view.js", "features/transaction-views.js"],
    ["features/transaction-summary-model.js", "features/transaction-views.js"],
    [
      "features/transaction-void-model.js",
      "features/transaction-void-entry.js",
    ],
    ["features/profile-settings.js", "features/workspace-profile-workflow.js"],
    ["features/workspace-profile-workflow.js", "features/workspace.js"],
    [
      "features/workspace-members-view.js",
      "features/workspace-members-workflow.js",
    ],
    ["features/workspace-members.js", "features/workspace-members-workflow.js"],
    ["features/workspace-members-workflow.js", "features/workspace.js"],
    ["features/csv-value-utils.js", "features/import-validation-api.js"],
    [
      "features/account-import-validation.js",
      "features/import-validation-api.js",
    ],
    [
      "features/expense-import-validation.js",
      "features/import-validation-api.js",
    ],
    [
      "features/payment-import-allocation.js",
      "features/payment-import-validation.js",
    ],
    [
      "features/payment-import-validation.js",
      "features/import-validation-api.js",
    ],
    [
      "features/transaction-options.js",
      "features/payment-import-validation.js",
    ],
    ["workspace-table-catalog.js", "workspace-data.js"],
  ];

  for (const [dependency, dependent] of dependencies) {
    const dependencyIndex = scriptSources.indexOf(dependency);
    const dependentIndex = scriptSources.indexOf(dependent);
    assert.notEqual(
      dependencyIndex,
      -1,
      "Missing browser script: " + dependency,
    );
    assert.notEqual(dependentIndex, -1, "Missing browser script: " + dependent);
    assert.ok(
      dependencyIndex < dependentIndex,
      dependency + " must load before " + dependent,
    );
  }
});

test("retired workflows stay out of the browser shell and app root", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const retiredScripts = [
    ["features/entry-workflow.js", html],
    ["features/entry-workflow.js", worker],
    ["features/property-portfolio-screen-workflow.js", html],
    ["features/property-portfolio-screen-workflow.js", worker],
    ["features/property-details-workflow.js", html],
    ["features/property-details-workflow.js", worker],
    ["features/reports-workflow.js", html],
    ["features/reports-workflow.js", worker],
    ["features/deposit-details.js", html],
    ["features/deposit-details.js", worker],
    ["features/app-shell-workflow.js", html],
    ["features/app-shell-workflow.js", worker],
    ["record-maintenance.js", worker],
    ["features/reminder-workflow.js", worker],
    ["workspace-settings-workflow.js", worker],
  ];

  for (const [retiredScript, content] of retiredScripts) {
    assert.equal(
      content.includes(retiredScript),
      false,
      "Unexpected retired script: " + retiredScript,
    );
  }
  assert.doesNotMatch(app, /PropertyDesk(?:ImportUtils|ImportWorkflows)\./);
  assert.match(
    app,
    /attachImportPreviewEvents,\s*attachAccountImportEvents,\s*attachPaymentImportEvents,\s*attachExpenseImportEvents,/,
  );
});
