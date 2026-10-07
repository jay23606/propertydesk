const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("app root wires record entry forms and create actions directly", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.ok(
    app.indexOf("PropertyDeskNotifications.create(") <
      app.indexOf("PropertyDeskBackendClient.create("),
  );
  assert.match(
    app,
    /PropertyDeskBackendClient\.create\(\{\s*config: window\.PROPERTYDESK_CONFIG \|\| \{\},\s*supabase: window\.supabase,/,
  );
  assert.match(app, /PropertyDeskAppState\.create\(\)/);
  assert.match(app, /PropertyDeskWorkspaceRefresh\.create\(\{[\s\S]*?toast,/);
  assert.match(app, /PropertyDeskTransactionCorrections\.create\(/);
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.match(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenance\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.match(app, /PropertyDeskReportModel\.create\(/);
  assert.match(app, /PropertyDeskReportViews\.create\(/);
  assert.match(app, /PropertyDeskReportExport\.create\(/);
  assert.match(app, /registerShell: window\.PropertyDeskPwa\.registerShell/);
  assert.doesNotMatch(app, /registerShell: \(\) =>/);
  assert.match(
    app,
    /attachCreateActionEvents,\s*attachPropertyFormEvents,\s*attachAccountFormEvents,\s*attachLedgerEntryFormEvents,/,
  );
  assert.match(app, /openAccountForProperty,/);
  assert.match(
    app,
    /PropertyDeskTransactionCorrectionForm\.create\(\{[\s\S]*?updatePaymentGuidance,/,
  );
  assert.doesNotMatch(app, /entryWorkflow\./);
  assert.match(app, /attachAccountDetailActionEvents,\s*attachDepositEvents,/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-entry-workflow.js"),
    "utf8",
  );
  for (const feature of ["PropertyForm", "AccountForm", "LedgerEntryForms"]) {
    assert.match(workflow, new RegExp(`PropertyDesk${feature}\\.create\\(`));
  }
  assert.doesNotMatch(workflow, /PropertyDeskCreateActions/);
  const creationOrder = [
    "PropertyDeskTransactionCorrections.create(",
    "PropertyDeskRecordEntryWorkflow.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(creationOrder.every((position) => position >= 0));
  assert.deepEqual(
    creationOrder,
    [...creationOrder].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskRecordEntryWorkflow\.create\(\{[\s\S]*?saveCorrection,/,
  );
  assert.match(
    app,
    /attachEvents: attachTransactionViewEvents[\s\S]*?PropertyDeskTransactionViews\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskEntryWorkflow/);
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
  assert.match(app, /PropertyDeskAccountDetailEvents\.create/);
  assert.match(app, /PropertyDeskDepositDetailEvents\.create/);
  assert.match(app, /PropertyDeskOverviewWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.match(app, /attachPropertyGridEvents,\s*attachPropertyActionEvents,/);
  assert.match(app, /PropertyDeskPropertyDetailContentWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyArchive\.create\(/);
  assert.match(app, /PropertyDeskPropertyDetailEvents\.create\(/);
  assert.match(app, /PropertyDeskPropertyDetailQuickActions\.create\(/);
  assert.match(app, /PropertyDeskPropertyHolderManagement\.create\(/);
  assert.match(app, /PropertyDeskPropertyHolderEvents\.create\(/);
  assert.match(app, /PropertyDeskDocuments\.create\(/);
  assert.match(app, /PropertyDeskDocumentRepository\.create\(/);
  assert.match(app, /PropertyDeskPropertyDetailDocumentEvents\.create\(/);
  assert.match(app, /attachPropertyDetailEvents/);
  assert.match(app, /attachPropertyQuickActionEvents/);
  assert.match(app, /PropertyDeskPropertyHolderManagement\.create\(/);
  assert.doesNotMatch(app, /attachPropertyViewEvents/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /PropertyDeskTransactionCorrections\.create\(/);
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenance\.create\(/);
  assert.match(app, /PropertyDeskTransactionViewEvents\.create\(/);
  assert.match(app, /PropertyDeskTransactionCorrectionForm\.create\(/);
  assert.doesNotMatch(app, /window\.PropertyDeskAccountMaintenance\.create\(/);
  assert.match(app, /window\.PropertyDeskAccountCloseMaintenance\.create\(/);
  assert.match(app, /window\.PropertyDeskDepositMaintenance\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.match(app, /PropertyDeskTransactionViewEvents\.create/);
  assert.match(app, /PropertyDeskTransactionCorrectionForm\.create/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow\.create/);
  assert.match(app, /PropertyDeskDepositMaintenance\.create/);
  assert.match(app, /PropertyDeskTransactionMaintenance\.create/);
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
    "PropertyDeskPropertyArchive.create(",
    "PropertyDeskPropertyDetailEvents.create(",
    "PropertyDeskPropertyDetailQuickActions.create(",
    "PropertyDeskPropertyHolderManagement.create(",
    "PropertyDeskPropertyDetailDocumentEvents.create(",
    "PropertyDeskOverviewWorkflow.create(",
    "PropertyDeskPropertyPortfolioWorkflow.create(",
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
    "features/property-archive.js",
    "features/property-detail-events.js",
    "features/property-detail-quick-actions.js",
    "features/property-holder-management.js",
    "features/property-holder-events.js",
    "features/documents.js",
    "features/document-repository.js",
    "features/property-detail-document-events.js",
    "features/overview-property-summary-model.js",
    "features/overview-model.js",
    "features/overview.js",
    "features/overview-events.js",
    "features/overview-workflow.js",
    "features/property-portfolio-table.js",
    "features/property-portfolio-account-row-model.js",
    "features/property-portfolio-model.js",
    "features/property-views.js",
    "features/property-view-events.js",
    "features/property-quick-note.js",
    "features/property-portfolio-workflow.js",
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

test("app wires reminder activity and email preview separately", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const createOrder = [
    "PropertyDeskReminderActivityModel.create(",
    "PropertyDeskReminderActivityView.create(",
    "PropertyDeskReminderPreviewModel.create(",
    "PropertyDeskReminderPreview.create(",
  ].map((marker) => app.indexOf(marker));
  assert.ok(createOrder.every((position) => position >= 0));
  assert.deepEqual(
    createOrder,
    [...createOrder].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskReminderActivityView\.create\(\{[\s\S]*?model: reminderActivityModel,/,
  );
  assert.match(
    app,
    /PropertyDeskReminderPreview.create\(\{[\s\S]*?model: reminderPreviewModel,[\s\S]*?openModal: modal\.openModal/,
  );
  assert.doesNotMatch(app, /function renderWorkspaceSettings\(\)/);
  assert.match(
    app,
    /PropertyDeskWorkspace\.create\(\{[\s\S]*?renderReminderActivity,/,
  );
  assert.match(
    app,
    /PropertyDeskNavigation\.create\(\{[\s\S]*?renderWorkspaceSettings: workspace\.renderWorkspaceSettings,/,
  );
  assert.match(app, /previewReminderEmail,/);
  assert.doesNotMatch(app, /PropertyDeskReminderWorkflow/);
});

test("app root composes shared state and workspace services directly", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /PropertyDeskBackendClient\.create\(\{\s*config: window\.PROPERTYDESK_CONFIG \|\| \{\},\s*supabase: window\.supabase,/,
  );
  assert.match(app, /PropertyDeskAppState\.create\(\)/);
  assert.match(app, /PropertyDeskWorkspaceData\.create\(\)/);
  assert.match(app, /PropertyDeskWorkspaceRefresh\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskAppServices/);
  assert.match(app, /PropertyDeskLedgerContext\.create\(/);
  assert.match(app, /PropertyDeskDepositContext\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenance\.create\(/);
  assert.match(app, /PropertyDeskDepositMaintenance\.create\(/);
  assert.match(app, /PropertyDeskAccountCloseMaintenance\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
