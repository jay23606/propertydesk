const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("app composes transaction history separately from maintenance actions", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(
    app,
    /transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(
    app,
    /const \{ renderPayments, attachTransactionFilterEvents \} = transactionViews;/,
  );
  assert.match(
    app,
    /const \{ attachTransactionActionEvents \} =\s+transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(
    app,
    /saveCorrection: transactionMaintenance\.saveCorrection,[\s\S]*?PropertyDeskTransactionViews\.create\([\s\S]*?transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskTransactionScreenWorkflow/);
  assert.doesNotMatch(html, /transaction-screen-workflow/);
  assert.doesNotMatch(worker, /transaction-screen-workflow/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
});
