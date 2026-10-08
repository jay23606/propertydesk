const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app delegates account, deposit, and transaction maintenance", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");

  assert.match(app, /PropertyDeskTransactionViews\.create\(/);
  assert.match(app, /PropertyDeskLedgerEntryForms\.create\(/);
  assert.match(app, /PropertyDeskTransactionMaintenanceWorkflow\.create\(/);
  assert.match(app, /PropertyDeskDepositWorkspaceWorkflow\.create\(/);
  assert.match(
    app,
    /transactionMaintenance\.createTransactionActionHandlers\(/,
  );
  assert.match(app, /PropertyDeskAccountScreenWorkflow\.create\(/);
  assert.match(
    app,
    /AccountScreenWorkflow\.create\(\{[\s\S]*?depositSectionHTML: depositWorkspace\.depositSectionHTML,[\s\S]*?accountActions: \{[\s\S]*?closeModal,[\s\S]*?editAccount,[\s\S]*?openPayment,/,
  );
  assert.match(
    app,
    /eventBindersBeforeAuth:[\s\S]*?attachTransactionFilterEvents,\s*attachTransactionActionEvents,\s*attachAccountDetailActionEvents,\s*depositWorkspace\.attachDepositAdjustmentEvents,/,
  );

  for (const feature of [
    "account-detail-action-workflow",
    "deposit-details-workflow",
    "deposit-adjustment-workflow",
    "deposit-workspace-workflow",
    "account-screen-workflow",
    "transaction-maintenance-workflow",
  ]) {
    const script = `features/${feature}.js`;
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
    );
    assert.ok(worker.includes(`'./${script}'`));
  }
});
