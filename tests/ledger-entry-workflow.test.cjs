const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("ledger entry workflow exposes payment and expense form operations", () => {
  const dependencies = { transactionRepository: { insertPayment() {} } };
  const entry = {
    updatePaymentGuidance() {},
    openPayment() {},
    openPropertyPayment() {},
    openExpense() {},
    attachEvents() {},
  };
  let passed;
  const context = vm.createContext({
    window: {
      PropertyDeskLedgerEntryForms: {
        create(options) {
          passed = options;
          return entry;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-entry-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskLedgerEntryWorkflow.create(dependencies);

  assert.equal(passed, dependencies);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachLedgerEntryFormEvents",
    "openExpense",
    "openPayment",
    "openPropertyPayment",
    "updatePaymentGuidance",
  ]);
  assert.equal(workflow.openPayment, entry.openPayment);
  assert.equal(workflow.openExpense, entry.openExpense);
  assert.equal(workflow.attachLedgerEntryFormEvents, entry.attachEvents);
});
