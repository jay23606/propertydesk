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
  const deposits = { adjustments: {} };
  const content = { accountHistoryRepository: {} };
  const actions = { repository: {} };
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

  assert.equal(passed.deposits, deposits);
  assert.equal(
    passed.accountDetails.content.accountHistoryRepository,
    content.accountHistoryRepository,
  );
  assert.equal(
    passed.accountDetails.content.depositSectionHTML,
    depositSectionHTML,
  );
  assert.equal(passed.accountDetails.actions, actions);
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
