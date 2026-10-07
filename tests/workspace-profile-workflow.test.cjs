const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace profile workflow joins display, editing, and settings rendering", () => {
  const passed = {};
  const updateGreeting = () => {};
  const saveProfile = () => {};
  const state = { user: { user_metadata: { display_name: "Workspace" } } };
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
    state,
    authClient: {},
    toast() {},
  };
  const workflow =
    context.window.PropertyDeskWorkspaceProfileWorkflow.create(dependencies);

  assert.equal(passed.display.state, state);
  assert.equal(passed.settings.authClient, dependencies.authClient);
  assert.equal(passed.settings.updateGreeting, updateGreeting);
  assert.equal(workflow.updateGreeting, updateGreeting);
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
