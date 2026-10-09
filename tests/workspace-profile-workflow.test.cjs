const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace profile workflow joins display, editing, and settings rendering", () => {
  const passed = {};
  const updateGreeting = () => {};
  const saveProfile = () => {};
  const now = () => new Date("2026-10-08T12:00:00.000Z");
  const state = { user: { user_metadata: { display_name: "Workspace" } } };
  const authClient = {
    getUser() {},
    updateUser() {},
    signOut() {},
    signInWithPassword() {},
  };
  const context = vm.createContext({
    window: {
      PropertyDeskProfileDisplay: {
        create(options) {
          passed.display = options;
          return { updateGreeting };
        },
      },
      PropertyDeskProfileSettingsView: {
        create(options) {
          passed.view = options;
          return {
            setDisplayName(value) {
              passed.displayName = value;
            },
            attachEvents(handler) {
              passed.saveProfile = handler;
            },
          };
        },
      },
      PropertyDeskProfileSettings: {
        create(options) {
          passed.settings = options;
          return { saveProfile };
        },
      },
    },
  });

  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "features", "workspace-profile-workflow.js"),
      "utf8",
    ),
    context,
  );

  const dependencies = {
    $() {},
    getUser: () => state.user,
    setUser: (user) => {
      state.user = user;
    },
    now,
    authClient,
    toast() {},
    run() {},
    workflows: {
      display: context.window.PropertyDeskProfileDisplay,
      view: context.window.PropertyDeskProfileSettingsView,
      settings: context.window.PropertyDeskProfileSettings,
    },
  };
  const workflow =
    context.window.PropertyDeskWorkspaceProfileWorkflow.create(dependencies);
  const workflowSource = fs.readFileSync(
    path.join(__dirname, "..", "features", "workspace-profile-workflow.js"),
    "utf8",
  );
  assert.doesNotMatch(
    workflowSource,
    /window\.PropertyDesk(?:ProfileDisplay|ProfileSettingsView|ProfileSettings)\.create/,
  );
  assert.doesNotMatch(workflowSource, /writeFeedback/);

  assert.equal(passed.display.getUser(), state.user);
  assert.equal(passed.display.now, now);
  assert.deepEqual(Object.keys(passed.settings.authClient).sort(), [
    "getUser",
    "updateUser",
  ]);
  assert.equal(passed.settings.authClient.getUser, authClient.getUser);
  assert.equal(passed.settings.authClient.updateUser, authClient.updateUser);
  assert.equal("signOut" in passed.settings.authClient, false);
  assert.equal("signInWithPassword" in passed.settings.authClient, false);
  assert.equal(passed.settings.getUser(), state.user);
  assert.equal(typeof passed.settings.setUser, "function");
  assert.equal(passed.settings.run, dependencies.run);
  assert.equal(passed.settings.updateGreeting, updateGreeting);
  assert.equal(workflow.updateGreeting, updateGreeting);
  assert.equal(Object.isFrozen(workflow), true);
  workflow.renderProfileSettings();
  assert.equal(passed.displayName, "Workspace");
  workflow.attachProfileEvents();
  assert.equal(passed.saveProfile, saveProfile);
  assert.deepEqual(Object.keys(workflow).sort(), [
    "attachProfileEvents",
    "renderProfileSettings",
    "updateGreeting",
  ]);
});
