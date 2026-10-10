const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("transaction maintenance stays separate from ledger history composition", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const composition = fs.readFileSync(
    path.join(root, "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  const maintenance = fs.readFileSync(
    path.join(root, "features", "transaction-maintenance-workflow.js"),
    "utf8",
  );
  const ledger = fs.readFileSync(
    path.join(root, "features", "ledger-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskTransactionWorkspaceSetup\.create\(/);
  assert.match(
    composition,
    /ledgerWorkflows\.workflow\.create\(\{\s*saveCorrection: transactionMaintenance\.saveCorrection,[\s\S]*?createTransactionActionHandlers:\s*transactionMaintenance\.createTransactionActionHandlers,/,
  );
  assert.match(
    fs.readFileSync(
      path.join(root, "features", "transaction-workspace-setup.js"),
      "utf8",
    ),
    /workflows\.maintenanceSetup\.create\(/,
  );
  assert.match(
    fs.readFileSync(
      path.join(root, "features", "transaction-maintenance-setup.js"),
      "utf8",
    ),
    /workflows\.maintenance\.create\(/,
  );
  assert.match(
    maintenance,
    /createTransactionActionHandlers\([\s\S]*?maintenanceEventsWorkflow\.create\(/,
  );
  assert.match(ledger, /workflows\.entryForms\.create\(/);
  assert.match(ledger, /workflows\.views\.create\(/);
  assert.match(
    ledger,
    /function createLedgerWorkflow\(\{\s*saveCorrection,\s*createTransactionActionHandlers,/,
  );
  assert.doesNotMatch(ledger, /\bmaintenance\b/);
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
  assert.match(html, /features\/transaction-workspace-setup\.js/);
  assert.match(worker, /'\.\/features\/transaction-workspace-setup\.js'/);
  assert.doesNotMatch(html, /transaction-records-workflow/);
  assert.doesNotMatch(worker, /transaction-records-workflow/);
});
