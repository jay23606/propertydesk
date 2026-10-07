const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("record entry workflow owns forms and their global create actions", () => {
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
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.match(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.match(app, /PropertyDeskReportWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskReport(?:Model|Views|Export)\.create\(/,
  );
  assert.match(app, /registerShell: window\.PropertyDeskPwa\.registerShell/);
  assert.doesNotMatch(app, /registerShell: \(\) =>/);
  assert.match(
    app,
    /attachCreateActionEvents,\s*attachPropertyFormEvents,\s*attachAccountFormEvents,\s*attachLedgerEntryFormEvents,/,
  );
  assert.match(app, /openAccountForProperty,/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(app, /entryWorkflow\./);
  assert.match(app, /attachAccountDetailActionEvents,\s*attachDepositEvents,/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "record-entry-workflow.js"),
    "utf8",
  );
  for (const feature of ["PropertyForm", "AccountForm", "LedgerEntryForms"]) {
    assert.match(workflow, new RegExp(`PropertyDesk${feature}\\.create\\(`));
  }
  assert.match(workflow, /PropertyDeskCreateActions\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /attachCreateActionEvents/);
  const creationOrder = [
    "PropertyDeskTransactionMaintenanceWorkflow.create(",
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
    /attachTransactionViewEvents,[\s\S]*?attachTransactionActionEvents,[\s\S]*?PropertyDeskTransactionScreenWorkflow\.create\(/,
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
    /PropertyDeskAccountScreenWorkflow\.create\(\{[\s\S]*?amortizationSchedule/,
  );
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create/);
  assert.match(app, /PropertyDeskOverviewWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.match(app, /attachPropertyGridEvents,\s*attachPropertyActionEvents,/);
  assert.match(app, /PropertyDeskPropertyDetailContentWorkflow\.create\(/);
  assert.match(app, /PropertyDeskPropertyDetailManagementWorkflow\.create\(/);
  assert.match(app, /attachPropertyHolderEvents/);
  assert.match(app, /attachPropertyDetailEvents/);
  assert.match(app, /attachPropertyQuickActionEvents/);
  assert.match(app, /PropertyDeskPropertyDetailManagementWorkflow\.create\(/);
  assert.doesNotMatch(app, /attachPropertyViewEvents/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(app, /window\.PropertyDeskAccountMaintenance\.create\(/);
  assert.match(app, /window\.PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.match(app, /PropertyDeskTransactionScreenWorkflow\.create/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow\.create/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create/);
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
    "PropertyDeskPropertyDetailManagementWorkflow.create(",
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
    "features/property-detail-management-workflow.js",
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
    app.indexOf("PropertyDeskAccountScreenWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyDetailContentWorkflow.create("),
  );
});

test("app wires reminder activity and preview through the workspace workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /WorkspaceReminderWorkflow\.create\(\{[\s\S]*?amountDueSince,[\s\S]*?unpaidDueAccrualStart,[\s\S]*?openModal: modal\.openModal,/,
  );
  assert.match(app, /PropertyDeskWorkspaceReminderWorkflow\.create\(/);
  assert.match(
    app,
    /PropertyDeskWorkspaceNavigationWorkflow\.create\(\{[\s\S]*?renderReminderActivity,[\s\S]*?documentRef: document,[\s\S]*?windowRef: window,/,
  );
  assert.match(app, /previewReminderEmail,/);
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
  assert.match(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
