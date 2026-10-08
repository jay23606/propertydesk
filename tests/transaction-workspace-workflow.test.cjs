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
  const maintenance = { correction: {}, voiding: {}, events: {} };
  const entries = { transactionRepository: {} };
  const views = { money() {} };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionMaintenanceWorkflow: {
        create(options) {
          passed.maintenance = options;
          return maintenanceApi;
        },
      },
      PropertyDeskTransactionRecordsWorkflow: {
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
    });

  assert.equal(passed.maintenance, maintenance);
  assert.equal(passed.records.maintenance, maintenanceApi);
  assert.equal(passed.records.entries, entries);
  assert.equal(passed.records.views, views);
  assert.equal(workflow, recordsApi);
});

test("transaction workspace connects maintenance and records at the app root", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
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
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(maintenance\)/,
  );
  const transactionWorkflow = fs.readFileSync(
    path.join(__dirname, "..", "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionWorkflow,
    /PropertyDeskTransactionViews\.create\(\{[\s\S]*?sumOperatingExpenses,/,
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
