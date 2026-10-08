const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction workspace connects maintenance to the records workflow", () => {
  const passed = {};
  const maintenanceApi = {
    saveCorrection() {},
    createTransactionActionHandlers() {},
  };
  const recordsApi = { openPayment() {}, renderPayments() {} };
  const maintenance = {
    correction: {},
    voiding: {},
    events: {},
    unusedContext: true,
  };
  const entries = { transactionRepository: {} };
  const views = { money() {} };
  const maintenanceWorkflows = {
    correction: { create() {} },
    voidMaintenance: { create() {} },
    voidEntry: { create() {} },
    events: { create() {} },
  };
  const recordWorkflows = { entryForms: {}, views: {} };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionCorrectionWorkflow: { create() {} },
      PropertyDeskTransactionVoidMaintenance: { create() {} },
      PropertyDeskTransactionVoidEntry: { create() {} },
      PropertyDeskTransactionMaintenanceEvents: { create() {} },
    },
    workflows: {
      maintenance: {
        create(options) {
          passed.maintenance = options;
          return maintenanceApi;
        },
      },
      records: {
        create(options) {
          passed.records = options;
          return recordsApi;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskTransactionWorkspaceWorkflow.create({
      maintenance,
      entries,
      views,
      maintenanceWorkflows,
      recordWorkflows,
      workflows: context.workflows,
    });

  assert.deepEqual(Object.keys(passed.maintenance).sort(), [
    "correction",
    "events",
    "voiding",
    "workflows",
  ]);
  assert.equal(passed.maintenance.correction, maintenance.correction);
  assert.equal(passed.maintenance.voiding, maintenance.voiding);
  assert.equal(passed.maintenance.events, maintenance.events);
  assert.equal(
    passed.maintenance.workflows.correction,
    maintenanceWorkflows.correction,
  );
  assert.equal(
    passed.maintenance.workflows.voidMaintenance,
    maintenanceWorkflows.voidMaintenance,
  );
  assert.equal(
    passed.maintenance.workflows.voidEntry,
    maintenanceWorkflows.voidEntry,
  );
  assert.equal(
    passed.maintenance.workflows.events,
    maintenanceWorkflows.events,
  );
  assert.equal(passed.records.maintenance, maintenanceApi);
  assert.equal(passed.records.entries, entries);
  assert.equal(passed.records.views, views);
  assert.equal(passed.records.workflows, recordWorkflows);
  assert.equal(workflow, recordsApi);
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-workspace-workflow.js",
      ),
      "utf8",
    ),
    /window\.PropertyDeskTransaction(?:Maintenance|Records)Workflow\.create/,
  );
});

test("transaction workspace connects maintenance and records at the app root", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.match(
    app,
    /correction: \{[\s\S]*?writeFeedback: window\.PropertyDeskRepositoryWriteFeedback,/,
  );
  assert.match(
    app,
    /voiding: \{[\s\S]*?writeFeedback: window\.PropertyDeskRepositoryWriteFeedback,/,
  );
  assert.match(
    app,
    /workflows: \{\s*maintenance: window\.PropertyDeskTransactionMaintenanceWorkflow,\s*records: window\.PropertyDeskTransactionRecordsWorkflow,/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(/,
  );
  const transactionWorkspace = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionWorkspace,
    /workflows\.maintenance\.create\(\{\s*correction: maintenance\.correction,\s*voiding: maintenance\.voiding,\s*events: maintenance\.events,\s*workflows: maintenanceWorkflows,/,
  );
  assert.match(
    transactionWorkspace,
    /workflows\.records\.create\(\{\s*maintenance: transactionMaintenance,/,
  );
  assert.match(transactionWorkspace, /workflows: recordWorkflows/);
  assert.match(
    app,
    /maintenanceWorkflows: \{[\s\S]*?PropertyDeskTransactionMaintenanceEvents/,
  );
  assert.match(
    app,
    /recordWorkflows: \{\s*entryForms: window\.PropertyDeskLedgerEntryForms,\s*views: window\.PropertyDeskTransactionViews,/,
  );
  const transactionRecords = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(transactionRecords, /workflows\.entryForms\.create\(/);
  assert.match(transactionRecords, /workflows\.views\.create\(/);
  assert.doesNotMatch(
    transactionRecords,
    /window\.PropertyDesk(?:LedgerEntryForms|TransactionViews)\.create/,
  );
  assert.doesNotMatch(
    transactionWorkspace,
    /window\.PropertyDeskTransaction(?:Correction|Void|MaintenanceEvents)/,
  );
  const transactionWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionWorkflow,
    /workflows\.views\.create\(\{[\s\S]*?sumOperatingExpenses,/,
  );
  assert.match(transactionWorkflow, /createTransactionActionHandlers\(/);
  assert.match(
    transactionWorkflow,
    /const \{ saveCorrection, createTransactionActionHandlers \} = maintenance;/,
  );
  assert.doesNotMatch(app, /PropertyDeskRecordEntryWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(app, /PropertyDeskTransactionScreenWorkflow\.create\(/);
  assert.match(app, /renderPayments,/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachTransactionFilterEvents,\s*attachTransactionActionEvents,/,
  );
  assert.doesNotMatch(app, /function attachTransactionEvents\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionWorkflow\.create\(/);
});
