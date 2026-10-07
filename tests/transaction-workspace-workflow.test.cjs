const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction workspace shares corrections and entry actions across its flows", () => {
  const calls = [];
  const saveCorrection = () => "corrected";
  const openPayment = () => "payment";
  const openExpense = () => "expense";
  const updatePaymentGuidance = () => "guidance";
  const openAccountForProperty = () => "new account";
  const resetPropertyForm = () => {};
  const attachCreateActionEvents = () => {};
  const maintenance = { closeModal() {} };
  const entry = {
    toast() {},
    previewReminderEmail() {},
    propertyRepository: {},
    accountPayload: () => {},
    accountFormModel: {},
    navigate() {},
    documentRef: {},
    unusedDependency: true,
  };
  const screen = { state: {} };
  const context = vm.createContext({
    window: {
      PropertyDeskTransactionMaintenanceWorkflow: {
        create(options) {
          calls.push(["maintenance", options]);
          return { saveCorrection };
        },
      },
      PropertyDeskRecordEntryWorkflow: {
        create(options) {
          calls.push(["entry", options]);
          return {
            openPayment,
            openExpense,
            updatePaymentGuidance,
            openAccountForProperty,
            resetPropertyForm,
          };
        },
      },
      PropertyDeskCreateActionsWorkflow: {
        create(options) {
          calls.push(["create-actions", options]);
          return { attachCreateActionEvents };
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

  assert.equal(calls[0][0], "maintenance");
  assert.equal(calls[0][1], maintenance);
  assert.equal(calls[1][0], "entry");
  assert.equal(calls[1][1].toast, entry.toast);
  assert.equal(calls[1][1].previewReminderEmail, entry.previewReminderEmail);
  assert.equal(calls[1][1].propertyRepository, entry.propertyRepository);
  assert.equal(calls[1][1].accountPayload, entry.accountPayload);
  assert.equal(calls[1][1].accountFormModel, entry.accountFormModel);
  assert.equal("navigate" in calls[1][1], false);
  assert.equal("documentRef" in calls[1][1], false);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[1][1].saveCorrection, saveCorrection);
  assert.equal(calls[2][0], "create-actions");
  assert.equal(calls[2][1].openPayment, openPayment);
  assert.equal(calls[2][1].openExpense, openExpense);
  assert.equal(calls[2][1].openAccountForProperty, openAccountForProperty);
  assert.equal(calls[2][1].resetPropertyForm, resetPropertyForm);
  assert.equal(calls[2][1].navigate, entry.navigate);
  assert.equal(calls[2][1].documentRef, entry.documentRef);
  assert.equal(calls[3][0], "screen");
  assert.equal(calls[3][1].state, screen.state);
  assert.equal(
    calls[3][1].transactionMaintenance.saveCorrection,
    saveCorrection,
  );
  assert.equal(calls[3][1].openPayment, openPayment);
  assert.equal(calls[3][1].openExpense, openExpense);
  assert.equal(calls[3][1].updatePaymentGuidance, updatePaymentGuidance);
  assert.equal(workflow.openPayment, openPayment);
  assert.equal(workflow.renderPayments instanceof Function, true);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachAccountFormEvents",
    "attachCreateActionEvents",
    "attachLedgerEntryFormEvents",
    "attachPropertyFormEvents",
    "attachTransactionActionEvents",
    "attachTransactionFilterEvents",
    "editAccount",
    "openAccountForProperty",
    "openExpense",
    "openPayment",
    "openPropertyPayment",
    "renderPayments",
  ]);
});
