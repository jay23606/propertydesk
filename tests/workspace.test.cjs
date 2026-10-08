const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace workflow composes profile, member, and reminder settings", () => {
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
      PropertyDeskWorkspaceProfileWorkflow: {
        create(options) {
          passed.profileWorkflow = options;
          return {
            updateGreeting,
            renderProfileSettings: () => (passed.displayName = "Owner"),
            attachProfileEvents,
          };
        },
      },
      PropertyDeskWorkspaceMembersView: {
        create(options) {
          passed.memberView = options;
          return { renderWorkspaceMembers };
        },
      },
      PropertyDeskWorkspaceMembers: {
        create(options) {
          passed.memberActions = options;
          return { attachWorkspaceMemberEvents: attachMemberEvents };
        },
      },
      PropertyDeskWorkspaceReminderWorkflow: {
        create(options) {
          passed.reminderWorkflow = options;
          return {
            renderReminderActivity: () => reminderActivityRenders++,
          };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    context,
  );

  const state = { user: { user_metadata: { display_name: "Owner" } } };
  const memberRepository = { addMember() {}, removeMember() {} };
  const workflow = context.window.PropertyDeskWorkspace.create({
    $: () => ({ value: "" }),
    state,
    esc() {},
    toast() {},
    fetchAll() {},
    memberRepository,
    reminder: { state },
  });

  assert.equal(passed.profileWorkflow.state, state);
  assert.equal(passed.reminderWorkflow.state, state);
  assert.equal(passed.profileWorkflow.toast instanceof Function, true);
  assert.equal(passed.memberActions.repository, memberRepository);
  assert.equal(
    passed.memberActions.view.renderWorkspaceMembers,
    renderWorkspaceMembers,
  );
  assert.equal(
    typeof passed.memberActions.refreshWorkspaceSettings,
    "function",
  );
  assert.equal(workflow.updateGreeting, updateGreeting);
  assert.equal(Object.isFrozen(workflow), true);
  assert.equal("previewReminderEmail" in workflow, false);
  workflow.renderWorkspacePage();
  assert.equal(passed.displayName, "Owner");
  assert.equal(reminderActivityRenders, 1);
  passed.memberActions.refreshWorkspaceSettings();
  assert.equal(reminderActivityRenders, 1);
  workflow.attachProfileEvents();
  workflow.attachWorkspaceMemberEvents();
  assert.equal(passed.memberView.esc instanceof Function, true);
  assert.deepEqual(eventCalls, ["profile", "members"]);
});
