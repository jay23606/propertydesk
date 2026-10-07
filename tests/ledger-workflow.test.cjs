const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("ledger workflow injects audited corrections into entry forms", () => {
  const calls = [];
  const passed = {};
  const saveCorrection = () => "saved correction";
  const entries = {
    openPayment: () => "payment form",
    openExpense: () => "expense form",
    updatePaymentGuidance: () => "preview updated",
    resetPropertyForm() {},
    resetAccountForm() {},
    editAccount() {},
    openPropertyPayment() {},
    attachPropertyFormEvents() {},
    attachAccountFormEvents() {},
    attachLedgerEntryFormEvents() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionCorrections: {
        create: (options) => {
          calls.push("corrections");
          passed.corrections = options;
          return { saveCorrection };
        },
      },
      PropertyDeskRecordEntryWorkflow: {
        create: (options) => {
          calls.push("entries");
          passed.entries = options;
          return entries;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "ledger-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    previewReminderEmail() {},
    moneyInput() {},
  };
  const workflow =
    context.window.PropertyDeskLedgerWorkflow.create(dependencies);

  assert.deepEqual(calls, ["corrections", "entries"]);
  assert.equal(passed.corrections.state, dependencies.state);
  assert.equal(passed.corrections.closeModal, dependencies.closeModal);
  assert.equal(passed.entries.state, dependencies.state);
  assert.equal(passed.entries.saveCorrection, saveCorrection);
  assert.equal(
    passed.entries.previewReminderEmail,
    dependencies.previewReminderEmail,
  );
  assert.deepEqual(
    Object.keys(workflow).sort(),
    [
      "resetPropertyForm",
      "resetAccountForm",
      "editAccount",
      "updatePaymentGuidance",
      "openPayment",
      "openPropertyPayment",
      "openExpense",
      "attachPropertyFormEvents",
      "attachAccountFormEvents",
      "attachLedgerEntryFormEvents",
    ].sort(),
  );
});
