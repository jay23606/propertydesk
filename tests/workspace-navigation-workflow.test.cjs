const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace navigation coordinator connects settings render and route events", () => {
  const passed = {};
  const handlers = {
    greeting() {},
    profile() {},
    members() {},
    navigate() {},
    navigationEvents() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspace: {
        create: (options) => {
          passed.workspace = options;
          return {
            updateGreeting: handlers.greeting,
            renderWorkspacePage() {},
            attachProfileEvents: handlers.profile,
            attachWorkspaceMemberEvents: handlers.members,
          };
        },
      },
      PropertyDeskNavigation: {
        create: (options) => {
          passed.navigation = options;
          return {
            navigate: handlers.navigate,
            attachEvents: handlers.navigationEvents,
          };
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
        "workspace-navigation-workflow.js",
      ),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    state: {},
    esc() {},
    toast() {},
    fetchAll() {},
    renderReminderActivity() {},
    memberRepository: {},
    documentRef: {},
    windowRef: {},
  };
  const workflow =
    context.window.PropertyDeskWorkspaceNavigationWorkflow.create(dependencies);

  assert.equal(
    passed.workspace.renderReminderActivity,
    dependencies.renderReminderActivity,
  );
  assert.equal(
    passed.workspace.memberRepository,
    dependencies.memberRepository,
  );
  assert.equal(typeof passed.navigation.renderWorkspacePage, "function");
  assert.equal(passed.navigation.documentRef, dependencies.documentRef);
  assert.equal(passed.navigation.windowRef, dependencies.windowRef);
  assert.deepEqual(Object.keys(workflow), [
    "updateGreeting",
    "attachProfileEvents",
    "attachWorkspaceMemberEvents",
    "navigate",
    "attachNavigationEvents",
  ]);
  assert.equal(workflow.updateGreeting, handlers.greeting);
  assert.equal(workflow.attachProfileEvents, handlers.profile);
  assert.equal(workflow.attachWorkspaceMemberEvents, handlers.members);
  assert.equal(workflow.navigate, handlers.navigate);
  assert.equal(workflow.attachNavigationEvents, handlers.navigationEvents);
});
