const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app shell composes workspace settings and navigation explicitly", () => {
  const root = path.join(__dirname, "..");
  const passed = {};
  const workspaceActions = {
    updateGreeting() {},
    renderWorkspacePage() {},
    attachProfileEvents() {},
    attachWorkspaceMemberEvents() {},
  };
  const navigationActions = {
    navigate() {},
    attachEvents() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskWorkspace: {
        create(options) {
          passed.workspace = options;
          return workspaceActions;
        },
      },
      PropertyDeskNavigation: {
        create(options) {
          passed.navigation = options;
          return navigationActions;
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(
      path.join(root, "features", "app-shell-workflow.js"),
      "utf8",
    ),
    context,
  );

  const workspace = {
    $: () => {},
    state: {},
    esc: () => {},
    toast: () => {},
    fetchAll: () => {},
    reminder: { state: {} },
    memberRepository: {},
    authClient: {},
    confirmAction: () => true,
    unusedWorkspaceValue: true,
  };
  const navigationSelector = () => {};
  const navigation = {
    $: navigationSelector,
    state: workspace.state,
    documentRef: {},
    windowRef: {},
    unusedNavigationValue: true,
  };
  const appShell = context.window.PropertyDeskAppShellWorkflow.create({
    workspace,
    navigation,
  });

  assert.deepEqual(Object.keys(passed.workspace).sort(), [
    "$",
    "authClient",
    "confirmAction",
    "esc",
    "fetchAll",
    "memberRepository",
    "reminder",
    "state",
    "toast",
  ]);
  assert.equal("unusedWorkspaceValue" in passed.workspace, false);
  for (const key of Object.keys(passed.workspace))
    assert.equal(passed.workspace[key], workspace[key]);
  assert.deepEqual(Object.keys(passed.navigation).sort(), [
    "$",
    "documentRef",
    "renderWorkspacePage",
    "state",
    "windowRef",
  ]);
  assert.equal("unusedNavigationValue" in passed.navigation, false);
  assert.equal(passed.navigation.$, navigationSelector);
  assert.equal(passed.navigation.state, navigation.state);
  assert.equal(passed.navigation.documentRef, navigation.documentRef);
  assert.equal(passed.navigation.windowRef, navigation.windowRef);
  assert.equal(
    passed.navigation.renderWorkspacePage,
    workspaceActions.renderWorkspacePage,
  );
  assert.deepEqual(Object.keys(appShell).sort(), [
    "attachNavigationEvents",
    "attachProfileEvents",
    "attachWorkspaceMemberEvents",
    "navigate",
    "updateGreeting",
  ]);
  assert.equal(appShell.updateGreeting, workspaceActions.updateGreeting);
  assert.equal(
    appShell.attachProfileEvents,
    workspaceActions.attachProfileEvents,
  );
  assert.equal(
    appShell.attachWorkspaceMemberEvents,
    workspaceActions.attachWorkspaceMemberEvents,
  );
  assert.equal(appShell.navigate, navigationActions.navigate);
  assert.equal(appShell.attachNavigationEvents, navigationActions.attachEvents);
  assert.equal(Object.isFrozen(appShell), true);
});
