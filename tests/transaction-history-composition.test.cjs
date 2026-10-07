const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("transaction screen workflow composes history views with maintenance actions", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(root, "features", "transaction-screen-workflow.js"),
    "utf8",
  );
  const workspaceWorkflow = fs.readFileSync(
    path.join(root, "features", "transaction-workspace-workflow.js"),
    "utf8",
  );
  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.match(workflow, /PropertyDeskTransactionViews\.create\(/);
  assert.match(
    workflow,
    /transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(
    workflow,
    /attachTransactionFilterEvents: views\.attachTransactionFilterEvents/,
  );
  assert.match(
    workflow,
    /const \{ attachTransactionActionEvents \} =\s+transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(workspaceWorkflow, /TransactionMaintenanceWorkflow\.create\(/);
  assert.ok(
    html.indexOf("features/transaction-screen-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(
    html.indexOf("features/transaction-workspace-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(worker.includes("'./features/transaction-screen-workflow.js'"));
  assert.ok(worker.includes("'./features/transaction-workspace-workflow.js'"));
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(app, /transactionMaintenance\.createActionHandlers\(/);
});
