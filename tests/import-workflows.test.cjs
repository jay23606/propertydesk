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

test("the browser loads tested import and backup workflows before the app and precaches them in the PWA shell", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.ok(html.indexOf("features/app-state.js") < html.indexOf("app.js"));
  assert.ok(html.indexOf("features/app-lifecycle.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/account-repository.js") <
      html.indexOf("features/account-maintenance.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-repository.js") <
      html.indexOf("features/deposit-maintenance.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-repository.js") <
      html.indexOf("features/transaction-inserts.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-repository.js") <
      html.indexOf("features/transaction-maintenance.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-repository.js") <
      html.indexOf("features/transaction-corrections.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-inserts.js") <
      html.indexOf("features/payment-entry-form.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-inserts.js") <
      html.indexOf("features/expense-entry-form.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-details.js") <
      html.indexOf("features/deposit-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-maintenance.js") <
      html.indexOf("features/deposit-maintenance-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-adjustment-model.js") <
      html.indexOf("features/deposit-adjustment-entry.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-adjustment-entry.js") <
      html.indexOf("features/deposit-maintenance-workflow.js"),
  );
  assert.match(worker, /'\.\/features\/deposit-adjustment-entry\.js'/);
  assert.ok(
    html.indexOf("features/deposit-details-workflow.js") <
      html.indexOf("features/deposit-maintenance-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-maintenance-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-maintenance-workflow.js") <
      html.indexOf("features/account-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/account-details-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-close-entry.js") <
      html.indexOf("features/account-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/account-maintenance.js") <
      html.indexOf("features/account-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/account-detail-actions-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/record-entry-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-views.js") <
      html.indexOf("features/ledger-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/record-entry-workflow.js") <
      html.indexOf("features/ledger-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/ledger-workflow.js") <
      html.indexOf("features/entry-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/entry-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/backend-client.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/workspace-refresh.js") <
      html.indexOf("features/app-services.js"),
  );
  assert.ok(
    html.indexOf("features/notifications.js") <
      html.indexOf("features/app-services.js"),
  );
  assert.ok(
    html.indexOf("features/ledger-context.js") <
      html.indexOf("features/app-services.js"),
  );
  assert.ok(html.indexOf("features/app-services.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/property-address-utils.js") < html.indexOf("app.js"),
  );
  for (const validator of [
    "account-import-validation.js",
    "expense-import-validation.js",
    "payment-import-validation.js",
  ]) {
    assert.ok(html.indexOf(validator) < html.indexOf("import-workflows.js"));
  }
  assert.ok(html.indexOf("import-workflows.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/import-preview-rendering.js") <
      html.indexOf("features/import-preview.js"),
  );
  assert.ok(
    html.indexOf("features/import-correction-view.js") <
      html.indexOf("features/import-preview-rendering.js"),
  );
  assert.match(worker, /'\.\/features\/import-correction-view\.js'/);
  assert.ok(
    html.indexOf("features/import-preview.js") <
      html.indexOf("features/import-preview-events.js"),
  );
  assert.ok(
    html.indexOf("features/import-preview-events.js") <
      html.indexOf("features/imports.js"),
  );
  assert.ok(
    html.indexOf("features/import-preview.js") <
      html.indexOf("features/imports.js"),
  );
  for (const importer of [
    "account-import.js",
    "payment-import.js",
    "expense-import.js",
  ]) {
    assert.ok(
      html.indexOf("features/import-review.js") <
        html.indexOf(`features/${importer}`),
      `shared import review should load before ${importer}`,
    );
  }
  assert.ok(
    html.indexOf("features/import-review.js") <
      html.indexOf("features/transaction-import-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-import-workflow.js") <
      html.indexOf("features/payment-import.js"),
  );
  assert.match(worker, /'\.\/features\/transaction-import-workflow\.js'/);
  assert.match(worker, /'\.\/features\/import-review\.js'/);
  assert.ok(
    html.indexOf("features/account-import.js") <
      html.indexOf("features/imports.js"),
  );
  assert.ok(
    html.indexOf("features/payment-import.js") <
      html.indexOf("features/imports.js"),
  );
  assert.ok(
    html.indexOf("features/expense-import.js") <
      html.indexOf("features/imports.js"),
  );
  assert.ok(
    html.indexOf("features/import-repository.js") <
      html.indexOf("features/import-commit.js"),
  );
  assert.ok(html.indexOf("zip-utils.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/property-views.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-views.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-view-events.js") <
      html.indexOf("features/transaction-maintenance-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-correction-view.js") <
      html.indexOf("features/transaction-correction-form.js"),
  );
  assert.match(worker, /'\.\/features\/transaction-correction-view\.js'/);
  assert.ok(
    html.indexOf("features/transaction-correction-form.js") <
      html.indexOf("features/transaction-maintenance-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-maintenance.js") <
      html.indexOf("features/transaction-maintenance-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-void-model.js") <
      html.indexOf("features/transaction-void-entry.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-void-entry.js") <
      html.indexOf("features/transaction-maintenance-workflow.js"),
  );
  assert.match(worker, /'\.\/features\/transaction-void-entry\.js'/);
  assert.ok(
    html.indexOf("features/transaction-maintenance-workflow.js") <
      html.indexOf("features/transaction-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-views.js") <
      html.indexOf("features/ledger-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/report-views.js") <
      html.indexOf("features/report-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/report-model.js") <
      html.indexOf("features/report-views.js"),
  );
  assert.ok(
    html.indexOf("features/report-export.js") <
      html.indexOf("features/report-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/report-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/report-workflow.js") <
      html.indexOf("features/reports-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/report-export.js") <
      html.indexOf("features/reports-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/reports-workflow.js") < html.indexOf("app.js"),
  );
  for (const utility of [
    "date-utils.js",
    "display-utils.js",
    "money-input-utils.js",
  ]) {
    assert.ok(
      html.indexOf(`features/${utility}`) < html.indexOf("app.js"),
      `${utility} loads before app.js`,
    );
  }
  assert.ok(
    html.indexOf("features/ledger-context.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-form-view.js") <
      html.indexOf("features/property-maintenance.js"),
  );
  assert.ok(
    html.indexOf("features/property-maintenance.js") <
      html.indexOf("features/property-form.js"),
  );
  assert.ok(html.indexOf("features/property-form.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/account-payload.js") <
      html.indexOf("features/account-form.js"),
  );
  assert.ok(
    html.indexOf("features/account-form-view.js") <
      html.indexOf("features/account-form.js"),
  );
  assert.ok(
    html.indexOf("features/account-maintenance.js") <
      html.indexOf("features/account-form.js"),
  );
  assert.ok(html.indexOf("features/account-form.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/payment-entry-form.js") <
      html.indexOf("features/ledger-entry-forms.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-payloads.js") <
      html.indexOf("features/ledger-entry-forms.js"),
  );
  assert.ok(
    html.indexOf("features/expense-entry-form.js") <
      html.indexOf("features/ledger-entry-forms.js"),
  );
  assert.ok(
    html.indexOf("features/ledger-entry-forms.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/ledger-entry-forms.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/create-actions.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/record-entry-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/create-actions.js") <
      html.indexOf("features/entry-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/entry-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-corrections.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/imports.js") <
      html.indexOf("features/csv-import-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/csv-import-workflow.js") < html.indexOf("app.js"),
  );
  assert.doesNotMatch(app, /PropertyDesk(?:ImportUtils|ImportWorkflows)\./);
  assert.ok(
    html.indexOf("features/property-account-index.js") <
      html.indexOf("features/overview-model.js"),
  );
  assert.ok(
    html.indexOf("features/property-account-index.js") <
      html.indexOf("features/property-portfolio-model.js"),
  );
  assert.ok(
    html.indexOf("features/account-financial-summary.js") <
      html.indexOf("features/overview-property-summary-model.js"),
  );
  assert.ok(
    html.indexOf("features/account-financial-summary.js") <
      html.indexOf("features/property-portfolio-account-row-model.js"),
  );
  assert.ok(
    html.indexOf("features/overview-property-summary-model.js") <
      html.indexOf("features/overview-model.js"),
  );
  assert.ok(
    html.indexOf("features/overview-model.js") <
      html.indexOf("features/overview.js"),
  );
  assert.ok(
    html.indexOf("features/overview.js") <
      html.indexOf("features/property-views.js"),
  );
  assert.ok(
    html.indexOf("features/overview.js") <
      html.indexOf("features/overview-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/overview-events.js") <
      html.indexOf("features/overview-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/overview-workflow.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-table.js") <
      html.indexOf("features/property-views.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-table.js") <
      html.indexOf("features/property-portfolio-model.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-account-row-model.js") <
      html.indexOf("features/property-portfolio-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-model.js") <
      html.indexOf("features/property-views.js"),
  );
  assert.ok(
    html.indexOf("features/property-views.js") <
      html.indexOf("features/property-portfolio-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-view-events.js") <
      html.indexOf("features/property-portfolio-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-workflow.js") <
      html.indexOf("features/property-portfolio-screen-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-actions-workflow.js") <
      html.indexOf("features/property-portfolio-screen-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-portfolio-screen-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-details.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-details-view.js") <
      html.indexOf("features/property-details.js"),
  );
  assert.ok(
    html.indexOf("features/property-documents-view.js") <
      html.indexOf("features/property-details-view.js"),
  );
  assert.match(worker, /'\.\/features\/property-documents-view\.js'/);
  assert.ok(
    html.indexOf("features/transaction-list-model.js") <
      html.indexOf("features/transaction-views.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-summary-model.js") <
      html.indexOf("features/transaction-views.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-row-view.js") <
      html.indexOf("features/transaction-views.js"),
  );
  assert.ok(
    html.indexOf("features/property-activity-model.js") <
      html.indexOf("features/property-activity-details.js"),
  );
  assert.ok(
    html.indexOf("features/property-activity-view.js") <
      html.indexOf("features/property-activity-details.js"),
  );
  assert.ok(
    html.indexOf("features/property-activity-details.js") <
      html.indexOf("features/property-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-content-workflow.js") <
      html.indexOf("features/property-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-details.js") <
      html.indexOf("features/property-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-quick-actions.js") <
      html.indexOf("features/property-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-document-workflow.js") <
      html.indexOf("features/property-details-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-details-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-activity-details.js") <
      html.indexOf("features/property-details.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-events.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-holder-events.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-holder-events.js") <
      html.indexOf("features/property-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-document-events.js") <
      html.indexOf("features/property-document-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-quick-actions.js") <
      html.indexOf("features/property-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/document-repository.js") <
      html.indexOf("features/documents.js"),
  );
  assert.ok(
    html.indexOf("features/document-upload-policy.js") <
      html.indexOf("features/document-upload.js"),
  );
  assert.ok(
    html.indexOf("features/document-repository.js") <
      html.indexOf("features/document-upload.js"),
  );
  assert.ok(
    html.indexOf("features/document-upload.js") <
      html.indexOf("features/documents.js"),
  );
  assert.ok(
    html.indexOf("features/document-actions.js") <
      html.indexOf("features/documents.js"),
  );
  assert.match(worker, /'\.\/features\/document-actions\.js'/);
  assert.match(worker, /'\.\/features\/document-upload\.js'/);
  assert.ok(
    html.indexOf("features/documents.js") <
      html.indexOf("features/property-document-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-holder-repository.js") <
      html.indexOf("features/property-holder-management.js"),
  );
  assert.ok(
    html.indexOf("features/property-holder-management.js") <
      html.indexOf("features/property-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-archive.js") <
      html.indexOf("features/property-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-quick-note.js") <
      html.indexOf("features/property-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-events.js") <
      html.indexOf("features/property-detail-actions-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/property-detail-actions-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-document-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-details.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-details-view.js") <
      html.indexOf("features/account-details.js"),
  );
  assert.ok(
    html.indexOf("features/account-history-audit.js") <
      html.indexOf("features/account-history-model.js"),
  );
  assert.ok(
    html.indexOf("features/account-history-model.js") <
      html.indexOf("features/account-history-details.js"),
  );
  assert.ok(
    html.indexOf("features/account-history-view.js") <
      html.indexOf("features/account-history-details.js"),
  );
  assert.ok(
    html.indexOf("features/account-details.js") <
      html.indexOf("features/account-detail-events.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-details-model.js") <
      html.indexOf("features/deposit-details.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-details-view.js") <
      html.indexOf("features/deposit-details.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-details.js") <
      html.indexOf("features/deposit-detail-events.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-details-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-detail-content-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-loan-schedule-view.js") <
      html.indexOf("features/account-details-view.js"),
  );
  assert.match(worker, /'\.\/features\/account-loan-schedule-view\.js'/);
  assert.ok(html.indexOf("features/documents.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/backup-agreement-files.js") <
      html.indexOf("features/backup-export.js"),
  );
  assert.ok(
    html.indexOf("backup-utils.js") <
      html.indexOf("features/backup-records.js"),
  );
  assert.ok(
    html.indexOf("features/backup-records.js") <
      html.indexOf("features/backup-export.js"),
  );
  assert.match(worker, /'\.\/features\/backup-records\.js'/);
  assert.ok(html.indexOf("features/backup-export.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/auth-recovery-view.js") <
      html.indexOf("features/auth-recovery.js"),
  );
  assert.match(worker, /'\.\/features\/auth-recovery-view\.js'/);
  assert.ok(
    html.indexOf("features/auth-recovery.js") <
      html.indexOf("features/auth.js"),
  );
  assert.ok(
    html.indexOf("features/auth-recovery.js") <
      html.indexOf("features/auth-session.js"),
  );
  assert.ok(
    html.indexOf("features/auth-session.js") < html.indexOf("features/auth.js"),
  );
  assert.ok(
    html.indexOf("features/auth-form-view.js") <
      html.indexOf("features/auth-form.js"),
  );
  assert.match(worker, /'\.\/features\/auth-form-view\.js'/);
  assert.ok(
    html.indexOf("features/auth-form.js") < html.indexOf("features/auth.js"),
  );
  assert.ok(html.indexOf("features/auth.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/profile-settings.js") <
      html.indexOf("features/workspace.js"),
  );
  assert.ok(html.indexOf("features/workspace.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/workspace-members.js") <
      html.indexOf("features/workspace.js"),
  );
  assert.ok(
    html.indexOf("features/property-holder-management.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-archive.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-view-events.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-view-events.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/property-quick-note.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-close-entry.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-maintenance.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/account-detail-actions-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/deposit-maintenance.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-correction-form.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-maintenance.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-corrections.js") <
      html.indexOf("app.js"),
  );
  assert.ok(html.indexOf("features/notifications.js") < html.indexOf("app.js"));
  assert.ok(
    html.indexOf("features/pwa-registration.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-maintenance.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/reminder-preview.js") < html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/reminder-workflow.js") <
      html.indexOf("features/app-shell-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/workspace.js") <
      html.indexOf("features/app-shell-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/reminder-activity-model.js") <
      html.indexOf("features/reminder-activity-view.js"),
  );
  assert.ok(
    html.indexOf("features/reminder-activity-view.js") <
      html.indexOf("features/app-shell-workflow.js"),
  );
  assert.ok(
    html.indexOf("features/app-shell-workflow.js") < html.indexOf("app.js"),
  );
  assert.match(worker, /'\.\/import-workflows\.js'/);
  assert.match(worker, /'\.\/zip-utils\.js'/);
  assert.match(worker, /'\.\/features\/import-preview\.js'/);
  assert.match(worker, /'\.\/features\/account-import\.js'/);
  assert.match(worker, /'\.\/features\/payment-import\.js'/);
  assert.match(worker, /'\.\/features\/expense-import\.js'/);
  assert.match(worker, /'\.\/features\/import-repository\.js'/);
  assert.match(worker, /'\.\/features\/property-views\.js'/);
  assert.match(worker, /'\.\/features\/property-portfolio-workflow\.js'/);
  assert.match(
    worker,
    /'\.\/features\/property-portfolio-screen-workflow\.js'/,
  );
  assert.match(
    worker,
    /'\.\/features\/property-portfolio-account-row-model\.js'/,
  );
  assert.match(worker, /'\.\/features\/property-holder-management\.js'/);
  assert.match(worker, /'\.\/features\/property-holder-repository\.js'/);
  assert.match(worker, /'\.\/features\/property-archive\.js'/);
  assert.match(worker, /'\.\/features\/overview\.js'/);
  assert.match(worker, /'\.\/features\/account-financial-summary\.js'/);
  assert.match(worker, /'\.\/features\/property-account-index\.js'/);
  assert.match(worker, /'\.\/features\/overview-property-summary-model\.js'/);
  assert.match(worker, /'\.\/features\/overview-model\.js'/);
  assert.match(worker, /'\.\/features\/app-state\.js'/);
  assert.match(worker, /'\.\/features\/app-lifecycle\.js'/);
  assert.match(worker, /'\.\/features\/backend-client\.js'/);
  assert.match(worker, /'\.\/features\/transaction-views\.js'/);
  assert.match(worker, /'\.\/features\/report-views\.js'/);
  assert.match(worker, /'\.\/features\/report-model\.js'/);
  assert.match(worker, /'\.\/features\/report-export\.js'/);
  assert.match(worker, /'\.\/features\/report-workflow\.js'/);
  assert.match(worker, /'\.\/features\/reports-workflow\.js'/);
  assert.match(worker, /'\.\/features\/date-utils\.js'/);
  assert.match(worker, /'\.\/features\/display-utils\.js'/);
  assert.match(worker, /'\.\/features\/money-input-utils\.js'/);
  assert.match(worker, /'\.\/features\/account-payload\.js'/);
  assert.match(worker, /'\.\/features\/transaction-payloads\.js'/);
  assert.match(worker, /'\.\/features\/property-address-utils\.js'/);
  assert.match(worker, /'\.\/features\/ledger-context\.js'/);
  assert.match(worker, /'\.\/features\/app-services\.js'/);
  assert.match(worker, /'\.\/features\/property-form\.js'/);
  assert.match(worker, /'\.\/features\/property-form-view\.js'/);
  assert.match(worker, /'\.\/features\/property-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/account-form\.js'/);
  assert.match(worker, /'\.\/features\/account-form-view\.js'/);
  assert.match(worker, /'\.\/features\/payment-entry-form\.js'/);
  assert.match(worker, /'\.\/features\/expense-entry-form\.js'/);
  assert.match(worker, /'\.\/features\/ledger-entry-forms\.js'/);
  assert.match(worker, /'\.\/features\/create-actions\.js'/);
  assert.match(worker, /'\.\/features\/imports\.js'/);
  assert.match(worker, /'\.\/features\/csv-import-workflow\.js'/);
  assert.match(worker, /'\.\/features\/property-details\.js'/);
  assert.match(worker, /'\.\/features\/property-details-view\.js'/);
  assert.match(worker, /'\.\/features\/property-details-workflow\.js'/);
  assert.match(worker, /'\.\/features\/property-activity-details\.js'/);
  assert.match(worker, /'\.\/features\/property-activity-model\.js'/);
  assert.match(worker, /'\.\/features\/property-activity-view\.js'/);
  assert.match(worker, /'\.\/features\/property-detail-events\.js'/);
  assert.match(worker, /'\.\/features\/property-holder-events\.js'/);
  assert.match(worker, /'\.\/features\/property-detail-document-events\.js'/);
  assert.match(worker, /'\.\/features\/account-details\.js'/);
  assert.match(worker, /'\.\/features\/account-details-view\.js'/);
  assert.match(worker, /'\.\/features\/account-history-details\.js'/);
  assert.match(worker, /'\.\/features\/account-history-audit\.js'/);
  assert.match(worker, /'\.\/features\/account-history-model\.js'/);
  assert.match(worker, /'\.\/features\/account-history-view\.js'/);
  assert.match(worker, /'\.\/features\/deposit-details-model\.js'/);
  assert.match(worker, /'\.\/features\/deposit-details-view\.js'/);
  assert.match(worker, /'\.\/features\/account-detail-actions-workflow\.js'/);
  assert.match(worker, /'\.\/features\/account-close-entry\.js'/);
  assert.match(worker, /'\.\/features\/account-detail-content-workflow\.js'/);
  assert.match(worker, /'\.\/features\/deposit-details-workflow\.js'/);
  assert.match(worker, /'\.\/features\/transaction-list-model\.js'/);
  assert.match(worker, /'\.\/features\/transaction-summary-model\.js'/);
  assert.match(worker, /'\.\/features\/transaction-row-view\.js'/);
  assert.match(worker, /'\.\/features\/account-detail-content-workflow\.js'/);
  assert.match(worker, /'\.\/features\/account-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/transaction-maintenance-workflow\.js'/);
  assert.match(worker, /'\.\/features\/document-upload-policy\.js'/);
  assert.match(worker, /'\.\/features\/documents\.js'/);
  assert.match(worker, /'\.\/features\/property-detail-actions-workflow\.js'/);
  assert.match(worker, /'\.\/features\/property-document-workflow\.js'/);
  assert.match(worker, /'\.\/features\/backup-agreement-files\.js'/);
  assert.match(worker, /'\.\/features\/backup-export\.js'/);
  assert.match(worker, /'\.\/features\/auth-recovery\.js'/);
  assert.match(worker, /'\.\/features\/auth-session\.js'/);
  assert.match(worker, /'\.\/features\/auth-form\.js'/);
  assert.match(worker, /'\.\/features\/auth\.js'/);
  assert.match(worker, /'\.\/features\/workspace\.js'/);
  assert.match(worker, /'\.\/features\/property-holder-management\.js'/);
  assert.match(worker, /'\.\/features\/property-holder-repository\.js'/);
  assert.match(worker, /'\.\/features\/property-archive\.js'/);
  assert.match(worker, /'\.\/features\/account-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/deposit-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/transaction-maintenance\.js'/);
  assert.doesNotMatch(worker, /record-maintenance\.js/);
  assert.match(worker, /'\.\/features\/transaction-corrections\.js'/);
  assert.match(worker, /'\.\/features\/notifications\.js'/);
  assert.match(worker, /'\.\/features\/pwa-registration\.js'/);
  assert.match(worker, /'\.\/features\/transaction-maintenance\.js'/);
  assert.match(worker, /'\.\/features\/reminder-preview\.js'/);
  assert.match(worker, /'\.\/features\/reminder-workflow\.js'/);
  assert.match(worker, /'\.\/features\/reminder-activity-model\.js'/);
  assert.doesNotMatch(worker, /workspace-settings-workflow\.js/);
  assert.match(app, /attachCsvImportEvents,/);
});
