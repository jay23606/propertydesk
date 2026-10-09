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
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "features",
      "transaction-maintenance-workflow.js",
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /writeFeedback/);
  for (const filename of [
    "transaction-correction-maintenance.js",
    "transaction-void-maintenance.js",
  ]) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(__dirname, "..", "features", filename), "utf8"),
      /window\.PropertyDeskRepositoryWriteFeedback/,
    );
  }
  assert.doesNotMatch(
    source,
    /window\.PropertyDeskTransaction(?:Correction|Void|MaintenanceEvents)[^.]*\.create/,
  );
  const passed = {};
  const saveCorrection = () => {};
  const voidTransaction = () => {};
  const correctTransaction = () => {};
  const attachEvents = () => {};
  const runAndRefreshWorkspaceChange = () => {};
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
      PropertyDeskTransactionMaintenanceEvents: {
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
    promptAction() {},
    EventClass: class MockEvent {},
    OptionClass: class MockOption {},
    repository: {},
    runAndRefreshWorkspaceChange,
    findCorrectionTarget() {},
    unusedContext: true,
    unusedCorrectionValue: true,
  };
  const voidingContext = {
    state: {},
    toast: correctionContext.toast,
    fetchAll: correctionContext.fetchAll,
    timestamp: () => "2026-10-08T12:00:00.000Z",
    confirmAction() {},
    promptAction() {},
    repository: correctionContext.repository,
    runAndRefreshWorkspaceChange,
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
    workflows: {
      correction: context.window.PropertyDeskTransactionCorrectionWorkflow,
      correctionModules: {
        maintenance: {},
        form: {},
      },
      voidMaintenance: context.window.PropertyDeskTransactionVoidMaintenance,
      voidEntry: context.window.PropertyDeskTransactionVoidEntry,
      events: context.window.PropertyDeskTransactionMaintenanceEvents,
    },
  };
  const workflow =
    context.window.PropertyDeskTransactionMaintenanceWorkflow.create(
      dependencies,
    );
  const actions = {
    openPayment() {},
    openExpense() {},
    updatePaymentGuidance() {},
    unusedAction: true,
  };
  const handlers = workflow.createTransactionActionHandlers(actions);

  assert.equal(Object.isFrozen(workflow), true);
  assert.equal(Object.isFrozen(handlers), true);
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
    passed.correctionWorkflow.runAndRefreshWorkspaceChange,
    runAndRefreshWorkspaceChange,
  );
  assert.equal(
    passed.correctionWorkflow.findCorrectionTarget,
    correctionContext.findCorrectionTarget,
  );
  assert.equal(
    passed.correctionWorkflow.workflows,
    dependencies.workflows.correctionModules,
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
    "promptAction",
    "repository",
    "runAndRefreshWorkspaceChange",
    "state",
    "toast",
    "workflows",
  ]);
  assert.equal(passed.voidMaintenance.toast, voidingContext.toast);
  assert.equal(passed.voidMaintenance.state, voidingContext.state);
  assert.equal(passed.voidMaintenance.fetchAll, voidingContext.fetchAll);
  assert.equal(passed.voidMaintenance.timestamp, voidingContext.timestamp);
  assert.equal(
    passed.voidMaintenance.resolveVoidTarget,
    voidingContext.resolveVoidTarget,
  );
  assert.equal(
    passed.voidMaintenance.buildVoidPayload,
    voidingContext.buildVoidPayload,
  );
  assert.equal(passed.voidMaintenance.repository, voidingContext.repository);
  assert.equal(
    passed.voidMaintenance.runAndRefreshWorkspaceChange,
    runAndRefreshWorkspaceChange,
  );
  assert.equal("unusedVoidingValue" in passed.voidMaintenance, false);
  assert.deepEqual(Object.keys(passed.voidMaintenance).sort(), [
    "buildVoidPayload",
    "fetchAll",
    "repository",
    "resolveVoidTarget",
    "runAndRefreshWorkspaceChange",
    "state",
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
    "confirmAction",
    "promptAction",
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
  assert.deepEqual(Object.keys(passed.correctionActions).sort(), [
    "openExpense",
    "openPayment",
    "updatePaymentGuidance",
  ]);
  assert.equal(passed.events.correctTransaction, correctTransaction);
  assert.equal(passed.events.voidTransaction, voidTransaction);
  assert.deepEqual(Object.keys(handlers), ["attachTransactionActionEvents"]);
  assert.equal(handlers.attachTransactionActionEvents, attachEvents);
});
