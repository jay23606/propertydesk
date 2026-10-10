const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

function loadCatalog(filename, exportName) {
  const source = fs.readFileSync(path.join(root, "features", filename), "utf8");
  const moduleNames = [
    ...new Set(
      [...source.matchAll(/window\.(PropertyDesk[A-Za-z]+)/g)]
        .map((match) => match[1])
        .filter((name) => name !== exportName),
    ),
  ];
  const window = Object.fromEntries(
    moduleNames.map((name) => [
      name,
      name === "PropertyDeskLedgerEntryForms" ||
      name === "PropertyDeskTransactionViews"
        ? { create() {} }
        : Object.freeze({ name }),
    ]),
  );
  const context = vm.createContext({ window });
  vm.runInContext(source, context);
  return { catalog: window[exportName].create(), window };
}

test("transaction workspace module catalog owns its workflow dependencies", () => {
  const { catalog, window } = loadCatalog(
    "transaction-workspace-module-catalog.js",
    "PropertyDeskTransactionWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(
    catalog.detailContextSetup,
    window.PropertyDeskPropertyDetailContextSetup,
  );
  assert.deepEqual(Object.keys(catalog).sort(), [
    "correction",
    "correctionModel",
    "correctionModules",
    "entryForms",
    "expenseAccountPolicy",
    "expenseView",
    "ledger",
    "maintenance",
    "maintenanceEvents",
    "maintenanceSetup",
    "paymentView",
    "propertyPaymentAction",
    "transactionPayloads",
    "views",
    "voidEntry",
    "voidMaintenance",
    "voidModel",
    "workspace",
  ]);
  assert.equal(
    catalog.correctionModules.maintenance,
    window.PropertyDeskTransactionCorrectionMaintenance,
  );
  assert.equal(
    catalog.entryForms.create,
    window.PropertyDeskLedgerEntryForms.create,
  );
  assert.equal(
    catalog.views.modules.rowView,
    window.PropertyDeskTransactionRowView,
  );
  assert.equal(
    catalog.maintenanceEvents,
    window.PropertyDeskTransactionMaintenanceEvents,
  );
  assert.equal(
    catalog.maintenanceSetup,
    window.PropertyDeskTransactionMaintenanceSetup,
  );
});

test("account and deposit module catalog keeps detail and adjustment workflows together", () => {
  const { catalog, window } = loadCatalog(
    "account-deposit-workspace-module-catalog.js",
    "PropertyDeskAccountDepositWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.deepEqual(Object.keys(catalog).sort(), [
    "accountDetails",
    "adjustmentModel",
    "contextSetup",
    "deposit",
    "workspace",
  ]);
  assert.equal(
    catalog.contextSetup,
    window.PropertyDeskAccountDepositContextSetup,
  );
  assert.equal(
    catalog.deposit.adjustmentModules.maintenance,
    window.PropertyDeskDepositMaintenance,
  );
  assert.equal(
    catalog.accountDetails.actionWorkflows.closeEntry,
    window.PropertyDeskAccountCloseEntry,
  );
  assert.equal(
    catalog.accountDetails.contentModules.accountHistoryModel,
    window.PropertyDeskAccountHistoryModel,
  );
});

test("property workspace module catalog owns overview, detail, and portfolio dependencies", () => {
  const { catalog, window } = loadCatalog(
    "property-workspace-module-catalog.js",
    "PropertyDeskPropertyWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(
    catalog.contentModules.activityModules.transactions,
    window.PropertyDeskPropertyActivityTransactions,
  );
  assert.equal(
    catalog.managementModules.detailEvents,
    window.PropertyDeskPropertyDetailEvents,
  );
  assert.equal(
    catalog.portfolioModules.pdfExport,
    window.PropertyDeskPropertyPdfExport,
  );
  assert.equal(
    catalog.documentModules.actions.modules.open,
    window.PropertyDeskDocumentOpen,
  );
  assert.equal(
    catalog.quickNote.noteMaintenance,
    window.PropertyDeskPropertyNoteMaintenance,
  );
});

test("import workspace module catalog owns validation, preview, and commit dependencies", () => {
  const { catalog, window } = loadCatalog(
    "import-workspace-module-catalog.js",
    "PropertyDeskImportWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(
    catalog.modules.paymentValidation,
    window.PropertyDeskPaymentImportValidation,
  );
  assert.equal(
    catalog.modules.preview.modules.rendering,
    window.PropertyDeskImportPreviewRendering,
  );
  assert.equal(
    catalog.modules.commit.modules.reporting,
    window.PropertyDeskImportCommitReporting,
  );
  assert.equal(
    catalog.modules.transactionImportWorkflow,
    window.PropertyDeskTransactionImportWorkflow,
  );
});

test("property account form module catalog owns both form feature trees", () => {
  const { catalog, window } = loadCatalog(
    "property-account-forms-module-catalog.js",
    "PropertyDeskPropertyAccountFormsModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(
    catalog.propertyFormModules.maintenance,
    window.PropertyDeskPropertySaveMaintenance,
  );
  assert.equal(
    catalog.accountFormModules.propertyAction,
    window.PropertyDeskPropertyAccountAction,
  );
  assert.equal(catalog.accountPayload, window.PropertyDeskAccountPayload);
  assert.equal(
    catalog.recordWrite,
    window.PropertyDeskWorkspaceRecordWriteWorkflow,
  );
});

test("app shell module catalog groups workspace settings and navigation", () => {
  const { catalog, window } = loadCatalog(
    "app-shell-module-catalog.js",
    "PropertyDeskAppShellModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(catalog.workspace, window.PropertyDeskWorkspace);
  assert.equal(
    catalog.workspaceModules.profileModules.settings,
    window.PropertyDeskProfileSettings,
  );
  assert.equal(
    catalog.workspaceModules.reminderActivityData,
    window.PropertyDeskWorkspaceReminderActivityData,
  );
  assert.equal(catalog.navigation, window.PropertyDeskNavigation);
});

test("backup workspace module catalog owns its private archive exporter", () => {
  const { catalog, window } = loadCatalog(
    "backup-workspace-module-catalog.js",
    "PropertyDeskBackupWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(catalog.backup, window.PropertyDeskBackupWorkspaceWorkflow);
  assert.equal(catalog.records, window.PropertyDeskBackupRecords);
  assert.equal(
    catalog.exporter.modules.archive,
    window.PropertyDeskBackupArchive,
  );
});

test("app startup module catalog owns auth screens and lifecycle dependencies", () => {
  const { catalog, window } = loadCatalog(
    "app-startup-module-catalog.js",
    "PropertyDeskAppStartupModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(catalog.startup, window.PropertyDeskAppStartupWorkflow);
  assert.equal(catalog.auth.modules.screens, window.PropertyDeskAuthScreens);
  assert.equal(
    catalog.auth.modules.recoveryView,
    window.PropertyDeskAuthRecoveryView,
  );
  assert.equal(catalog.lifecycle, window.PropertyDeskAppLifecycle);
});

test("report module catalog keeps report components together", () => {
  const { catalog, window } = loadCatalog(
    "report-workspace-module-catalog.js",
    "PropertyDeskReportWorkspaceModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(catalog.report, window.PropertyDeskReportWorkflow);
  assert.equal(catalog.model, window.PropertyDeskReportModel);
  assert.equal(catalog.exporter, window.PropertyDeskReportExport);
});

test("reminder preview module catalog keeps preview model and view together", () => {
  const { catalog, window } = loadCatalog(
    "reminder-preview-module-catalog.js",
    "PropertyDeskReminderPreviewModuleCatalog",
  );

  assert.equal(Object.isFrozen(catalog), true);
  assert.equal(
    catalog.previewWorkflow,
    window.PropertyDeskReminderPreviewWorkflow,
  );
  assert.equal(catalog.model, window.PropertyDeskReminderPreviewModel);
  assert.equal(catalog.preview, window.PropertyDeskReminderPreview);
});

test("workspace module catalogs load before the root and stay in the PWA shell", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const catalogs = [
    "features/transaction-workspace-module-catalog.js",
    "features/account-deposit-workspace-module-catalog.js",
    "features/property-workspace-module-catalog.js",
    "features/import-workspace-module-catalog.js",
    "features/property-account-forms-module-catalog.js",
    "features/app-shell-module-catalog.js",
    "features/backup-workspace-module-catalog.js",
    "features/app-startup-module-catalog.js",
    "features/report-workspace-module-catalog.js",
    "features/reminder-preview-module-catalog.js",
  ];

  for (const catalog of catalogs) {
    assert.ok(html.indexOf(catalog) < html.indexOf("app.js?v="));
    assert.ok(worker.includes(`'./${catalog}'`));
  }
  assert.match(
    app,
    /workflows: window\.PropertyDeskTransactionWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskAccountDepositWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskPropertyWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskImportWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskPropertyAccountFormsModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskAppShellModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskBackupWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskAppStartupModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskReportWorkspaceModuleCatalog\.create\(\)/,
  );
  assert.match(
    app,
    /workflows:\s*window\.PropertyDeskReminderPreviewModuleCatalog\.create\(\)/,
  );
});
