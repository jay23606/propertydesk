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

test("transaction maintenance coordinator joins isolated correction and void actions", () => {
  const passed = {};
  const saveCorrection = () => {};
  const voidTransaction = () => {};
  const correctTransaction = () => {};
  const attachEvents = () => {};
  const context = vm.createContext({
    document: {},
    window: {
      PropertyDeskTransactionCorrectionWorkflow: {
        create: (options) => {
          passed.correctionWorkflow = options;
          return {
            saveCorrection,
            createCorrectionActionHandlers: (actionOptions) => {
              passed.correctionActions = actionOptions;
              return { correctTransaction };
            },
          };
        },
      },
      PropertyDeskTransactionVoidMaintenance: {
        create: (options) => {
          passed.voidMaintenance = options;
          passed.saveVoidTransaction = () => {};
          return { saveVoidTransaction: passed.saveVoidTransaction };
        },
      },
      PropertyDeskTransactionVoidEntry: {
        create: (options) => {
          passed.voidEntry = options;
          return { voidTransaction };
        },
      },
      PropertyDeskTransactionViewEvents: {
        create: (options) => {
          passed.events = options;
          return { attachTransactionActionEvents: attachEvents };
        },
      },
    },
  });
  loadWorkflow(context, "transaction-maintenance-workflow.js");

  const correctionContext = {
    $: () => {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    prettyType() {},
    repository: {},
    findCorrectionTarget() {},
    unusedCorrectionValue: true,
  };
  const voidingContext = {
    toast: correctionContext.toast,
    fetchAll: correctionContext.fetchAll,
    repository: correctionContext.repository,
    resolveVoidTarget() {},
    buildVoidPayload() {},
    unusedVoidingValue: true,
  };
  const eventsContext = {
    documentRef: { name: "document" },
    unusedEventValue: true,
  };
  const dependencies = {
    correction: correctionContext,
    voiding: voidingContext,
    events: eventsContext,
  };
  const workflow =
    context.window.PropertyDeskTransactionMaintenanceWorkflow.create(
      dependencies,
    );
  const actions = {
    openPayment() {},
    openExpense() {},
    updatePaymentGuidance() {},
  };
  const handlers = workflow.createTransactionActionHandlers(actions);

  assert.equal(workflow.saveCorrection, saveCorrection);
  assert.equal(passed.correctionWorkflow.$, correctionContext.$);
  assert.equal(passed.correctionWorkflow.state, correctionContext.state);
  assert.equal(passed.correctionWorkflow.toast, correctionContext.toast);
  assert.equal(passed.correctionWorkflow.fetchAll, correctionContext.fetchAll);
  assert.equal(
    passed.correctionWorkflow.closeModal,
    correctionContext.closeModal,
  );
  assert.equal(
    passed.correctionWorkflow.prettyType,
    correctionContext.prettyType,
  );
  assert.equal(
    passed.correctionWorkflow.repository,
    correctionContext.repository,
  );
  assert.equal(
    passed.correctionWorkflow.findCorrectionTarget,
    correctionContext.findCorrectionTarget,
  );
  assert.equal("unusedCorrectionValue" in passed.correctionWorkflow, false);
  assert.deepEqual(Object.keys(passed.correctionWorkflow).sort(), [
    "$",
    "EventClass",
    "OptionClass",
    "closeModal",
    "fetchAll",
    "findCorrectionTarget",
    "prettyType",
    "repository",
    "state",
    "toast",
  ]);
  assert.equal(passed.voidMaintenance.toast, voidingContext.toast);
  assert.equal(passed.voidMaintenance.fetchAll, voidingContext.fetchAll);
  assert.equal(
    passed.voidMaintenance.resolveVoidTarget,
    voidingContext.resolveVoidTarget,
  );
  assert.equal(
    passed.voidMaintenance.buildVoidPayload,
    voidingContext.buildVoidPayload,
  );
  assert.equal(passed.voidMaintenance.repository, voidingContext.repository);
  assert.equal("unusedVoidingValue" in passed.voidMaintenance, false);
  assert.equal("state" in passed.voidMaintenance, false);
  assert.deepEqual(Object.keys(passed.voidMaintenance).sort(), [
    "buildVoidPayload",
    "fetchAll",
    "repository",
    "resolveVoidTarget",
    "timestamp",
    "toast",
  ]);
  assert.equal(passed.voidEntry.toast, voidingContext.toast);
  assert.equal(
    passed.voidEntry.saveVoidTransaction,
    passed.saveVoidTransaction,
  );
  assert.equal(
    passed.voidEntry.resolveVoidTarget,
    voidingContext.resolveVoidTarget,
  );
  assert.deepEqual(Object.keys(passed.voidEntry).sort(), [
    "resolveVoidTarget",
    "saveVoidTransaction",
    "toast",
  ]);
  assert.equal("resolveVoidTarget" in passed.correctionWorkflow, false);
  assert.equal(passed.events.documentRef, eventsContext.documentRef);
  assert.equal(passed.events.correctTransaction, correctTransaction);
  assert.equal(passed.events.voidTransaction, voidTransaction);
  assert.equal("unusedEventValue" in passed.events, false);
  assert.deepEqual(Object.keys(passed.events).sort(), [
    "correctTransaction",
    "documentRef",
    "voidTransaction",
  ]);
  assert.equal(passed.correctionActions.openPayment, actions.openPayment);
  assert.equal(passed.correctionActions.openExpense, actions.openExpense);
  assert.equal(
    passed.correctionActions.updatePaymentGuidance,
    actions.updatePaymentGuidance,
  );
  assert.equal(passed.events.correctTransaction, correctTransaction);
  assert.equal(passed.events.voidTransaction, voidTransaction);
  assert.deepEqual(Object.keys(handlers), ["attachTransactionActionEvents"]);
  assert.equal(handlers.attachTransactionActionEvents, attachEvents);
});

test("transaction correction workflow owns correction persistence and forms", () => {
  const passed = {};
  const saveCorrection = () => {};
  const correctTransaction = () => {};
  const context = vm.createContext({
    Event: class MockEvent {},
    Option: class MockOption {},
    window: {
      PropertyDeskTransactionCorrections: {
        create: (options) => {
          passed.corrections = options;
          return { saveCorrection };
        },
      },
      PropertyDeskTransactionCorrectionForm: {
        create: (options) => {
          passed.form = options;
          return { correctTransaction };
        },
      },
    },
  });
  loadWorkflow(context, "transaction-correction-workflow.js");
  const correctionContext = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    prettyType() {},
    repository: {},
    findCorrectionTarget() {},
  };
  const workflow =
    context.window.PropertyDeskTransactionCorrectionWorkflow.create(
      correctionContext,
    );
  const actions = {
    openPayment() {},
    openExpense() {},
    updatePaymentGuidance() {},
  };
  const handlers = workflow.createCorrectionActionHandlers(actions);

  assert.equal(passed.corrections.state, correctionContext.state);
  assert.equal(passed.corrections.repository, correctionContext.repository);
  assert.equal(
    passed.form.findCorrectionTarget,
    correctionContext.findCorrectionTarget,
  );
  assert.equal(passed.form.openPayment, actions.openPayment);
  assert.equal(passed.form.openExpense, actions.openExpense);
  assert.equal(handlers.correctTransaction, correctTransaction);
  assert.equal(workflow.saveCorrection, saveCorrection);
});

test("deposit adjustment workflow wires only deposit concerns", () => {
  const passed = {};
  const repository = { insert() {} };
  const prepareAdjustment = () => ({ status: "ready", payload: {} });
  const validateAdjustment = () => ({ status: "ready" });
  const saveDepositAdjustment = () => {};
  const recordDepositAdjustment = () => {};
  const attachDepositAdjustmentEvents = () => {};
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
          return { attachDepositAdjustmentEvents };
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
  assert.equal(
    workflow.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
  assert.deepEqual(Object.keys(workflow), ["attachDepositAdjustmentEvents"]);
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
          return { attachAccountDetailActionEvents: attachEvents };
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
