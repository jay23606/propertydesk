const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("account detail workspace joins content rendering and action binding", () => {
  const passed = {};
  const openAccountDetails = () => {};
  const attachAccountDetailActionEvents = () => {};
  const content = { depositSectionHTML() {} };
  const actions = { repository: {} };
  const context = vm.createContext({
    window: {
      PropertyDeskAccountDetailContentWorkflow: {
        create(options) {
          passed.content = options;
          return { openAccountDetails };
        },
      },
      PropertyDeskAccountDetailActionWorkflow: {
        create(options) {
          passed.actions = options;
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
        "account-detail-workspace-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const workflow =
    context.window.PropertyDeskAccountDetailWorkspaceWorkflow.create({
      content,
      actions,
    });

  assert.equal(passed.content, content);
  assert.equal(passed.actions, actions);
  assert.equal(workflow.openAccountDetails, openAccountDetails);
  assert.equal(
    workflow.attachAccountDetailActionEvents,
    attachAccountDetailActionEvents,
  );
  assert.equal(Object.isFrozen(workflow), true);
});
