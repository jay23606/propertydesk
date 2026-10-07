const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("record entry workflow composes forms and exposes their actions and binders", () => {
  const passed = {};
  const calls = [];
  const propertyReset = () => calls.push("property reset");
  const editAccount = () => calls.push("edit account");
  const openPayment = () => calls.push("payment");
  const openPropertyPayment = () => calls.push("property payment");
  const openExpense = () => calls.push("expense");
  const updatePaymentGuidance = () => calls.push("payment guidance");
  const propertyAttach = () => calls.push("property events");
  const accountAttach = (preview) => calls.push(["account events", preview]);
  const ledgerAttach = () => calls.push("ledger events");
  const openAccountForProperty = () => calls.push("open account for property");
  const preview = () => {};
  const context = vm.createContext({
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
            openAccountForProperty,
            editAccount,
            attachEvents: () =>
              accountAttach(dependencies.previewReminderEmail),
          };
        },
      },
      PropertyDeskLedgerEntryForms: {
        create(dependencies) {
          passed.ledger = dependencies;
          return {
            updatePaymentGuidance,
            openPayment,
            openPropertyPayment,
            openExpense,
            attachEvents: ledgerAttach,
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
    previewReminderEmail: preview,
    saveCorrection: () => {},
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
  assert.equal(passed.account.previewReminderEmail, preview);
  for (const [name, expected] of Object.entries({
    resetPropertyForm: propertyReset,
    editAccount,
    openAccountForProperty,
    updatePaymentGuidance,
    openPayment,
    openPropertyPayment,
    openExpense,
  })) {
    assert.equal(workflow[name], expected, name);
  }

  workflow.attachPropertyFormEvents();
  workflow.attachAccountFormEvents();
  workflow.attachLedgerEntryFormEvents();
  assert.deepEqual(calls, [
    "property events",
    ["account events", preview],
    "ledger events",
  ]);
});
