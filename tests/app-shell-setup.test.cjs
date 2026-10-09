const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("app shell setup maps workspace state, services, and navigation", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "features", "app-shell-setup.js"),
    "utf8",
  );
  const context = vm.createContext({ window: {} });
  vm.runInContext(source, context);

  let received;
  const result = { navigate() {} };
  const shell = {
    create(options) {
      received = options;
      return result;
    },
  };
  const records = Object.fromEntries(
    [
      "getAccounts",
      "getProperties",
      "getReminderLogs",
      "getUser",
      "setUser",
      "getWorkspaceMembers",
      "getWorkspaceOwnerId",
      "setView",
    ].map((key) => [key, () => key]),
  );
  records.unusedRecordValue = true;
  const ui = Object.fromEntries(
    [
      "$",
      "now",
      "esc",
      "toast",
      "confirmAction",
      "reminder",
      "documentRef",
      "windowRef",
    ].map((key) => [key, { key }]),
  );
  ui.unusedUiValue = true;
  const services = Object.fromEntries(
    [
      "fetchAll",
      "memberRepository",
      "run",
      "runAndRefreshWorkspaceChange",
      "authClient",
    ].map((key) => [key, { key }]),
  );
  services.authClient = {
    getUser() {},
    updateUser() {},
    signOut() {},
    signInWithPassword() {},
  };
  services.memberRepository = {
    addMember() {},
    removeMember() {},
    unusedOperation() {},
  };
  services.unusedServiceValue = true;
  const workflows = Object.fromEntries(
    ["shell", "workspace", "navigation", "workspaceModules"].map((key) => [
      key,
      key === "shell" ? shell : { key },
    ]),
  );

  assert.equal(
    context.window.PropertyDeskAppShellSetup.create({
      records,
      ui,
      services,
      workflows,
    }),
    result,
  );
  assert.equal(received.workspace.getAccounts, records.getAccounts);
  assert.deepEqual(Object.keys(received.workspace.memberRepository).sort(), [
    "addMember",
    "removeMember",
  ]);
  assert.equal(
    received.workspace.memberRepository.addMember,
    services.memberRepository.addMember,
  );
  assert.equal(
    received.workspace.memberRepository.removeMember,
    services.memberRepository.removeMember,
  );
  assert.equal(received.workspace.getReminderLogs, records.getReminderLogs);
  assert.equal(received.workspace.setUser, records.setUser);
  assert.equal(received.workspace.reminder, ui.reminder);
  assert.equal(received.workspace.run, services.run);
  assert.deepEqual(Object.keys(received.workspace.authClient).sort(), [
    "getUser",
    "updateUser",
  ]);
  assert.equal("signOut" in received.workspace.authClient, false);
  assert.equal("signInWithPassword" in received.workspace.authClient, false);
  assert.equal(
    received.workspace.runAndRefreshWorkspaceChange,
    services.runAndRefreshWorkspaceChange,
  );
  assert.equal(received.navigation.setView, records.setView);
  assert.deepEqual(Object.keys(received.workspace).sort(), [
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
  ]);
  assert.deepEqual(Object.keys(received.navigation).sort(), [
    "$",
    "documentRef",
    "setView",
    "windowRef",
  ]);
  assert.equal(received.workspaceWorkflow, workflows.workspace);
  assert.equal(received.navigationWorkflow, workflows.navigation);
  assert.equal(received.workspaceWorkflows, workflows.workspaceModules);
  assert.doesNotMatch(source, /\bstate\b/);
});
