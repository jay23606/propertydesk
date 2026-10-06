const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("app root delegates entry forms and create actions to one workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.ok(
    app.indexOf("PropertyDeskNotifications.create(") <
      app.indexOf("PropertyDeskAppServices.create("),
  );
  assert.match(app, /PropertyDeskAppServices\.create\(\{[\s\S]*?toast,/);
  assert.match(app, /PropertyDeskEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow\.create\(/);
  assert.match(app, /PropertyDeskReportWorkflow\.create\(/);
  assert.match(app, /PropertyDeskReportExport\.create\(/);
  assert.match(app, /registerShell: window\.PropertyDeskPwa\.registerShell/);
  assert.doesNotMatch(app, /registerShell: \(\) =>/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionCorrections|RecordEntryWorkflow|CreateActions)\.create\(/,
  );
  assert.match(app, /attachEvents: attachEntryEvents/);
  assert.doesNotMatch(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /openAccountForProperty,/);
  assert.match(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(\{[\s\S]*?updatePaymentGuidance,/,
  );
  assert.doesNotMatch(app, /entryWorkflow\./);
  assert.match(app, /function attachAccountDetailsEvents\(\)/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-entry-workflow.js"),
    "utf8",
  );
  for (const feature of ["PropertyForm", "AccountForm", "LedgerEntryForms"]) {
    assert.match(workflow, new RegExp(`PropertyDesk${feature}\\.create\\(`));
  }
  assert.doesNotMatch(workflow, /PropertyDeskCreateActions/);
  const ledgerWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-workflow.js"),
    "utf8",
  );
  const creationOrder = [
    "PropertyDeskTransactionCorrections.create(",
    "PropertyDeskRecordEntryWorkflow.create(",
  ].map((marker) => ledgerWorkflow.indexOf(marker));
  assert.ok(creationOrder.every((position) => position >= 0));
  assert.deepEqual(
    creationOrder,
    [...creationOrder].sort((left, right) => left - right),
  );
  assert.match(ledgerWorkflow, /saveCorrection/);
  assert.doesNotMatch(ledgerWorkflow, /PropertyDeskTransactionViews/);
  const entryWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "entry-workflow.js"),
    "utf8",
  );
  assert.match(entryWorkflow, /PropertyDeskLedgerWorkflow\.create\(/);
  assert.match(entryWorkflow, /PropertyDeskCreateActions\.create\(/);
  assert.doesNotMatch(entryWorkflow, /PropertyDeskTransactionViews/);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /amortizationSchedule,[\s\S]*?\} = window\.PropertyDeskLedgerUtils;/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailContentWorkflow\.create\(\{[\s\S]*?amortizationSchedule/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:AccountDetailEvents|DepositDetailEvents)\.create/,
  );
  assert.match(app, /PropertyDeskOverviewPropertySummaryModel\.create\(/);
  assert.match(app, /PropertyDeskOverviewModel\.create\(/);
  assert.match(app, /PropertyDeskOverview\.create\(/);
  assert.match(app, /PropertyDeskOverviewEvents\.create\(/);
  assert.match(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyPortfolioActionsWorkflow\.create\(/);
  assert.match(app, /function attachPropertyPortfolioEvents\(\)/);
  assert.match(app, /PropertyDeskPropertyDetailContentWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyDetailActionsWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyDocumentWorkflow\.create\(/);
  assert.match(app, /function attachPropertyDetailsEvents\(\)/);
  assert.doesNotMatch(app, /attachPropertyViewEvents/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyDetailEvents|PropertyDetailDocumentEvents|Documents|DocumentRepository|PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /PropertyDeskEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionViewEvents|TransactionCorrectionForm)\.create\(/,
  );
  assert.doesNotMatch(app, /window\.PropertyDeskAccountMaintenance\.create\(/);
  assert.match(
    app,
    /window\.PropertyDeskAccountDetailActionsWorkflow\.create\(/,
  );
  assert.match(app, /window\.PropertyDeskDepositMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.doesNotMatch(
    app,
    /PropertyDeskTransaction(?:ViewEvents|CorrectionForm)\.create/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionCorrections|RecordEntryWorkflow)\.create/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Deposit|Transaction)Maintenance\.create/,
  );
});

test("app root composes independent property screens and shares detail actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const creationOrder = [
    "PropertyDeskPropertyDetailContentWorkflow.create(",
    "PropertyDeskPropertyDetailActionsWorkflow.create(",
    "PropertyDeskPropertyDocumentWorkflow.create(",
    "PropertyDeskOverviewPropertySummaryModel.create(",
    "PropertyDeskOverviewModel.create(",
    "PropertyDeskOverview.create(",
    "PropertyDeskOverviewEvents.create(",
    "PropertyDeskPropertyPortfolioWorkflow.create(",
    "PropertyDeskPropertyPortfolioActionsWorkflow.create(",
  ].map((marker) => app.indexOf(marker));

  assert.ok(creationOrder.every((position) => position >= 0));
  assert.ok(creationOrder[0] < creationOrder[1]);
  assert.ok(creationOrder[1] < creationOrder[2]);
  assert.match(app, /openPropertyDetails,\s*openPropertyPayment,/);
  assert.match(
    app,
    /openPayment,\s*openPropertyDetails,\s*openAccountForProperty,/,
  );
  for (const script of [
    "features/property-detail-content-workflow.js",
    "features/property-detail-actions-workflow.js",
    "features/property-document-workflow.js",
    "features/overview-property-summary-model.js",
    "features/overview-model.js",
    "features/overview.js",
    "features/overview-events.js",
    "features/property-portfolio-workflow.js",
    "features/property-portfolio-actions-workflow.js",
  ]) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before the app composition root`,
    );
    assert.match(worker, new RegExp(`'\\./${script.replaceAll("/", "\\/")}'`));
  }
  assert.doesNotMatch(app, /PropertyDeskPropertyWorkspaceWorkflow/);
  assert.doesNotMatch(html, /property-workspace-workflow\.js/);
  assert.doesNotMatch(worker, /property-workspace-workflow\.js/);
  assert.ok(
    app.indexOf("PropertyDeskAccountDetailContentWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyDetailContentWorkflow.create("),
  );
});

test("reminder workflow composes the activity view and email preview", () => {
  const passed = {};
  const reminderActivity = () => "activity";
  const context = vm.createContext({
    window: {
      PropertyDeskReminderActivityModel: {
        create: (options) => {
          passed.activityModel = options;
          return { buildRows: () => [] };
        },
      },
      PropertyDeskReminderActivityView: {
        create: (options) => {
          passed.activityView = options;
          return { renderReminderActivity: reminderActivity };
        },
      },
      PropertyDeskReminderPreview: {
        create: (options) => {
          passed.preview = options;
          return { previewReminderEmail: () => "preview" };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "reminder-workflow.js"),
      "utf8",
    ),
    context,
  );
  const openModal = () => {};
  const state = { accounts: [], properties: [], reminderLogs: [] };
  const workflow = context.window.PropertyDeskReminderWorkflow.create({
    openModal,
    state,
  });

  assert.equal(passed.preview.openModal, openModal);
  assert.equal(passed.activityModel.state, state);
  assert.deepEqual(Object.keys(passed.activityView).sort(), [
    "$",
    "esc",
    "fmtDate",
    "model",
    "money",
  ]);
  assert.equal(workflow.renderReminderActivity, reminderActivity);
  assert.equal(workflow.previewReminderEmail(), "preview");
});

test("app coordinator delegates shared setup to the app services workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskAppServices\.create\(/);
  assert.match(app, /PropertyDeskLedgerContext\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:WorkspaceData|BackendClient|AppState|WorkspaceRefresh)\.create/,
  );
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskDepositMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailActionsWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
