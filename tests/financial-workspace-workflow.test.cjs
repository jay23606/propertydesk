const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app delegates account, deposit, and transaction maintenance", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskTransactionRecordsWorkflow\.create\(/);
  assert.match(app, /PropertyDeskAccountDepositWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskTransactionViews\.create\(/);
  assert.doesNotMatch(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskDepositWorkspaceWorkflow\.create\(/);
  assert.doesNotMatch(
    app,
    /PropertyDeskAccountDetailContentWorkflow\.create\(/,
  );
  assert.doesNotMatch(app, /PropertyDeskAccountDetailActionWorkflow\.create\(/);
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachTransactionFilterEvents,\s*attachTransactionActionEvents,\s*attachAccountDetailActionEvents,\s*attachDepositAdjustmentEvents,/,
  );

  for (const feature of [
    "account-detail-action-workflow",
    "deposit-adjustment-workflow",
    "deposit-workspace-workflow",
    "transaction-maintenance-workflow",
    "transaction-records-workflow",
    "account-deposit-workspace-workflow",
  ]) {
    const script = `features/${feature}.js`;
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${script}'`));
  }
});
