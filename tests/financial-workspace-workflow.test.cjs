const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app root composes financial screens and maintenance boundaries directly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const workflows = [
    "features/transaction-views.js",
    "features/transaction-maintenance-workflow.js",
    "features/deposit-maintenance-workflow.js",
    "features/account-close-maintenance.js",
    "features/account-detail-actions-workflow.js",
    "features/account-history-details.js",
    "features/account-detail-content-workflow.js",
  ];
  const creationOrder = [
    "PropertyDeskLedgerWorkflow.create(",
    "PropertyDeskCreateActions.create(",
    "PropertyDeskTransactionViews.create(",
    "PropertyDeskTransactionMaintenanceWorkflow.create(",
    "PropertyDeskDepositDetails.create(",
    "PropertyDeskDepositMaintenanceWorkflow.create(",
    "PropertyDeskAccountDetailActionsWorkflow.create(",
    "PropertyDeskAccountHistoryDetails.create(",
    "PropertyDeskAccountDetailContentWorkflow.create(",
  ].map((marker) => app.indexOf(marker));

  assert.ok(creationOrder.every((position) => position >= 0));
  assert.deepEqual(
    creationOrder,
    [...creationOrder].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskTransactionMaintenanceWorkflow\.create\(\{\s*\$,\s*state,[\s\S]*?openPayment,[\s\S]*?openExpense,[\s\S]*?updatePaymentGuidance,/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailActionsWorkflow\.create\(\{[\s\S]*?editAccount,[\s\S]*?openPayment,/,
  );
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachTransactionViewEvents,\s*attachTransactionActionEvents,\s*attachAccountDetailActionEvents,\s*attachDepositEvents,/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailContentWorkflow\.create\(\{[\s\S]*?amortizationSchedule,[\s\S]*?depositSectionHTML,[\s\S]*?renderAccountHistory,/,
  );
  assert.match(
    app,
    /attachCreateActionEvents,\s*attachPropertyFormEvents,\s*attachAccountFormEvents,\s*attachLedgerEntryFormEvents,/,
  );
  assert.doesNotMatch(app, /function attachTransactionEvents\(/);
  assert.doesNotMatch(app, /function attachAccountDetailsEvents\(/);

  for (const script of workflows) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    const workerPath = script.replaceAll("/", "\\/");
    assert.match(worker, new RegExp(`'\\./${workerPath}'`));
  }
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:Transaction|AccountDetails)Workflow\.create\(/,
  );
  assert.doesNotMatch(
    html,
    /features\/(?:transaction|account-details)-workflow\.js/,
  );
  assert.doesNotMatch(
    worker,
    /features\/(?:transaction|account-details)-workflow\.js/,
  );
  assert.doesNotMatch(app, /PropertyDeskFinancialWorkspaceWorkflow/);
  assert.doesNotMatch(html, /financial-workspace-workflow\.js/);
  assert.doesNotMatch(worker, /financial-workspace-workflow\.js/);
  assert.doesNotMatch(html, /features\/entry-workflow\.js/);
  assert.doesNotMatch(worker, /features\/entry-workflow\.js/);
});
