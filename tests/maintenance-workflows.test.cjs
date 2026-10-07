const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWorkflow(context, filename) {
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
    context,
  );
}

test("transaction maintenance coordinator joins correction and void actions", () => {
  const passed = {};
  const saveCorrection = () => {};
  const saveVoidTransaction = () => {};
  const voidTransaction = () => {};
  const correctTransaction = () => {};
  const attachEvents = () => {};
  const context = vm.createContext({
    Event: class MockEvent {},
    Option: class MockOption {},
    document: {},
    window: {
      PropertyDeskTransactionCorrections: {
        create: (options) => {
          passed.corrections = options;
          return { saveCorrection };
        },
      },
      PropertyDeskTransactionMaintenance: {
        create: (options) => {
          passed.maintenance = options;
          return { saveVoidTransaction };
        },
      },
      PropertyDeskTransactionVoidEntry: {
        create: (options) => {
          passed.voidEntry = options;
          return { voidTransaction };
        },
      },
      PropertyDeskTransactionCorrectionForm: {
        create: (options) => {
          passed.correctionForm = options;
          return { correctTransaction };
        },
      },
      PropertyDeskTransactionViewEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents };
        },
      },
    },
  });
  loadWorkflow(context, "transaction-maintenance-workflow.js");

  const dependencies = {
    $: () => {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    prettyType() {},
    EventClass: class TestEvent {},
    OptionClass: class TestOption {},
    documentRef: { name: "document" },
  };
  const workflow =
    context.window.PropertyDeskTransactionMaintenanceWorkflow.create(
      dependencies,
    );
  const openPayment = () => {};
  const openExpense = () => {};
  const updatePaymentGuidance = () => {};
  const actions = workflow.createActionHandlers({
    openPayment,
    openExpense,
    updatePaymentGuidance,
  });

  assert.equal(workflow.saveCorrection, saveCorrection);
  assert.equal(passed.corrections.state, dependencies.state);
  assert.equal(passed.maintenance.fetchAll, dependencies.fetchAll);
  assert.equal(passed.voidEntry.saveVoidTransaction, saveVoidTransaction);
  assert.equal(passed.correctionForm.openPayment, openPayment);
  assert.equal(passed.correctionForm.openExpense, openExpense);
  assert.equal(
    passed.correctionForm.updatePaymentGuidance,
    updatePaymentGuidance,
  );
  assert.equal(passed.events.correctTransaction, correctTransaction);
  assert.equal(passed.events.voidTransaction, voidTransaction);
  assert.deepEqual(Object.keys(actions), ["attachEvents"]);
  assert.equal(actions.attachEvents, attachEvents);
});

test("account and deposit coordinator wires entry actions to workspace details", () => {
  const passed = {};
  const saveDepositAdjustment = () => {};
  const recordDepositAdjustment = () => {};
  const attachDepositEvents = () => {};
  const saveCloseAccount = () => {};
  const closeAccount = () => {};
  const attachAccountDetailActionEvents = () => {};
  const elements = new Map();
  const $ = (id) => {
    elements.set(id, { id });
    return elements.get(id);
  };
  const closeModal = (element) => (passed.closedModal = element);
  const context = vm.createContext({
    window: {
      PropertyDeskDepositMaintenance: {
        create: (options) => {
          passed.depositMaintenance = options;
          return { saveDepositAdjustment };
        },
      },
      PropertyDeskDepositAdjustmentEntry: {
        create: (options) => {
          passed.depositEntry = options;
          return { recordDepositAdjustment };
        },
      },
      PropertyDeskDepositDetailEvents: {
        create: (options) => {
          passed.depositEvents = options;
          return { attachEvents: attachDepositEvents };
        },
      },
      PropertyDeskAccountCloseMaintenance: {
        create: (options) => {
          passed.closeMaintenance = options;
          return { saveCloseAccount };
        },
      },
      PropertyDeskAccountCloseEntry: {
        create: (options) => {
          passed.closeEntry = options;
          return { closeAccount };
        },
      },
      PropertyDeskAccountDetailEvents: {
        create: (options) => {
          passed.accountEvents = options;
          return { attachEvents: attachAccountDetailActionEvents };
        },
      },
    },
  });
  loadWorkflow(context, "account-deposit-maintenance-workflow.js");

  const dependencies = {
    $,
    state: {},
    todayIso() {},
    toast() {},
    fetchAll() {},
    closeModal,
    editAccount() {},
    openPayment() {},
    depositSectionHTML() {},
    moneyInput() {},
  };
  const workflow =
    context.window.PropertyDeskAccountDepositMaintenanceWorkflow.create(
      dependencies,
    );

  assert.equal(passed.depositMaintenance.state, dependencies.state);
  assert.equal(
    passed.depositEntry.saveDepositAdjustment,
    saveDepositAdjustment,
  );
  assert.equal(passed.depositEntry.moneyInput, dependencies.moneyInput);
  assert.equal(
    passed.depositEvents.recordDepositAdjustment,
    recordDepositAdjustment,
  );
  assert.equal(passed.closeMaintenance.state, dependencies.state);
  assert.equal(passed.closeEntry.saveCloseAccount, saveCloseAccount);
  assert.equal(passed.accountEvents.closeAccount, closeAccount);
  assert.equal(passed.accountEvents.editAccount, dependencies.editAccount);
  assert.equal(workflow.attachDepositEvents, attachDepositEvents);
  assert.equal(
    workflow.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachAccountDetailActionEvents",
    "attachDepositEvents",
  ]);

  passed.closeMaintenance.closeAccountDetails();
  assert.equal(passed.closedModal, elements.get("detail-modal"));
});
