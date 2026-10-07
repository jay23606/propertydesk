const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace workflow owns profile display alongside profile settings", () => {
  const root = path.join(__dirname, "..");
  const passed = {};
  const updateGreeting = () => {};
  const renderWorkspaceMembers = () => {};
  let reminderActivityRenders = 0;
  const eventCalls = [];
  const attachProfileEvents = () => eventCalls.push("profile");
  const attachMemberEvents = () => eventCalls.push("members");
  const context = vm.createContext({
    window: {
      PropertyDeskProfileDisplay: {
        create(options) {
          passed.profileDisplay = options;
          return { updateGreeting };
        },
      },
      PropertyDeskProfileSettings: {
        create(options) {
          passed.profileSettings = options;
          return { saveProfile: () => {} };
        },
      },
      PropertyDeskProfileSettingsView: {
        create(options) {
          passed.profileSettingsView = options;
          return {
            setDisplayName: (value) => (passed.displayName = value),
            attachEvents: () => attachProfileEvents(),
          };
        },
      },
      PropertyDeskWorkspaceMembersView: {
        create(options) {
          passed.memberView = options;
          return {
            renderWorkspaceMembers,
          };
        },
      },
      PropertyDeskWorkspaceMembers: {
        create(options) {
          passed.members = options;
          return { attachEvents: attachMemberEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    context,
  );

  const state = { user: { user_metadata: { display_name: "Owner" } } };
  const workflow = context.window.PropertyDeskWorkspace.create({
    $: () => ({ value: "" }),
    state,
    esc() {},
    toast() {},
    fetchAll() {},
    renderReminderActivity: () => reminderActivityRenders++,
  });

  assert.equal(passed.profileDisplay.state, state);
  assert.equal(passed.profileSettings.updateGreeting, updateGreeting);
  assert.equal(passed.profileSettings.state, state);
  assert.equal(typeof passed.profileSettingsView.$, "function");
  assert.equal(workflow.updateGreeting, updateGreeting);
  workflow.renderWorkspaceSettings();
  assert.equal(passed.displayName, "Owner");
  assert.equal(reminderActivityRenders, 1);
  passed.members.refreshWorkspaceSettings();
  assert.equal(reminderActivityRenders, 1);
  workflow.attachProfileEvents();
  workflow.attachWorkspaceMemberEvents();
  assert.equal(
    passed.members.view.renderWorkspaceMembers,
    renderWorkspaceMembers,
  );
  assert.ok(passed.memberView);
  assert.deepEqual(eventCalls, ["profile", "members"]);
});
