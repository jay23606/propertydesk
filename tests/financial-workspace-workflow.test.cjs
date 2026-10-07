const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app root wires account, deposit, and transaction actions directly", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const requiredModules = [
    "features/transaction-views.js",
    "features/account-close-maintenance.js",
    "features/account-close-entry.js",
    "features/account-detail-events.js",
    "features/deposit-maintenance.js",
    "features/deposit-adjustment-entry.js",
    "features/deposit-detail-events.js",
    "features/transaction-maintenance.js",
    "features/transaction-void-entry.js",
    "features/transaction-correction-form.js",
    "features/transaction-view-events.js",
    "features/account-history-model.js",
    "features/account-history-view.js",
    "features/account-detail-content-workflow.js",
    "features/deposit-context.js",
  ];
  const creationOrder = [
    "PropertyDeskDepositContext.create(",
    "PropertyDeskTransactionCorrections.create(",
    "PropertyDeskRecordEntryWorkflow.create(",
    "PropertyDeskTransactionViews.create(",
    "PropertyDeskCreateActions.create(",
    "PropertyDeskTransactionMaintenance.create(",
    "PropertyDeskTransactionVoidEntry.create(",
    "PropertyDeskTransactionCorrectionForm.create(",
    "PropertyDeskTransactionViewEvents.create(",
    "PropertyDeskDepositDetails.create(",
    "PropertyDeskAccountDetailContentWorkflow.create(",
    "PropertyDeskDepositMaintenance.create(",
    "PropertyDeskDepositAdjustmentEntry.create(",
    "PropertyDeskDepositDetailEvents.create(",
    "PropertyDeskAccountCloseMaintenance.create(",
    "PropertyDeskAccountCloseEntry.create(",
    "PropertyDeskAccountDetailEvents.create(",
  ].map((marker) => app.indexOf(marker));

  assert.ok(creationOrder.every((position) => position >= 0));
  assert.deepEqual(
    creationOrder,
    [...creationOrder].sort((left, right) => left - right),
  );
  assert.match(
    app,
    /PropertyDeskTransactionCorrectionForm\.create\(\{[\s\S]*?openPayment,[\s\S]*?openExpense,[\s\S]*?updatePaymentGuidance,[\s\S]*?EventClass: Event,[\s\S]*?OptionClass: Option,/,
  );
  assert.match(
    app,
    /PropertyDeskDepositDetailEvents\.create\(\{[\s\S]*?depositSectionHTML,[\s\S]*?recordDepositAdjustment,/,
  );
  assert.match(
    app,
    /closeAccountDetails: \(\) => closeModal\(\$\("detail-modal"\)\)/,
  );
  assert.match(
    app,
    /PropertyDeskAccountDetailEvents\.create\(\{[\s\S]*?editAccount,[\s\S]*?openPayment,[\s\S]*?closeAccount,/,
  );
  assert.match(
    app,
    /eventBinders:[\s\S]*?attachTransactionViewEvents,\s*attachTransactionActionEvents,\s*attachAccountDetailActionEvents,\s*attachDepositEvents,/,
  );
  assert.doesNotMatch(
    app,
    /PropertyDesk(?:TransactionMaintenance|DepositMaintenance|AccountDetailActions)Workflow\.create/,
  );

  for (const script of requiredModules) {
    assert.ok(
      html.indexOf(script) >= 0 &&
        html.indexOf(script) < html.indexOf("app.js"),
      `${script} loads before app.js`,
    );
    assert.ok(worker.includes(`'./${script}'`), `${script} is precached`);
  }
  for (const retiredWorkflow of [
    "features/transaction-maintenance-workflow.js",
    "features/deposit-maintenance-workflow.js",
    "features/account-detail-actions-workflow.js",
  ]) {
    assert.equal(fs.existsSync(path.join(root, retiredWorkflow)), false);
    assert.equal(html.includes(retiredWorkflow), false);
    assert.equal(worker.includes(retiredWorkflow), false);
  }
});
