const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("entry workflow joins record forms to their create actions", () => {
  const passed = {};
  const attached = [];
  const methods = {
    attachAccountFormEvents() {
      attached.push("account");
    },
    attachCreateActions() {
      attached.push("create actions");
    },
    attachLedgerEntryFormEvents() {
      attached.push("ledger");
    },
    attachPropertyFormEvents() {
      attached.push("property");
    },
    editAccount() {},
    openAccountForProperty() {},
    openExpense() {},
    openPayment() {},
    openPropertyPayment() {},
    resetAccountForm() {},
    resetPropertyForm() {},
    updatePaymentGuidance() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskLedgerWorkflow: {
        create: (options) => {
          passed.ledger = options;
          return methods;
        },
      },
      PropertyDeskCreateActions: {
        create: (options) => {
          passed.actions = options;
          return {
            attachEvents: methods.attachCreateActions,
            openAccountForProperty: methods.openAccountForProperty,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "entry-workflow.js"),
      "utf8",
    ),
    context,
  );
  const dependencies = {
    $() {},
    state: {},
    moneyInput() {},
    todayIso() {},
    toast() {},
    closeModal() {},
    fetchAll() {},
    populateFormOptions() {},
    fillSelect() {},
    prettyType() {},
    openModal() {},
    previewReminderEmail() {},
    navigate() {},
    documentRef: {},
  };
  const workflow =
    context.window.PropertyDeskEntryWorkflow.create(dependencies);

  assert.equal(passed.ledger.navigate, undefined);
  assert.equal(passed.actions.navigate, dependencies.navigate);
  assert.equal(passed.actions.documentRef, dependencies.documentRef);
  assert.equal(passed.actions.resetPropertyForm, methods.resetPropertyForm);
  assert.equal(passed.actions.openPayment, methods.openPayment);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachEvents",
    "editAccount",
    "openAccountForProperty",
    "openExpense",
    "openPayment",
    "openPropertyPayment",
    "updatePaymentGuidance",
  ]);
  assert.equal(workflow.resetAccountForm, undefined);
  assert.equal(workflow.resetPropertyForm, undefined);
  workflow.attachEvents();
  assert.deepEqual(attached, [
    "create actions",
    "property",
    "account",
    "ledger",
  ]);
  assert.equal(workflow.openAccountForProperty, methods.openAccountForProperty);
  assert.equal(workflow.updatePaymentGuidance, methods.updatePaymentGuidance);
});
