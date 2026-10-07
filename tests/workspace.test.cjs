const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("workspace workflow composes profile settings with member settings", () => {
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
          return {
            renderWorkspaceMembers,
          };
        },
      },
      PropertyDeskWorkspaceMemberRepository: {
        create(options) {
          passed.memberRepository = options;
          return { kind: "member-repository" };
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
  const memberRepository = { addMember() {}, removeMember() {} };
  const workflow = context.window.PropertyDeskWorkspace.create({
    $: () => ({ value: "" }),
    state,
    esc() {},
    toast() {},
    fetchAll() {},
    memberRepository,
    renderReminderActivity: () => reminderActivityRenders++,
  });

  assert.equal(passed.profileWorkflow.state, state);
  assert.equal(passed.profileWorkflow.toast instanceof Function, true);
  assert.equal(passed.members.repository, memberRepository);
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
