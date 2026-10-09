const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction correction workflow owns correction persistence and forms", () => {
  for (const filename of [
    "transaction-correction-workflow.js",
    "transaction-correction-form.js",
    "transaction-correction-view.js",
  ]) {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "features", filename),
      "utf8",
    );
    assert.doesNotMatch(source, /(?:EventClass = Event|OptionClass = Option)/);
  }
  const passed = {};
  const saveCorrection = () => {};
  const correctTransaction = () => {};
  const context = vm.createContext({
    window: {},
    correctionModules: {
      maintenance: {
        create: (options) => {
          passed.corrections = options;
          return { saveCorrection };
        },
      },
      form: {
        create: (options) => {
          passed.form = options;
          return { correctTransaction };
        },
      },
      view: { create() {} },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-correction-workflow.js",
      ),
      "utf8",
    ),
    context,
  );
  const correctionContext = {
    $() {},
    getPendingCorrection() {},
    setPendingCorrection() {},
    getPayments() {},
    getExpenses() {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    prettyType() {},
    promptAction() {},
    EventClass: class MockEvent {},
    OptionClass: class MockOption {},
    repository: {},
    runAndRefreshWorkspaceChange() {},
    findCorrectionTarget() {},
    workflows: context.correctionModules,
  };
  const workflow =
    context.window.PropertyDeskTransactionCorrectionWorkflow.create(
      correctionContext,
    );
  assert.doesNotMatch(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "transaction-correction-workflow.js",
      ),
      "utf8",
    ),
    /window\.PropertyDeskTransactionCorrection(?:Maintenance|Form)\.create/,
  );
  const actions = {
    openPayment() {},
    openExpense() {},
    updatePaymentGuidance() {},
    unusedAction: true,
  };
  const handlers = workflow.createCorrectionActionHandlers(actions);

  assert.equal(Object.isFrozen(workflow), true);
  assert.equal(
    passed.corrections.getPendingCorrection,
    correctionContext.getPendingCorrection,
  );
  assert.equal(passed.corrections.getPayments, correctionContext.getPayments);
  assert.equal(passed.corrections.getExpenses, correctionContext.getExpenses);
  assert.equal(passed.corrections.repository, correctionContext.repository);
  assert.equal(
    passed.corrections.runAndRefreshWorkspaceChange,
    correctionContext.runAndRefreshWorkspaceChange,
  );
  assert.equal(
    passed.form.setPendingCorrection,
    correctionContext.setPendingCorrection,
  );
  assert.equal(passed.form.EventClass, correctionContext.EventClass);
  assert.equal(passed.form.OptionClass, correctionContext.OptionClass);
  assert.equal(passed.form.openPayment, actions.openPayment);
  assert.equal(passed.form.openExpense, actions.openExpense);
  assert.equal(passed.form.viewModule, context.correctionModules.view);
  assert.equal("unusedContext" in passed.form, false);
  assert.equal("unusedAction" in passed.form, false);
  assert.deepEqual(Object.keys(passed.form).sort(), [
    "$",
    "EventClass",
    "OptionClass",
    "findCorrectionTarget",
    "openExpense",
    "openPayment",
    "prettyType",
    "promptAction",
    "setPendingCorrection",
    "toast",
    "updatePaymentGuidance",
    "viewModule",
  ]);
  assert.equal(handlers.correctTransaction, correctTransaction);
  assert.equal(workflow.saveCorrection, saveCorrection);
});
