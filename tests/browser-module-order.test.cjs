const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

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
    ["features/currency-utils.js", "features/posted-ledger-utils.js"],
    ["features/transaction-options.js", "features/display-utils.js"],
    ["features/display-utils.js", "features/payment-import-allocation.js"],
    ["features/account-status-utils.js", "app.js"],
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
      "features/deposit-workspace-workflow.js",
    ],
    [
      "features/deposit-details-view.js",
      "features/deposit-workspace-workflow.js",
    ],
    [
      "features/deposit-adjustment-workflow.js",
      "features/deposit-workspace-workflow.js",
    ],
    ["features/account-detail-content-workflow.js", "app.js"],
    ["features/account-detail-action-workflow.js", "app.js"],
    ["features/deposit-workspace-workflow.js", "app.js"],
    ["features/report-model.js", "features/report-workflow.js"],
    ["features/report-views.js", "features/report-workflow.js"],
    ["features/report-export.js", "features/report-workflow.js"],
    ["features/import-review.js", "features/account-import.js"],
    ["features/account-repository.js", "features/account-maintenance.js"],
    [
      "features/repository-write-feedback.js",
      "features/account-maintenance.js",
    ],
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
    [
      "features/repository-write-feedback.js",
      "features/ledger-entry-save-workflow.js",
    ],
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
      "features/property-screen-workflow.js",
    ],
    [
      "features/property-holder-events.js",
      "features/property-screen-workflow.js",
    ],
    ["features/documents.js", "features/property-screen-workflow.js"],
    ["features/document-repository.js", "features/property-screen-workflow.js"],
    [
      "features/property-detail-document-events.js",
      "features/property-screen-workflow.js",
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
      "features/workspace-reminder-workflow.js",
    ],
    [
      "features/reminder-activity-view.js",
      "features/workspace-reminder-workflow.js",
    ],
    [
      "features/reminder-preview-model.js",
      "features/workspace-reminder-workflow.js",
    ],
    ["features/reminder-preview.js", "features/workspace-reminder-workflow.js"],
    ["features/workspace-reminder-workflow.js", "app.js"],
    ["features/workspace.js", "app.js"],
    ["features/navigation.js", "app.js"],
    ["features/app-state.js", "features/workspace-runtime.js"],
    ["features/backend-client.js", "features/workspace-runtime.js"],
    ["features/workspace-refresh.js", "features/workspace-runtime.js"],
    ["workspace-data.js", "features/workspace-runtime.js"],
    ["features/posted-ledger-utils.js", "app.js"],
    ["features/ledger-schedule-utils.js", "app.js"],
    ["features/loan-amortization-utils.js", "app.js"],
    ["features/deposit-ledger-utils.js", "app.js"],
    [
      "features/ledger-context.js",
      "features/workspace-account-financial-context.js",
    ],
    ["features/workspace-account-financial-context.js", "app.js"],
    ["features/transaction-maintenance-workflow.js", "app.js"],
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
      "features/expense-entry-form.js",
    ],
    [
      "features/ledger-entry-save-workflow.js",
      "features/payment-entry-form.js",
    ],
    [
      "features/ledger-entry-save-workflow.js",
      "features/ledger-entry-forms.js",
    ],
    ["features/payment-entry-form.js", "features/ledger-entry-forms.js"],
    ["features/property-payment-action.js", "features/payment-entry-form.js"],
    ["features/property-account-action.js", "app.js"],
    ["features/property-form.js", "app.js"],
    ["features/account-form.js", "app.js"],
    ["features/ledger-entry-forms.js", "app.js"],
    ["features/create-actions.js", "app.js"],
    ["features/transaction-payloads.js", "features/ledger-entry-forms.js"],
    ["features/transaction-corrections.js", "app.js"],
    ["features/transaction-views.js", "app.js"],
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
    ["features/workspace-members-view.js", "features/workspace.js"],
    ["features/workspace-members.js", "features/workspace.js"],
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

  const dependencyEdges = new Set();
  for (const [dependency, dependent] of dependencies) {
    const edge = `${dependency} -> ${dependent}`;
    assert.equal(
      dependencyEdges.has(edge),
      false,
      `Duplicate browser dependency edge: ${edge}`,
    );
    dependencyEdges.add(edge);
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
