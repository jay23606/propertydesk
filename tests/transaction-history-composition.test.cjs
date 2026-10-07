const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("app composes transaction history views and aliases their event binder", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const source = app.indexOf("PropertyDeskTransactionViews.create(");
  const maintenance = app.indexOf(
    "transactionMaintenance.createActionHandlers(",
  );

  assert.ok(source >= 0);
  assert.ok(maintenance > source);
  assert.match(
    app,
    /attachEvents: attachTransactionViewEvents\s*\}\s*=\s*window\.PropertyDeskTransactionViews\.create\(/,
  );
  assert.match(app, /attachEvents: attachTransactionActionEvents/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionHistoryWorkflow/);
  assert.doesNotMatch(html, /features\/transaction-history-workflow\.js/);
  assert.doesNotMatch(worker, /features\/transaction-history-workflow\.js/);
  assert.equal(
    fs.existsSync(
      path.join(root, "features", "transaction-history-workflow.js"),
    ),
    false,
  );
});
