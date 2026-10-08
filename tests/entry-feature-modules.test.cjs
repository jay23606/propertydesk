const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("account records and ledger entries use separate workspace workflows", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.ok(
    app.indexOf("PropertyDeskNotifications.create(") <
      app.indexOf("PropertyDeskWorkspaceRuntime.create("),
  );
  assert.match(
    app,
    /PropertyDeskWorkspaceRuntime\.create\(\{\s*config: window\.PROPERTYDESK_CONFIG \|\| \{\},\s*supabase: window\.supabase,\s*repositories:/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:BackendClient|AppState|WorkspaceRefresh)\.create\(/,
  );
  assert.match(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(
    app,
    /transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailActionWorkflow\.create\(/);
  assert.match(app, /accountHistoryRepository: repositories\.accountHistory/);
  assert.match(app, /PropertyDeskReportWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskReport(?:Model|Views|Export)\.create\(/,
  );
  assert.match(app, /registerShell: window\.PropertyDeskPwa\.registerShell/);
  assert.doesNotMatch(app, /registerShell: \(\) =>/);
  assert.match(app, /attachCreateActionEvents/);
  assert.match(
    app,
    /openAccountForProperty: accountForm\.openAccountForProperty/,
  );
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(app, /entryWorkflow\./);
  assert.match(
    app,
    /attachAccountDetailActionEvents,\s*depositWorkspace\.attachDepositAdjustmentEvents,/,
  );
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  const ledgerEntryForms = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-entry-forms.js"),
    "utf8",
  );
  assert.match(app, /PropertyDeskPropertyForm\.create\(/);
  assert.match(app, /PropertyDeskAccountForm\.create\(/);
  assert.match(ledgerEntryForms, /attachLedgerEntryFormEvents/);
  assert.match(app, /repository: repositories\.accounts/);
  assert.match(app, /repository: repositories\.properties/);
  assert.match(
    app,
    /buildAccountPayload: window\.PropertyDeskAccountPayload\.build/,
  );
  assert.match(app, /formModel: window\.PropertyDeskAccountFormModel/);
  assert.match(app, /transactionRepository: repositories\.transactions/);
  assert.match(
    app,
    /transactionPayloads: window\.PropertyDeskTransactionPayloads/,
  );
  assert.match(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(
    app,
    /LedgerEntryForms\.create\(\{[\s\S]*?transactionRepository: repositories\.transactions,[\s\S]*?transactionPayloads: window\.PropertyDeskTransactionPayloads,[\s\S]*?saveCorrection: transactionMaintenance\.saveCorrection/,
  );
  assert.match(
    app,
    /PropertyDeskTransactionViews\.create\([\s\S]*?const \{ attachTransactionActionEvents \} =\s+transactionMaintenance\.createTransactionActionHandlers\([\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
  assert.doesNotMatch(app, /PropertyDeskEntryWorkflow/);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /PropertyDeskLoanAmortizationUtils\.create\(\{\s*sumPosted,\s*\}\)/,
  );
  assert.match(app, /PropertyDeskScheduleUtils\.create\(/);
  assert.match(app, /PropertyDeskDepositLedgerUtils\.create\(/);
  assert.match(app, /window\.PropertyDeskPostedLedgerUtils/);
  assert.match(
    app,
    /PropertyDeskAccountDetailContentWorkflow\.create\(\{[\s\S]*?amortizationSchedule/,
  );
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create/);
  assert.match(app, /PropertyDeskAccountDetailActionWorkflow\.create/);
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskWorkspaceAccountFinancialContext\.create\(/);
  assert.match(app, /summarizeAccount,\s*\} = financialContext;/);
  assert.doesNotMatch(app, /PropertyDeskOverviewWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskPropertyPortfolioWorkflow\.create\(/);
  assert.match(app, /attachPropertyGridEvents,\s*attachPropertyActionEvents,/);
  assert.doesNotMatch(app, /PropertyDeskPropertyScreenWorkflow\.create\(/);
  assert.match(app, /attachPropertyHolderEvents/);
  assert.match(app, /attachPropertyDetailEvents/);
  assert.match(app, /attachPropertyQuickActionEvents/);
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /attachPropertyViewEvents/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:PropertyQuickNote|PropertyManagement)\.create/,
  );
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(app, /window\.PropertyDeskAccountMaintenance\.create\(/);
  assert.match(
    app,
    /window\.PropertyDeskAccountDetailContentWorkflow\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow\.create/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create/);
  assert.match(app, /PropertyDeskTransactionViews\.create/);
});

test("property workspace composes screens and shares detail actions", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "property-workspace-workflow.js"),
    "utf8",
  );
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const worker = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  const creationOrder = [
    "PropertyDeskPropertyScreenWorkflow.create(",
    "PropertyDeskOverviewWorkflow.create(",
    "PropertyDeskPropertyPortfolioWorkflow.create(",
  ].map((marker) => workflow.indexOf(marker));

  assert.ok(creationOrder.every((position) => position >= 0));
  assert.ok(creationOrder[0] < creationOrder[1]);
  assert.ok(creationOrder[1] < creationOrder[2]);
  assert.match(
    workflow,
    /openPropertyDetails: propertyDetails\.openPropertyDetails/,
  );
  for (const script of [
    "features/property-detail-content-workflow.js",
    "features/property-detail-management-workflow.js",
    "features/property-screen-workflow.js",
    "features/property-workspace-workflow.js",
    "features/overview-property-summary-model.js",
    "features/overview-model.js",
    "features/overview-view.js",
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
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.ok(
    html.indexOf("features/property-workspace-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.match(worker, /\.\/features\/property-workspace-workflow\.js/);
  assert.ok(
    app.indexOf("PropertyDeskAccountDetailContentWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyWorkspaceWorkflow.create("),
  );
});

test("app wires reminder preview and activity independently from workspace settings", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /WorkspaceReminderWorkflow\.create\([\s\S]*?amountDueSince,[\s\S]*?unpaidDueAccrualStart,[\s\S]*?openModal: modal\.openModal,/,
  );
  assert.match(app, /PropertyDeskWorkspaceReminderWorkflow\.create\(/);
  assert.match(app, /previewReminderEmail,/);
  assert.match(app, /memberRepository: repositories\.workspaceMembers/);
});

test("app root composes shared state and workspace services directly", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskWorkspaceRuntime\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:BackendClient|AppState|WorkspaceData|WorkspaceRefresh)\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskAppServices/);
  assert.match(app, /PropertyDeskWorkspaceAccountFinancialContext\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskAccountFinancialSummary\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerContext\.create\(/);
  assert.match(app, /PropertyDeskDepositContext\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.match(app, /PropertyDeskAccountDetailContentWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
