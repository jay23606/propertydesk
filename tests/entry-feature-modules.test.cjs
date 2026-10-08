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
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskAccountDetailContentWorkflow\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountDetailActionWorkflow\.create\(/);
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
    /attachAccountDetailActionEvents,\s*attachDepositAdjustmentEvents,/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskAccountDetailContentWorkflow\.create\(/,
  );
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
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  assert.match(
    app,
    /TransactionRecordsWorkflow\.create\(\{[\s\S]*?transactionRepository: repositories\.transactions,[\s\S]*?transactionPayloads: window\.PropertyDeskTransactionPayloads/,
  );
  assert.match(
    app,
    /TransactionRecordsWorkflow\.create\(\{[\s\S]*?views: \{[\s\S]*?sumOperatingExpenses,/,
  );
  const transactionRecordsWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionRecordsWorkflow,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(maintenance\)/,
  );
  assert.match(
    transactionRecordsWorkflow,
    /PropertyDeskLedgerEntryForms\.create\([\s\S]*?saveCorrection: transactionMaintenance\.saveCorrection/,
  );
  assert.match(
    transactionRecordsWorkflow,
    /PropertyDeskTransactionViews\.create\(views\)/,
  );
  assert.match(
    transactionRecordsWorkflow,
    /openPayment: ledgerEntryForms\.openPayment/,
  );
  assert.doesNotMatch(app, /PropertyDeskEntryWorkflow/);
});

test("app coordinator passes the amortization helper into account details", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskWorkspaceFinancialContext\.create\(/);
  assert.match(app, /window\.PropertyDeskPostedLedgerUtils/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:ScheduleUtils|LoanAmortizationUtils|DepositLedgerUtils)\.create\(/,
  );
  const financialWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "workspace-financial-context.js"),
    "utf8",
  );
  assert.match(
    financialWorkflow,
    /PropertyDeskLoanAmortizationUtils\.create\(/,
  );
  assert.match(financialWorkflow, /PropertyDeskScheduleUtils\.create\(/);
  assert.match(financialWorkflow, /PropertyDeskDepositLedgerUtils\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create/);
  const accountDepositWorkflow = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "account-deposit-workspace-workflow.js",
    ),
    "utf8",
  );
  assert.match(
    accountDepositWorkflow,
    /PropertyDeskAccountDetailContentWorkflow\.create\([\s\S]*?depositSectionHTML: depositWorkspace\.depositSectionHTML/,
  );
  assert.match(
    accountDepositWorkflow,
    /PropertyDeskAccountDetailActionWorkflow\.create\(accountActions\)/,
  );
  assert.match(app, /amortizationSchedule,/);
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.match(
    financialWorkflow,
    /PropertyDeskWorkspaceAccountFinancialContext\.create\(/,
  );
  assert.match(financialWorkflow, /PropertyDeskDepositContext\.create\(/);
  assert.match(
    app,
    /summarizeAccount,\s*depositLedger,\s*\} = financialContext;/,
  );
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
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  const transactionRecordsWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionRecordsWorkflow,
    /PropertyDeskTransactionViews\.create\(views\)/,
  );
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.doesNotMatch(
    app,
    /window\.PropertyDeskAccountFormMaintenance\.create\(/,
  );
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskRecordMaintenance/);
  for (const filename of ["payment-entry-form.js", "expense-entry-form.js"]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /pd_correct_transaction/);
  }
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow\.create/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create/);
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create/);
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
    app.indexOf("PropertyDeskAccountDepositWorkspaceWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyWorkspaceWorkflow.create("),
  );
});

test("app passes reminder services into the workspace coordinator", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /PropertyDeskWorkspace\.create\(\{[\s\S]*?reminder: \{[\s\S]*?amountDueSince,[\s\S]*?unpaidDueAccrualStart,[\s\S]*?openModal: modal\.openModal,/,
  );
  assert.doesNotMatch(app, /PropertyDeskWorkspaceReminderWorkflow\.create\(/);
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
  assert.match(app, /PropertyDeskWorkspaceFinancialContext\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskAccountFinancialSummary\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerContext\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskDepositContext\.create\(/);
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
