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
  const deposits = {
    details: {
      state: {},
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
      ignored: true,
    },
    ignored: true,
  };
  const content = { accountHistoryRepository: {} };
  const actions = {
    $() {},
    state: {},
    toast() {},
    fetchAll() {},
    closeModal() {},
    editAccount() {},
    openPayment() {},
    repository: {},
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
      deposits,
      accountDetails: { content, actions },
    });

  assert.deepEqual(Object.keys(passed.deposits.details).sort(), [
    "depositLedger",
    "esc",
    "fmtDate",
    "money",
    "state",
  ]);
  assert.deepEqual(Object.keys(passed.deposits.adjustments).sort(), [
    "$",
    "fetchAll",
    "moneyInput",
    "prepareAdjustment",
    "repository",
    "resolveAdjustmentType",
    "state",
    "toast",
    "todayIso",
    "validateAdjustment",
  ]);
  assert.equal("ignored" in passed.deposits, false);
  assert.equal(
    passed.accountDetails.content.accountHistoryRepository,
    content.accountHistoryRepository,
  );
  assert.equal(
    passed.accountDetails.content.depositSectionHTML,
    depositSectionHTML,
  );
  assert.deepEqual(Object.keys(passed.accountDetails.actions).sort(), [
    "$",
    "closeModal",
    "editAccount",
    "fetchAll",
    "openPayment",
    "repository",
    "state",
    "toast",
  ]);
  assert.equal("ignored" in passed.accountDetails.actions, false);
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
