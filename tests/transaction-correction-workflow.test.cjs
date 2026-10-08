const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("transaction correction workflow owns correction persistence and forms", () => {
  const passed = {};
  const saveCorrection = () => {};
  const correctTransaction = () => {};
  const context = vm.createContext({
    Event: class MockEvent {},
    Option: class MockOption {},
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
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    prettyType() {},
    repository: {},
    writeFeedback: {},
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
  assert.equal(passed.corrections.state, correctionContext.state);
  assert.equal(passed.corrections.repository, correctionContext.repository);
  assert.equal(
    passed.corrections.writeFeedback,
    correctionContext.writeFeedback,
  );
  assert.equal(
    passed.form.findCorrectionTarget,
    correctionContext.findCorrectionTarget,
  );
  assert.equal(passed.form.openPayment, actions.openPayment);
  assert.equal(passed.form.openExpense, actions.openExpense);
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
    "state",
    "toast",
    "updatePaymentGuidance",
  ]);
  assert.equal(handlers.correctTransaction, correctTransaction);
  assert.equal(workflow.saveCorrection, saveCorrection);
});
