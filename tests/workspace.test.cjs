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
          return { attachEvents: attachProfileEvents };
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
  const calls = [];
  const workflow = context.window.PropertyDeskWorkspace.create({
    $: (id) => ({
      set value(value) {
        calls.push([id, value]);
      },
    }),
    state,
    esc() {},
    toast() {},
    fetchAll() {},
    renderReminderActivity() {
      calls.push("render reminders");
    },
  });

  assert.equal(passed.profileDisplay.state, state);
  assert.equal(passed.profileSettings.updateGreeting, updateGreeting);
  assert.equal(workflow.updateGreeting, updateGreeting);
  workflow.renderWorkspaceSettings();
  assert.deepEqual(calls, [["display-name", "Owner"], "render reminders"]);
  workflow.attachEvents();
  assert.equal(
    passed.members.view.renderWorkspaceMembers,
    renderWorkspaceMembers,
  );
  assert.ok(passed.memberView);
  assert.deepEqual(eventCalls, ["profile", "members"]);
});
