const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

test("transaction workspace injects audited correction persistence into record entry", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflow = fs.readFileSync(
    path.join(root, "features", "transaction-workspace-workflow.js"),
    "utf8",
  );

  assert.match(app, /PropertyDeskTransactionWorkspaceWorkflow\.create\(/);
  assert.match(
    workflow,
    /TransactionMaintenanceWorkflow\.create\([\s\S]*?maintenanceContext/,
  );
  assert.match(
    workflow,
    /RecordEntryWorkflow\.create\(\{[\s\S]*?saveCorrection: maintenance\.saveCorrection/,
  );
  assert.match(workflow, /TransactionScreenWorkflow\.create\(/);
  assert.ok(
    html.indexOf("features/transaction-workspace-workflow.js") <
      html.indexOf("app.js"),
  );
  assert.ok(worker.includes("'./features/transaction-workspace-workflow.js'"));
  assert.doesNotMatch(app, /PropertyDeskLedgerWorkflow/);
  assert.doesNotMatch(html, /features\/ledger-workflow\.js/);
  assert.doesNotMatch(worker, /features\/ledger-workflow\.js/);
  assert.equal(
    fs.existsSync(path.join(root, "features", "ledger-workflow.js")),
    false,
  );
});
