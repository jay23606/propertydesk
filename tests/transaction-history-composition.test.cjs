const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("app composes transaction history separately from maintenance actions", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  const transactionWorkflow = fs.readFileSync(
    path.join(root, "features", "transaction-records-workflow.js"),
    "utf8",
  );
  assert.match(
    transactionWorkflow,
    /PropertyDeskLedgerEntryForms\.create\([\s\S]*?saveCorrection: transactionMaintenance\.saveCorrection/,
  );
  assert.match(
    transactionWorkflow,
    /PropertyDeskTransactionViews\.create\(\{[\s\S]*?sumOperatingExpenses,/,
  );
  assert.match(
    transactionWorkflow,
    /createTransactionActionHandlers\([\s\S]*?openPayment: ledgerEntryForms\.openPayment/,
  );
  assert.doesNotMatch(app, /PropertyDeskTransactionScreenWorkflow/);
  assert.doesNotMatch(html, /transaction-screen-workflow/);
  assert.doesNotMatch(worker, /transaction-screen-workflow/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
});
