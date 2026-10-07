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
  const transactionRepository = { voidPosted() {}, correct() {} };
  const resolveVoidTarget = () => ({ table: "pd_payments" });
  const buildVoidPayload = () => ({ status: "voided" });
  const findCorrectionTarget = () => null;
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
    repository: transactionRepository,
    resolveVoidTarget,
    buildVoidPayload,
    findCorrectionTarget,
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
  assert.equal(passed.corrections.repository, transactionRepository);
  assert.equal(passed.maintenance.fetchAll, dependencies.fetchAll);
  assert.equal(passed.maintenance.repository, transactionRepository);
  assert.equal(passed.maintenance.resolveVoidTarget, resolveVoidTarget);
  assert.equal(passed.maintenance.buildVoidPayload, buildVoidPayload);
  assert.equal(passed.voidEntry.resolveVoidTarget, resolveVoidTarget);
  assert.equal(passed.voidEntry.saveVoidTransaction, saveVoidTransaction);
  assert.equal(passed.correctionForm.openPayment, openPayment);
  assert.equal(passed.correctionForm.openExpense, openExpense);
  assert.equal(
    passed.correctionForm.updatePaymentGuidance,
    updatePaymentGuidance,
  );
  assert.equal(
    passed.correctionForm.findCorrectionTarget,
    findCorrectionTarget,
  );
  assert.equal(passed.events.correctTransaction, correctTransaction);
  assert.equal(passed.events.voidTransaction, voidTransaction);
  assert.deepEqual(Object.keys(actions), ["attachEvents"]);
  assert.equal(actions.attachEvents, attachEvents);
});

test("deposit adjustment workflow wires only deposit concerns", () => {
  const passed = {};
  const repository = { insert() {} };
  const prepareAdjustment = () => ({ status: "ready", payload: {} });
  const validateAdjustment = () => ({ status: "ready" });
  const saveDepositAdjustment = () => {};
  const recordDepositAdjustment = () => {};
  const attachDepositEvents = () => {};
  const context = vm.createContext({
    window: {
      PropertyDeskDepositMaintenance: {
        create: (options) => {
          passed.maintenance = options;
          return { saveDepositAdjustment };
        },
      },
      PropertyDeskDepositAdjustmentEntry: {
        create: (options) => {
          passed.entry = options;
          return { recordDepositAdjustment };
        },
      },
      PropertyDeskDepositDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents: attachDepositEvents };
        },
      },
    },
  });
  loadWorkflow(context, "deposit-adjustment-workflow.js");
  const dependencies = {
    $() {},
    state: {},
    todayIso() {},
    toast() {},
    fetchAll() {},
    depositSectionHTML() {},
    moneyInput() {},
    repository,
    prepareAdjustment,
    validateAdjustment,
  };
  const workflow =
    context.window.PropertyDeskDepositAdjustmentWorkflow.create(dependencies);

  assert.equal(passed.maintenance.repository, repository);
  assert.equal(passed.maintenance.prepareAdjustment, prepareAdjustment);
  assert.equal(passed.entry.moneyInput, dependencies.moneyInput);
  assert.equal(passed.entry.validateAdjustment, validateAdjustment);
  assert.equal(passed.events.recordDepositAdjustment, recordDepositAdjustment);
  assert.equal(
    passed.events.depositSectionHTML,
    dependencies.depositSectionHTML,
  );
  assert.equal(workflow.attachDepositEvents, attachDepositEvents);
  assert.deepEqual(Object.keys(workflow), ["attachDepositEvents"]);
});

test("account detail action workflow wires only account close concerns", () => {
  const passed = {};
  const repository = { close() {} };
  const saveCloseAccount = () => {};
  const closeAccount = () => {};
  const attachEvents = () => {};
  const elements = new Map();
  const $ = (id) => {
    elements.set(id, { id });
    return elements.get(id);
  };
  const closeModal = (element) => (passed.closedModal = element);
  const context = vm.createContext({
    window: {
      PropertyDeskAccountCloseMaintenance: {
        create: (options) => {
          passed.maintenance = options;
          return { saveCloseAccount };
        },
      },
      PropertyDeskAccountCloseEntry: {
        create: (options) => {
          passed.entry = options;
          return { closeAccount };
        },
      },
      PropertyDeskAccountDetailEvents: {
        create: (options) => {
          passed.events = options;
          return { attachEvents };
        },
      },
    },
  });
  loadWorkflow(context, "account-detail-action-workflow.js");
  const dependencies = {
    $,
    state: {},
    toast() {},
    fetchAll() {},
    closeModal,
    editAccount() {},
    openPayment() {},
    repository,
  };
  const workflow =
    context.window.PropertyDeskAccountDetailActionWorkflow.create(dependencies);

  assert.equal(passed.maintenance.repository, repository);
  assert.equal(typeof passed.maintenance.closeAccountDetails, "function");
  assert.equal(passed.entry.saveCloseAccount, saveCloseAccount);
  assert.equal(passed.events.closeAccount, closeAccount);
  assert.equal(passed.events.editAccount, dependencies.editAccount);
  assert.equal(workflow.attachAccountDetailActionEvents, attachEvents);
  assert.deepEqual(Object.keys(workflow), ["attachAccountDetailActionEvents"]);
  passed.maintenance.closeAccountDetails();
  assert.equal(passed.closedModal, elements.get("detail-modal"));
});
