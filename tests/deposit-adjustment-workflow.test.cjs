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

  assert.equal(Object.isFrozen(workflow), true);
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
