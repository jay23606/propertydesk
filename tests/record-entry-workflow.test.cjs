const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("record entry workflow composes forms and exposes their actions and binders", () => {
  const passed = {};
  const calls = [];
  const propertyReset = () => calls.push("property reset");
  const accountReset = () => calls.push("account reset");
  const editAccount = () => calls.push("edit account");
  const openPayment = () => calls.push("payment");
  const openPropertyPayment = () => calls.push("property payment");
  const openExpense = () => calls.push("expense");
  const updateAllocationPreview = () => calls.push("allocation preview");
  const propertyAttach = () => calls.push("property events");
  const accountAttach = (preview) => calls.push(["account events", preview]);
  const ledgerAttach = () => calls.push("ledger events");
  const navigate = () => calls.push("navigate");
  const context = vm.createContext({
    document: {},
    window: {
      PropertyDeskPropertyForm: {
        create(dependencies) {
          passed.property = dependencies;
          return {
            resetPropertyForm: propertyReset,
            attachEvents: propertyAttach,
          };
        },
      },
      PropertyDeskAccountForm: {
        create(dependencies) {
          passed.account = dependencies;
          return {
            resetAccountForm: accountReset,
            editAccount,
            attachEvents: accountAttach,
          };
        },
      },
      PropertyDeskLedgerEntryForms: {
        create(dependencies) {
          passed.ledger = dependencies;
          return {
            updateAllocationPreview,
            openPayment,
            openPropertyPayment,
            openExpense,
            attachEvents: ledgerAttach,
          };
        },
      },
      PropertyDeskCreateActions: {
        create(dependencies) {
          passed.actions = dependencies;
          return {
            attachEvents: (handler) => calls.push(["create events", handler]),
          };
        },
      },
      PropertyDeskAccountPayload: { build: () => "account payload" },
      PropertyDeskAccountFormModel: { validate: () => true },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "record-entry-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $: () => {},
    state: {},
    moneyInput: () => {},
    todayIso: () => "2026-10-01",
    toast: () => {},
    closeModal: () => {},
    fetchAll: async () => {},
    fillSelect: () => {},
    populateFormOptions: () => {},
    prettyType: () => {},
    openModal: () => {},
    saveCorrection: () => {},
    documentRef: { marker: "doc" },
  };
  const workflow =
    context.window.PropertyDeskRecordEntryWorkflow.create(dependencies);

  assert.equal(passed.property.state, dependencies.state);
  assert.equal(
    passed.account.buildAccountPayload,
    context.window.PropertyDeskAccountPayload.build,
  );
  assert.equal(
    passed.account.formModel,
    context.window.PropertyDeskAccountFormModel,
  );
  assert.equal(passed.ledger.saveCorrection, dependencies.saveCorrection);
  assert.equal(passed.actions.resetPropertyForm, propertyReset);
  assert.equal(passed.actions.resetAccountForm, accountReset);
  assert.equal(passed.actions.openPayment, openPayment);
  assert.equal(passed.actions.openExpense, openExpense);
  assert.equal(passed.actions.documentRef, dependencies.documentRef);
  for (const [name, expected] of Object.entries({
    resetPropertyForm: propertyReset,
    resetAccountForm: accountReset,
    editAccount,
    updateAllocationPreview,
    openPayment,
    openPropertyPayment,
    openExpense,
  })) {
    assert.equal(workflow[name], expected, name);
  }

  const preview = () => {};
  workflow.attachPropertyFormEvents();
  workflow.attachAccountFormEvents(preview);
  workflow.attachLedgerEntryFormEvents();
  workflow.attachCreateActions(navigate);
  assert.deepEqual(calls, [
    "property events",
    ["account events", preview],
    "ledger events",
    ["create events", navigate],
  ]);
});
