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

test("account detail action workflow wires only account close concerns", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "account-detail-action-workflow.js"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /window\.PropertyDeskAccount(?:Close|DetailEvents)[^.]*\.create/,
  );
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
  const saveAndRefreshWorkspaceRecord = () => {};
  const confirmAction = () => true;
  const getAccount = () => null;
  const getCollection = () => [];
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
    getAccount,
    getCollection,
    toast() {},
    fetchAll() {},
    closeModal,
    editAccount() {},
    openPayment() {},
    repository,
    saveAndRefreshWorkspaceRecord,
    confirmAction,
    workflows: {
      closeMaintenance: context.window.PropertyDeskAccountCloseMaintenance,
      closeEntry: context.window.PropertyDeskAccountCloseEntry,
      detailEvents: context.window.PropertyDeskAccountDetailEvents,
    },
  };
  const workflow =
    context.window.PropertyDeskAccountDetailActionWorkflow.create(dependencies);

  assert.equal(Object.isFrozen(workflow), true);
  assert.equal(passed.maintenance.getCollection, getCollection);
  assert.equal(
    dependencies.workflows.closeMaintenance,
    context.window.PropertyDeskAccountCloseMaintenance,
  );
  assert.equal(passed.maintenance.repository, repository);
  assert.equal(
    passed.maintenance.saveAndRefreshWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
  );
  assert.equal(typeof passed.maintenance.closeAccountDetails, "function");
  assert.equal(passed.entry.saveCloseAccount, saveCloseAccount);
  assert.equal(passed.entry.confirmAction, confirmAction);
  assert.equal(passed.events.closeAccount, closeAccount);
  assert.equal(passed.events.editAccount, dependencies.editAccount);
  assert.equal(passed.events.getAccount, getAccount);
  assert.equal(workflow.attachAccountDetailActionEvents, attachEvents);
  assert.deepEqual(Object.keys(workflow), ["attachAccountDetailActionEvents"]);
  passed.maintenance.closeAccountDetails();
  assert.equal(passed.closedModal, elements.get("detail-modal"));
});
