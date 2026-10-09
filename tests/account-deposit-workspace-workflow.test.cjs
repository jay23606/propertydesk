const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("account and deposit workspace share detail rendering and events", () => {
  const passed = {};
  const depositSectionHTML = () => "deposit";
  const attachDepositAdjustmentEvents = () => {};
  const openAccountDetails = () => {};
  const attachAccountDetailActionEvents = () => {};
  const saveAndRefreshWorkspaceRecord = () => {};
  const depositWorkflows = {
    detailsModel: {},
    detailsView: {},
    adjustmentWorkflow: {},
    adjustmentModules: {
      maintenance: {},
      entry: {},
      events: {},
    },
  };
  const deposits = {
    details: {
      depositLedger: {},
      money() {},
      fmtDate() {},
      esc() {},
      ignored: true,
    },
    adjustments: {
      $() {},
      state: {},
      todayIso() {},
      toast() {},
      fetchAll() {},
      moneyInput() {},
      repository: {},
      prepareAdjustment() {},
      validateAdjustment() {},
      resolveAdjustmentType() {},
      promptAction() {},
      saveAndRefreshWorkspaceRecord,
      ignored: true,
    },
    ignored: true,
  };
  const content = { fmtDateTime() {}, accountHistoryRepository: {} };
  const actions = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    confirmAction() {},
    editAccount() {},
    openPayment() {},
    repository: {},
    saveAndRefreshWorkspaceRecord,
    ignored: true,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskDepositWorkspaceWorkflow: {
        create(options) {
          passed.deposits = options;
          return { depositSectionHTML, attachDepositAdjustmentEvents };
        },
      },
      PropertyDeskAccountDetailWorkspaceWorkflow: {
        create(options) {
          passed.accountDetails = options;
          return { openAccountDetails, attachAccountDetailActionEvents };
        },
      },
      PropertyDeskAccountDetailActionWorkflow: { create() {} },
      PropertyDeskAccountCloseMaintenance: { create() {} },
      PropertyDeskAccountCloseEntry: { create() {} },
      PropertyDeskAccountDetailEvents: { create() {} },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "features",
        "account-deposit-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const workspace =
    context.window.PropertyDeskAccountDepositWorkspaceWorkflow.create({
      depositWorkspaceWorkflow:
        context.window.PropertyDeskDepositWorkspaceWorkflow,
      accountDetailWorkspaceWorkflow:
        context.window.PropertyDeskAccountDetailWorkspaceWorkflow,
      accountDetailContentWorkflow: {
        create() {
          return { openAccountDetails };
        },
      },
      accountDetailActionWorkflow:
        context.window.PropertyDeskAccountDetailActionWorkflow,
      accountDetailActionWorkflows: {
        closeMaintenance: context.window.PropertyDeskAccountCloseMaintenance,
        closeEntry: context.window.PropertyDeskAccountCloseEntry,
        detailEvents: context.window.PropertyDeskAccountDetailEvents,
      },
      depositWorkflows,
      deposits,
      accountDetails: { content, actions },
    });

  assert.deepEqual(Object.keys(passed.deposits.details).sort(), [
    "depositLedger",
    "esc",
    "fmtDate",
    "money",
  ]);
  assert.deepEqual(Object.keys(passed.deposits.adjustments).sort(), [
    "$",
    "fetchAll",
    "moneyInput",
    "prepareAdjustment",
    "promptAction",
    "repository",
    "resolveAdjustmentType",
    "saveAndRefreshWorkspaceRecord",
    "state",
    "toast",
    "todayIso",
    "validateAdjustment",
  ]);
  assert.equal("ignored" in passed.deposits, false);
  assert.deepEqual(Object.keys(passed.deposits.workflows).sort(), [
    "adjustmentModules",
    "adjustmentWorkflow",
    "detailsModel",
    "detailsView",
  ]);
  for (const key of Object.keys(depositWorkflows))
    assert.equal(passed.deposits.workflows[key], depositWorkflows[key]);
  assert.equal(
    passed.accountDetails.content.accountHistoryRepository,
    content.accountHistoryRepository,
  );
  assert.equal(passed.accountDetails.content.fmtDateTime, content.fmtDateTime);
  assert.equal(
    passed.accountDetails.content.depositSectionHTML,
    depositSectionHTML,
  );
  assert.deepEqual(Object.keys(passed.accountDetails.actions).sort(), [
    "$",
    "closeModal",
    "confirmAction",
    "editAccount",
    "fetchAll",
    "openPayment",
    "repository",
    "saveAndRefreshWorkspaceRecord",
    "state",
    "toast",
  ]);
  assert.equal("ignored" in passed.accountDetails.actions, false);
  assert.equal(
    passed.accountDetails.actions.saveAndRefreshWorkspaceRecord,
    saveAndRefreshWorkspaceRecord,
  );
  assert.equal(workspace.openAccountDetails, openAccountDetails);
  assert.equal(
    workspace.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.equal(
    workspace.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
  assert.equal(Object.isFrozen(workspace), true);
});
