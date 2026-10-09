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
      PropertyDeskPropertyStatusMaintenance: {},
      PropertyDeskPropertyRecordUpdateMaintenance: {},
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

  const state = {
    client: { id: "workspace-client" },
    selectedPropertyId: "property-1",
    workspaceOwnerId: "workspace-1",
    properties: [{ id: "property-1", archived_at: null }],
  };
  const openPropertyDetails = () => {};
  const openPayment = () => {};
  const openExpense = () => {};
  const openAccountForProperty = () => {};
  const saveAndRefreshWorkspaceRecord = () => {};
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
    saveAndRefreshWorkspaceRecord,
    workflows: {
      archive: context.window.PropertyDeskPropertyArchive,
      statusMaintenance: context.window.PropertyDeskPropertyStatusMaintenance,
      recordUpdateMaintenance:
        context.window.PropertyDeskPropertyRecordUpdateMaintenance,
      detailEvents: context.window.PropertyDeskPropertyDetailEvents,
      quickActions: context.window.PropertyDeskPropertyDetailQuickActions,
    },
    unusedDependency: true,
  };
  const workflow =
    context.window.PropertyDeskPropertyDetailManagementWorkflow.create(
      dependencies,
    );

  assert.equal(passed.archive.openPropertyDetails, openPropertyDetails);
  assert.equal(passed.archive.getSelectedPropertyId(), "property-1");
  assert.equal(passed.archive.getProperty("property-1"), state.properties[0]);
  assert.equal(passed.archive.getWorkspaceOwnerId(), "workspace-1");
  assert.equal(passed.archive.getCollection("properties"), state.properties);
  assert.equal("state" in passed.archive, false);
  assert.equal(passed.archive.repository, propertyRepository);
  assert.equal(
    passed.archive.saveAndRefreshWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
  );
  assert.equal(
    passed.archive.statusMaintenance,
    dependencies.workflows.statusMaintenance,
  );
  assert.equal(
    passed.archive.recordUpdateMaintenance,
    dependencies.workflows.recordUpdateMaintenance,
  );
  assert.equal("unusedDependency" in passed.archive, false);
  assert.equal("unusedDependency" in passed.detail, false);
  assert.equal("unusedDependency" in passed.quick, false);
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
