const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("property detail coordinator connects archive and quick actions", () => {
  const passed = {};
  const binders = {
    detail: () => {},
    quick: () => {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskPropertyArchive: {
        create: (options) => {
          passed.archive = options;
          return { toggleArchiveProperty() {} };
        },
      },
      PropertyDeskPropertyDetailEvents: {
        create: (options) => {
          passed.detail = options;
          return { attachEvents: binders.detail };
        },
      },
      PropertyDeskPropertyDetailQuickActions: {
        create: (options) => {
          passed.quick = options;
          return { attachEvents: binders.quick };
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
        "property-detail-management-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const state = { client: { id: "workspace-client" } };
  const openPropertyDetails = () => {};
  const openPayment = () => {};
  const openExpense = () => {};
  const openAccountForProperty = () => {};
  const propertyRepository = { updateOwned() {} };
  const dependencies = {
    $() {},
    state,
    toast() {},
    fetchAll() {},
    todayIso() {},
    openPropertyDetails,
    closeModal() {},
    editAccount() {},
    openAccountDetails() {},
    openPayment,
    openExpense,
    openAccountForProperty,
    propertyRepository,
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailManagementWorkflow.create(
      dependencies,
    );

  assert.equal(passed.archive.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.archive.repository, propertyRepository);
  assert.equal(passed.quick.openPayment, openPayment);
  assert.equal(passed.quick.openExpense, openExpense);
  assert.equal(passed.quick.openAccountForProperty, openAccountForProperty);
  assert.deepEqual(Object.keys(workflow), [
    "attachPropertyDetailEvents",
    "attachPropertyQuickActionEvents",
  ]);
  assert.equal(workflow.attachPropertyDetailEvents, binders.detail);
  assert.equal(workflow.attachPropertyQuickActionEvents, binders.quick);
});
