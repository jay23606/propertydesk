const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace shell connects reminder activity to workspace navigation", () => {
  const calls = [];
  const renderReminderActivity = () => "activity";
  const previewReminderEmail = () => "preview";
  const reminder = { state: {} };
  const navigation = {
    memberRepository: {},
    documentRef: {},
    windowRef: {},
    unusedDependency: true,
  };
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspaceReminderWorkflow: {
        create(options) {
          calls.push(["reminder", options]);
          return { renderReminderActivity, previewReminderEmail };
        },
      },
      PropertyDeskWorkspaceNavigationWorkflow: {
        create(options) {
          calls.push(["navigation", options]);
          return {
            updateGreeting() {},
            attachProfileEvents() {},
            attachWorkspaceMemberEvents() {},
            navigate() {},
            attachNavigationEvents() {},
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-shell-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workflow = context.window.PropertyDeskWorkspaceShellWorkflow.create({
    reminder,
    navigation,
  });

  assert.equal(calls[0][0], "reminder");
  assert.equal(calls[0][1], reminder);
  assert.equal(calls[1][0], "navigation");
  assert.equal(calls[1][1].documentRef, navigation.documentRef);
  assert.equal(calls[1][1].windowRef, navigation.windowRef);
  assert.equal(calls[1][1].memberRepository, navigation.memberRepository);
  assert.equal("unusedDependency" in calls[1][1], false);
  assert.equal(calls[1][1].renderReminderActivity, renderReminderActivity);
  assert.equal(workflow.previewReminderEmail, previewReminderEmail);
  assert.equal("renderReminderActivity" in workflow, false);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachNavigationEvents",
    "attachProfileEvents",
    "attachWorkspaceMemberEvents",
    "navigate",
    "previewReminderEmail",
    "updateGreeting",
  ]);
});
