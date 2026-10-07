const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("record entry forms and global create actions use separate workflows", () => {
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
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionMaintenance|RecordEntry|TransactionScreen)Workflow\.create\(/,
  );
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.match(app, /accountHistoryRepository: repositories\.accountHistory/);
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
  const propertyAccountEntry = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "property-account-entry-workflow.js",
    ),
    "utf8",
  );
  const ledgerEntryWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "ledger-entry-workflow.js"),
    "utf8",
  );
  assert.match(propertyAccountEntry, /PropertyDeskPropertyForm\.create\(/);
  assert.match(propertyAccountEntry, /PropertyDeskAccountForm\.create\(/);
  assert.match(ledgerEntryWorkflow, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.match(
    workflow,
    /PropertyDeskPropertyAccountEntryWorkflow\.create\([\s\S]*?PropertyDeskLedgerEntryWorkflow\.create\(/,
  );
  assert.doesNotMatch(workflow, /PropertyDeskCreateActions\.create\(/);
  assert.match(propertyAccountEntry, /repository: context\.accountRepository/);
  assert.match(propertyAccountEntry, /repository: context\.propertyRepository/);
  assert.match(
    propertyAccountEntry,
    /buildAccountPayload: context\.accountPayload/,
  );
  assert.match(propertyAccountEntry, /formModel: context\.accountFormModel/);
  assert.match(workflow, /transactionRepository,/);
  assert.match(workflow, /transactionPayloads,/);
  assert.match(
    app,
    /propertyRepository: repositories\.properties,[\s\S]*?accountRepository: repositories\.accounts,/,
  );
  assert.match(
    app,
    /accountRepository: repositories\.accounts,[\s\S]*?transactionRepository: repositories\.transactions,[\s\S]*?transactionPayloads: window\.PropertyDeskTransactionPayloads,/,
  );
  assert.match(
    app,
    /accountPayload: window\.PropertyDeskAccountPayload\.build,[\s\S]*?accountFormModel: window\.PropertyDeskAccountFormModel,/,
  );
  assert.doesNotMatch(app, /PropertyDeskCreateActions\.create\(/);
  assert.match(app, /attachCreateActionEvents/);
  const createActionWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "create-actions-workflow.js"),
    "utf8",
  );
  assert.match(
    createActionWorkflow,
    /PropertyDeskCreateActions\.create\(context\)/,
  );
  const transactionWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionWorkflow,
    /TransactionMaintenanceWorkflow\.create\([\s\S]*?RecordEntryWorkflow\.create\(\{[\s\S]*?accountRepository: entryContext\.accountRepository,[\s\S]*?transactionRepository: entryContext\.transactionRepository,[\s\S]*?transactionPayloads: entryContext\.transactionPayloads,[\s\S]*?saveCorrection: maintenance\.saveCorrection/,
  );
  assert.match(
    transactionWorkflow,
    /TransactionScreenWorkflow\.create\([\s\S]*?transactionMaintenance: maintenance,[\s\S]*?openPayment: entry\.openPayment/,
  );
  assert.match(
    transactionWorkflow,
    /PropertyDeskCreateActionsWorkflow\.create\([\s\S]*?resetPropertyForm: entry\.resetPropertyForm/,
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
  assert.match(app, /PropertyDeskPropertyWorkspaceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskWorkspaceFinancialContext\.create\(/);
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
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionMaintenance|RecordEntry|TransactionScreen)Workflow\.create\(/,
  );
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
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow\.create/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create/);
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create/);
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
    "features/property-holder-workflow.js",
    "features/property-document-management-workflow.js",
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
    app.indexOf("PropertyDeskAccountScreenWorkflow.create(") <
      app.indexOf("PropertyDeskPropertyWorkspaceWorkflow.create("),
  );
});

test("app wires reminder activity and preview through the workspace workflow", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(
    app,
    /WorkspaceShellWorkflow\.create\(\{[\s\S]*?reminder: \{[\s\S]*?amountDueSince,[\s\S]*?unpaidDueAccrualStart,[\s\S]*?openModal: modal\.openModal,/,
  );
  assert.match(app, /PropertyDeskWorkspaceShellWorkflow\.create\(/);
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
  assert.doesNotMatch(app, /PropertyDesk(?:Ledger|Deposit)Context\.create\(/);
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
});
