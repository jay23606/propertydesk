const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app shell forwards scoped workspace settings and navigation", () => {
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
    getAccounts: () => [],
    getProperties: () => [],
    getReminderLogs: () => [],
    getUser: () => null,
    setUser() {},
    getWorkspaceMembers: () => [],
    getWorkspaceOwnerId: () => null,
    now: () => new Date("2026-10-08T12:00:00.000Z"),
    esc: () => {},
    toast: () => {},
    fetchAll: () => {},
    reminder: {},
    memberRepository: {},
    run: () => {},
    runAndRefreshWorkspaceChange: () => {},
    authClient: {},
    confirmAction: () => true,
    unusedWorkspaceValue: true,
  };
  const navigationSelector = () => {};
  const workspaceWorkflows = {};
  const navigation = {
    $: navigationSelector,
    setView() {},
    documentRef: {},
    windowRef: {},
    unusedNavigationValue: true,
  };
  const appShell = context.window.PropertyDeskAppShellWorkflow.create({
    workspace,
    navigation,
    workspaceWorkflows,
    workspaceWorkflow: context.window.PropertyDeskWorkspace,
    navigationWorkflow: context.window.PropertyDeskNavigation,
  });

  assert.deepEqual(Object.keys(passed.workspace).sort(), [
    "$",
    "authClient",
    "confirmAction",
    "esc",
    "fetchAll",
    "getAccounts",
    "getProperties",
    "getReminderLogs",
    "getUser",
    "getWorkspaceMembers",
    "getWorkspaceOwnerId",
    "memberRepository",
    "now",
    "reminder",
    "run",
    "runAndRefreshWorkspaceChange",
    "setUser",
    "toast",
    "workflows",
  ]);
  assert.equal(Object.hasOwn(passed.workspace, "unusedWorkspaceValue"), false);
  assert.equal(passed.workspace.workflows, workspaceWorkflows);
  for (const key of Object.keys(passed.workspace)) {
    if (key === "workflows") continue;
    assert.equal(passed.workspace[key], workspace[key]);
  }
  assert.deepEqual(Object.keys(passed.navigation).sort(), [
    "$",
    "documentRef",
    "renderWorkspacePage",
    "setView",
    "windowRef",
  ]);
  assert.equal(
    Object.hasOwn(passed.navigation, "unusedNavigationValue"),
    false,
  );
  assert.equal(
    Object.hasOwn(passed.navigation, "unusedNavigationValue"),
    false,
  );
  assert.equal(passed.navigation.$, navigationSelector);
  assert.equal(passed.navigation.setView, navigation.setView);
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
