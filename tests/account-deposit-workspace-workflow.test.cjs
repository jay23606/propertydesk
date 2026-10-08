const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("account and deposit workspace share deposit details without mixing actions", () => {
  const passed = {};
  const depositSectionHTML = () => "deposit";
  const openAccountDetails = () => {};
  const attachAccountDetailActionEvents = () => {};
  const attachDepositAdjustmentEvents = () => {};
  const deposit = { marker: "deposit" };
  const accountDetails = {
    $: () => {},
    state: {},
    money: () => {},
    fmtDate: () => {},
    esc: () => {},
    sumPosted: () => {},
    prettyType: () => {},
    paymentFrequencyLabel: () => {},
    summarizeAccount: () => {},
    amortizationSchedule: () => {},
    openModal: () => {},
    propertyAddress: () => {},
    accountHistoryRepository: {},
    unusedAccountDetailDependency: true,
  };
  const accountActions = { marker: "account-actions" };
  const context = vm.createContext({
    window: {
      PropertyDeskDepositWorkspaceWorkflow: {
        create(options) {
          passed.deposit = options;
          return { depositSectionHTML, attachDepositAdjustmentEvents };
        },
      },
      PropertyDeskAccountDetailContentWorkflow: {
        create(options) {
          passed.accountDetails = options;
          return { openAccountDetails };
        },
      },
      PropertyDeskAccountDetailActionWorkflow: {
        create(options) {
          passed.accountActions = options;
          return { attachAccountDetailActionEvents };
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

  const workflow =
    context.window.PropertyDeskAccountDepositWorkspaceWorkflow.create({
      deposit,
      accountDetails,
      accountActions,
    });

  assert.equal(passed.deposit, deposit);
  for (const [key, value] of Object.entries(accountDetails)) {
    if (key === "unusedAccountDetailDependency") continue;
    assert.equal(passed.accountDetails[key], value);
  }
  assert.equal(passed.accountDetails.depositSectionHTML, depositSectionHTML);
  assert.equal("unusedAccountDetailDependency" in passed.accountDetails, false);
  assert.deepEqual(Object.keys(passed.accountDetails).sort(), [
    "$",
    "accountHistoryRepository",
    "amortizationSchedule",
    "depositSectionHTML",
    "esc",
    "fmtDate",
    "money",
    "openModal",
    "paymentFrequencyLabel",
    "prettyType",
    "propertyAddress",
    "state",
    "sumPosted",
    "summarizeAccount",
  ]);
  assert.equal(passed.accountActions, accountActions);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachAccountDetailActionEvents",
    "attachDepositAdjustmentEvents",
    "openAccountDetails",
  ]);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
  assert.equal(Object.isFrozen(workflow), true);
  assert.equal(
    workflow.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.equal(
    workflow.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
});
