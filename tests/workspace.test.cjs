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
      PropertyDeskWorkspaceReminderWorkflow: {
        create(options) {
          passed.reminderWorkflow = options;
          return {
            renderReminderActivity: () => reminderActivityRenders++,
          };
        },
      },
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
      PropertyDeskWorkspaceMemberMaintenance: {
        create(options) {
          passed.memberMaintenance = options;
          return { addWorkspaceMember() {}, removeWorkspaceMember() {} };
        },
      },
      PropertyDeskWorkspaceMembers: {
        create(options) {
          passed.memberActions = options;
          return { attachWorkspaceMemberEvents: attachMemberEvents };
        },
      },
    },
  });
  vm.runInContext(
    fs.readFileSync(path.join(root, "features", "workspace.js"), "utf8"),
    context,
  );

  const state = { user: { user_metadata: { display_name: "Owner" } } };
  const now = () => new Date("2026-10-08T12:00:00.000Z");
  const memberRepository = { addMember() {}, removeMember() {} };
  const confirmAction = () => true;
  const writeFeedback = {};
  const reminder = {
    $() {},
    state,
    esc() {},
    fmtDate() {},
    fmtDateTime() {},
    money() {},
    workflow: context.window.PropertyDeskWorkspaceReminderWorkflow,
    activityModelWorkflow: {},
    activityViewWorkflow: {},
    unusedDependency: true,
  };
  const workflow = context.window.PropertyDeskWorkspace.create({
    $: () => ({ value: "" }),
    state,
    now,
    esc() {},
    toast() {},
    fetchAll() {},
    memberRepository,
    writeFeedback,
    confirmAction,
    reminder,
    workflows: {
      profile: context.window.PropertyDeskWorkspaceProfileWorkflow,
      memberView: context.window.PropertyDeskWorkspaceMembersView,
      memberMaintenance: context.window.PropertyDeskWorkspaceMemberMaintenance,
      members: context.window.PropertyDeskWorkspaceMembers,
      profileModules: {},
    },
  });
  const workspaceSource = fs.readFileSync(
    path.join(root, "features", "workspace.js"),
    "utf8",
  );
  assert.doesNotMatch(
    workspaceSource,
    /window\.PropertyDeskWorkspace(?:ProfileWorkflow|MembersView|Members|MemberMaintenance)\.create/,
  );
  assert.doesNotMatch(workspaceSource, /window\.confirm/);

  assert.equal(passed.profileWorkflow.state, state);
  assert.equal(passed.profileWorkflow.now, now);
  assert.equal(passed.profileWorkflow.writeFeedback, writeFeedback);
  assert.equal(passed.memberActions.writeFeedback, writeFeedback);
  assert.equal(passed.memberActions.confirmAction, confirmAction);
  assert.equal(passed.reminderWorkflow.state, state);
  assert.deepEqual(Object.keys(passed.reminderWorkflow).sort(), [
    "$",
    "activityModelWorkflow",
    "activityViewWorkflow",
    "esc",
    "fmtDate",
    "fmtDateTime",
    "money",
    "state",
  ]);
  for (const key of Object.keys(passed.reminderWorkflow))
    assert.equal(passed.reminderWorkflow[key], reminder[key]);
  assert.equal(passed.profileWorkflow.toast instanceof Function, true);
  assert.equal(passed.memberActions.repository, memberRepository);
  assert.equal(
    passed.memberActions.maintenanceWorkflow,
    context.window.PropertyDeskWorkspaceMemberMaintenance,
  );
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
