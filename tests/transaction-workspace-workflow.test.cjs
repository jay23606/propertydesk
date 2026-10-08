const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction workspace owns only ledger entry and transaction workflows", () => {
  const calls = [];
  const saveCorrection = () => "corrected";
  const openPayment = () => "payment";
  const openExpense = () => "expense";
  const updatePaymentGuidance = () => "guidance";
  const maintenance = {
    saveCorrection,
    createTransactionActionHandlers(options) {
      calls.push(["maintenanceActions", options]);
      return { attachTransactionActionEvents() {} };
    },
  };
  const entry = {
    $() {},
    state: {},
    moneyInput() {},
    todayIso() {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    fillSelect() {},
    populateFormOptions() {},
    prettyType() {},
    openModal() {},
    transactionRepository: {},
    transactionPayloads: {},
  };
  const screen = { state: {} };
  const context = vm.createContext({
    window: {
      PropertyDeskLedgerEntryForms: {
        create(options) {
          calls.push(["entry", options]);
          return {
            openPayment,
            openPropertyPayment() {},
            openExpense,
            updatePaymentGuidance,
            attachLedgerEntryFormEvents() {},
          };
        },
      },
      PropertyDeskTransactionScreenWorkflow: {
        create(options) {
          calls.push(["screen", options]);
          return {
            renderPayments() {},
            attachTransactionFilterEvents() {},
            attachTransactionActionEvents() {},
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskTransactionWorkspaceWorkflow.create({
      maintenance,
      entry,
      screen,
    });

  assert.equal(calls[0][0], "entry");
  assert.equal(calls[0][1].transactionRepository, entry.transactionRepository);
  assert.equal(calls[0][1].transactionPayloads, entry.transactionPayloads);
  assert.equal(calls[0][1].saveCorrection, saveCorrection);
  assert.equal("propertyRepository" in calls[0][1], false);
  assert.equal("accountRepository" in calls[0][1], false);
  assert.equal("accountPayload" in calls[0][1], false);
  assert.equal("accountFormModel" in calls[0][1], false);
  assert.equal("previewReminderEmail" in calls[0][1], false);
  assert.equal(calls[1][0], "screen");
  assert.equal(calls[1][1].state, screen.state);
  assert.equal(calls[1][1].transactionMaintenance, maintenance);
  assert.equal(
    calls[1][1].transactionMaintenance.saveCorrection,
    saveCorrection,
  );
  assert.equal(calls[1][1].openPayment, openPayment);
  assert.equal(calls[1][1].openExpense, openExpense);
  assert.equal(calls[1][1].updatePaymentGuidance, updatePaymentGuidance);
  assert.equal(workflow.openPayment, openPayment);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachLedgerEntryFormEvents",
    "attachTransactionActionEvents",
    "attachTransactionFilterEvents",
    "openExpense",
    "openPayment",
    "openPropertyPayment",
    "renderPayments",
  ]);
});
