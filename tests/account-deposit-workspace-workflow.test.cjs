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
  const accountDetails = { marker: "account-details" };
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
  assert.equal(passed.accountDetails.marker, "account-details");
  assert.equal(passed.accountDetails.depositSectionHTML, depositSectionHTML);
  assert.deepEqual(Object.keys(passed.accountDetails).sort(), [
    "depositSectionHTML",
    "marker",
  ]);
  assert.equal(passed.accountActions, accountActions);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachAccountDetailActionEvents",
    "attachDepositAdjustmentEvents",
    "openAccountDetails",
  ]);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
  assert.equal(
    workflow.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.equal(
    workflow.attachDepositAdjustmentEvents,
    attachDepositAdjustmentEvents,
  );
});
