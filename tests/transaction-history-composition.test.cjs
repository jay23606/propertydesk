const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("transaction maintenance stays separate from ledger history composition", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const maintenance = fs.readFileSync(
    path.join(root, "features", "transaction-maintenance-workflow.js"),
    "utf8",
  );
  const ledger = fs.readFileSync(
    path.join(root, "features", "ledger-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(
    app,
    /PropertyDeskLedgerWorkflow\.create\(\{\s*maintenance: transactionMaintenance,/,
  );
  assert.ok(
    app.indexOf("PropertyDeskTransactionMaintenanceWorkflow.create(") <
      app.indexOf("PropertyDeskLedgerWorkflow.create("),
  );
  assert.match(
    maintenance,
    /createTransactionActionHandlers\([\s\S]*?maintenanceEventsWorkflow\.create\(/,
  );
  assert.match(ledger, /workflows\.entryForms\.create\(/);
  assert.match(ledger, /workflows\.views\.create\(/);
  assert.match(
    ledger,
    /createTransactionActionHandlers\([\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
  assert.doesNotMatch(
    ledger,
    /window\.PropertyDesk(?:TransactionMaintenanceWorkflow|LedgerEntryForms|TransactionViews)\.create/,
  );
  assert.match(html, /features\/ledger-workflow\.js/);
  assert.match(worker, /'\.\/features\/ledger-workflow\.js'/);
  assert.doesNotMatch(
    html,
    /transaction-workspace-workflow|transaction-records-workflow/,
  );
  assert.doesNotMatch(
    worker,
    /transaction-workspace-workflow|transaction-records-workflow/,
  );
  assert.doesNotMatch(app, /PropertyDeskTransactionWorkspaceWorkflow/);
});
