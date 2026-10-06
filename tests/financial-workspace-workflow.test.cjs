const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app root composes entry, transaction, and account workflows directly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflows = [
    "features/entry-workflow.js",
    "features/transaction-workflow.js",
    "features/account-details-workflow.js",
  ];
  const creationOrder = [
    "PropertyDeskEntryWorkflow.create(",
    "PropertyDeskTransactionWorkflow.create(",
    "PropertyDeskAccountDetailsWorkflow.create(",
  ].map((marker) => app.indexOf(marker));

  assert.ok(creationOrder.every((position) => position >= 0));
  assert.ok(creationOrder[0] < creationOrder[1]);
  assert.ok(creationOrder[1] < creationOrder[2]);
  assert.match(
    app,
    /PropertyDeskTransactionWorkflow\.create\(\{[\s\S]*?openPayment,[\s\S]*?openExpense,[\s\S]*?updatePaymentGuidance,/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailsWorkflow\.create\(\{[\s\S]*?editAccount,[\s\S]*?openPayment,[\s\S]*?amortizationSchedule,/,
  );
  assert.match(app, /attachEvents: attachEntryEvents/);
  assert.match(app, /attachEvents: attachTransactionEvents/);
  assert.match(app, /attachEvents: attachAccountDetailsEvents/);

  for (const script of workflows) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    const workerPath = script.replaceAll("/", "\\/");
    assert.match(worker, new RegExp(`'\\./${workerPath}'`));
  }
  assert.doesNotMatch(app, /PropertyDeskFinancialWorkspaceWorkflow/);
  assert.doesNotMatch(html, /financial-workspace-workflow\.js/);
  assert.doesNotMatch(worker, /financial-workspace-workflow\.js/);
});
