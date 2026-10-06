const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("ledger workflow wires correction writes, entry forms, and transaction actions", () => {
  const calls = [];
  const passed = {};
  const saveCorrection = () => "saved correction";
  const entries = {
    openPayment: () => "payment form",
    openExpense: () => "expense form",
    updateAllocationPreview: () => "preview updated",
  };
  const transactions = {
    renderPayments: () => "ledger rendered",
    attachEvents: () => "ledger events attached",
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
      PropertyDeskTransactionWorkflow: {
        create: (options) => {
          calls.push("transactions");
          passed.transactions = options;
          return transactions;
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
    navigate() {},
    previewReminderEmail() {},
    moneyInput() {},
    dateOnly() {},
    documentRef: {},
  };
  const workflow =
    context.window.PropertyDeskLedgerWorkflow.create(dependencies);

  assert.deepEqual(calls, ["corrections", "entries", "transactions"]);
  assert.equal(passed.corrections.state, dependencies.state);
  assert.equal(passed.corrections.closeModal, dependencies.closeModal);
  assert.equal(passed.entries.state, dependencies.state);
  assert.equal(passed.entries.saveCorrection, saveCorrection);
  assert.equal(passed.entries.navigate, dependencies.navigate);
  assert.equal(
    passed.entries.previewReminderEmail,
    dependencies.previewReminderEmail,
  );
  assert.equal(passed.entries.documentRef, dependencies.documentRef);
  assert.equal(passed.transactions.openPayment, entries.openPayment);
  assert.equal(passed.transactions.openExpense, entries.openExpense);
  assert.equal(
    passed.transactions.updateAllocationPreview,
    entries.updateAllocationPreview,
  );
  assert.equal(passed.transactions.documentRef, dependencies.documentRef);
  assert.equal("moneyInput" in passed.transactions, false);
  assert.deepEqual(Object.keys(workflow).sort(), ["entries", "transactions"]);
  assert.equal(workflow.entries, entries);
  assert.equal(workflow.transactions, transactions);
});
